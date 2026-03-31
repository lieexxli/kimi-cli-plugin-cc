#!/usr/bin/env node

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { parseArgs, splitRawArgumentString } from "./lib/args.mjs";
import { readStdinIfPiped } from "./lib/fs.mjs";
import { collectReviewContext, ensureGitRepository, resolveReviewTarget } from "./lib/git.mjs";
import { getKimiAvailability, runKimiTask, runKimiQuiet } from "./lib/kimi.mjs";
import { terminateProcessTree } from "./lib/process.mjs";
import { loadPromptTemplate, interpolateTemplate } from "./lib/prompts.mjs";
import {
  generateJobId,
  upsertJob,
  writeJobFile
} from "./lib/state.mjs";
import {
  buildSingleJobSnapshot,
  buildStatusSnapshot,
  readStoredJob,
  resolveCancelableJob,
  resolveResultJob
} from "./lib/job-control.mjs";
import {
  appendLogLine,
  createJobLogFile,
  createJobProgressUpdater,
  createJobRecord,
  createProgressReporter,
  nowIso,
  runTrackedJob,
  SESSION_ID_ENV
} from "./lib/tracked-jobs.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import {
  renderStoredJobResult,
  renderCancelReport,
  renderJobStatusReport,
  renderSetupReport,
  renderStatusReport,
  renderTaskResult,
  renderReviewResult
} from "./lib/render.mjs";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const DEFAULT_STATUS_WAIT_TIMEOUT_MS = 240000;
const DEFAULT_STATUS_POLL_INTERVAL_MS = 2000;

function printUsage() {
  console.log(
    [
      "Usage:",
      "  node scripts/kimi-companion.mjs setup [--json]",
      "  node scripts/kimi-companion.mjs task [--background] [--write] [--model <model>] [--thinking|--no-thinking] [--max-steps <n>] [--continue] [--session <id>] [prompt]",
      "  node scripts/kimi-companion.mjs task-worker --job-id <id>",
      "  node scripts/kimi-companion.mjs review [--wait|--background] [--base <ref>] [--scope <auto|working-tree|branch>]",
      "  node scripts/kimi-companion.mjs status [job-id] [--all] [--json]",
      "  node scripts/kimi-companion.mjs result [job-id] [--json]",
      "  node scripts/kimi-companion.mjs cancel [job-id] [--json]"
    ].join("\n")
  );
}

function outputResult(value, asJson) {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    process.stdout.write(value);
  }
}

function outputCommandResult(payload, rendered, asJson) {
  outputResult(asJson ? payload : rendered, asJson);
}

function normalizeArgv(argv) {
  if (argv.length === 1) {
    const [raw] = argv;
    if (!raw || !raw.trim()) {
      return [];
    }
    return splitRawArgumentString(raw);
  }
  return argv;
}

function parseCommandInput(argv, config = {}) {
  return parseArgs(normalizeArgv(argv), {
    ...config,
    aliasMap: {
      C: "cwd",
      ...(config.aliasMap ?? {})
    }
  });
}

function resolveCommandCwd(options = {}) {
  return options.cwd ? path.resolve(process.cwd(), options.cwd) : process.cwd();
}

function resolveCommandWorkspace(options = {}) {
  return resolveWorkspaceRoot(resolveCommandCwd(options));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shorten(text, limit = 96) {
  const normalized = String(text ?? "").trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  if (normalized.length <= limit) {
    return normalized;
  }
  return `${normalized.slice(0, limit - 3)}...`;
}

function firstMeaningfulLine(text, fallback) {
  const line = String(text ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find(Boolean);
  return line ?? fallback;
}

// ─── setup ───

function buildSetupReport(cwd, actionsTaken = []) {
  const kimiStatus = getKimiAvailability(cwd);

  const nextSteps = [];
  if (!kimiStatus.available) {
    nextSteps.push("Install Kimi CLI: `npm install -g @anthropic/kimi-cli` or download from https://github.com/anthropics/kimi-cli.");
    nextSteps.push("After installation, run `!kimi login` to authenticate.");
  }

  return {
    ready: kimiStatus.available,
    kimi: kimiStatus,
    actionsTaken,
    nextSteps
  };
}

function handleSetup(argv) {
  const { options } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"]
  });

  const cwd = resolveCommandCwd(options);
  const finalReport = buildSetupReport(cwd);
  outputResult(options.json ? finalReport : renderSetupReport(finalReport), options.json);
}

// ─── task execution ───

async function executeTaskRun(request) {
  const workspaceRoot = resolveWorkspaceRoot(request.cwd);

  const kimiStatus = getKimiAvailability(request.cwd);
  if (!kimiStatus.available) {
    throw new Error("Kimi CLI is not installed. Run `/kimi:setup` for instructions.");
  }

  if (!request.prompt) {
    throw new Error("Provide a prompt for the Kimi task.");
  }

  const result = await runKimiTask(request.cwd, request.prompt, {
    model: request.model,
    thinking: request.thinking,
    maxSteps: request.maxSteps,
    session: request.session,
    continueSession: request.continueSession,
    onProgress: request.onProgress
  });

  const rawOutput = result.lastAssistantMessage || result.output || "";
  const failureMessage = result.stderr || "";
  const rendered = renderTaskResult(
    { rawOutput, failureMessage },
    { title: request.title ?? "Kimi Task", write: Boolean(request.write) }
  );
  const payload = {
    status: result.exitStatus,
    rawOutput,
    stderr: result.stderr
  };

  return {
    exitStatus: result.exitStatus,
    payload,
    rendered,
    summary: shorten(firstMeaningfulLine(rawOutput, firstMeaningfulLine(failureMessage, "Kimi task finished."))),
    jobTitle: request.title ?? "Kimi Task",
    jobClass: "task",
    write: Boolean(request.write)
  };
}

// ─── review ───

async function executeReviewRun(request) {
  const kimiStatus = getKimiAvailability(request.cwd);
  if (!kimiStatus.available) {
    throw new Error("Kimi CLI is not installed. Run `/kimi:setup` for instructions.");
  }

  ensureGitRepository(request.cwd);
  const target = resolveReviewTarget(request.cwd, {
    base: request.base,
    scope: request.scope
  });
  const context = collectReviewContext(request.cwd, target);

  let prompt;
  try {
    const template = loadPromptTemplate(ROOT_DIR, "review");
    prompt = interpolateTemplate(template, {
      TARGET_LABEL: target.label,
      REVIEW_INPUT: context.content
    });
  } catch {
    // Fallback if template is missing
    prompt = `Please review the following code changes and provide feedback on bugs, security issues, performance problems, and code quality.\n\nTarget: ${target.label}\n\n${context.content}`;
  }

  const result = await runKimiQuiet(context.repoRoot, prompt, {
    model: request.model,
    onProgress: request.onProgress
  });

  const rendered = renderReviewResult(result, {
    targetLabel: target.label
  });

  const payload = {
    review: "Kimi Review",
    target,
    stdout: result.stdout,
    stderr: result.stderr,
    exitStatus: result.exitStatus
  };

  return {
    exitStatus: result.exitStatus,
    payload,
    rendered,
    summary: firstMeaningfulLine(result.stdout, "Kimi review completed."),
    jobTitle: "Kimi Review",
    jobClass: "review",
    targetLabel: target.label
  };
}

// ─── job helpers ───

function createCompanionJob({ prefix, kind, title, workspaceRoot, jobClass, summary, write = false }) {
  return createJobRecord({
    id: generateJobId(prefix),
    kind,
    kindLabel: jobClass === "review" ? "review" : "rescue",
    title,
    workspaceRoot,
    jobClass,
    summary,
    write
  });
}

function createTrackedProgress(job, options = {}) {
  const logFile = options.logFile ?? createJobLogFile(job.workspaceRoot, job.id, job.title);
  return {
    logFile,
    progress: createProgressReporter({
      stderr: Boolean(options.stderr),
      logFile,
      onEvent: createJobProgressUpdater(job.workspaceRoot, job.id)
    })
  };
}

function buildTaskMetadata(prompt) {
  return {
    title: "Kimi Task",
    summary: shorten(prompt || "Task")
  };
}

function buildTaskJob(workspaceRoot, taskMetadata, write) {
  return createCompanionJob({
    prefix: "task",
    kind: "task",
    title: taskMetadata.title,
    workspaceRoot,
    jobClass: "task",
    summary: taskMetadata.summary,
    write
  });
}

function renderQueuedTaskLaunch(payload) {
  return `${payload.title} started in the background as ${payload.jobId}. Check /kimi:status ${payload.jobId} for progress.\n`;
}

async function runForegroundCommand(job, runner, options = {}) {
  const { logFile, progress } = createTrackedProgress(job, {
    logFile: options.logFile,
    stderr: !options.json
  });
  const execution = await runTrackedJob(job, () => runner(progress), { logFile });
  outputResult(options.json ? execution.payload : execution.rendered, options.json);
  if (execution.exitStatus !== 0) {
    process.exitCode = execution.exitStatus;
  }
  return execution;
}

function spawnDetachedTaskWorker(cwd, jobId) {
  const scriptPath = path.join(ROOT_DIR, "scripts", "kimi-companion.mjs");
  const child = spawn(process.execPath, [scriptPath, "task-worker", "--cwd", cwd, "--job-id", jobId], {
    cwd,
    env: process.env,
    detached: true,
    stdio: "ignore",
    windowsHide: true
  });
  child.unref();
  return child;
}

function enqueueBackgroundTask(cwd, job, request) {
  const { logFile } = createTrackedProgress(job);
  appendLogLine(logFile, "Queued for background execution.");

  const child = spawnDetachedTaskWorker(cwd, job.id);
  const queuedRecord = {
    ...job,
    status: "queued",
    phase: "queued",
    pid: child.pid ?? null,
    logFile,
    request
  };
  writeJobFile(job.workspaceRoot, job.id, queuedRecord);
  upsertJob(job.workspaceRoot, queuedRecord);

  return {
    payload: {
      jobId: job.id,
      status: "queued",
      title: job.title,
      summary: job.summary,
      logFile
    },
    logFile
  };
}

// ─── command handlers ───

async function handleTask(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["model", "cwd", "prompt-file", "max-steps", "session"],
    booleanOptions: ["json", "write", "background", "thinking", "no-thinking", "continue"],
    aliasMap: {
      m: "model"
    }
  });

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  const model = options.model ?? null;

  let thinking = undefined;
  if (options.thinking) thinking = true;
  if (options["no-thinking"]) thinking = false;

  const maxSteps = options["max-steps"] ? Number(options["max-steps"]) : null;
  const session = options.session ?? null;
  const continueSession = Boolean(options.continue);

  let prompt;
  if (options["prompt-file"]) {
    prompt = fs.readFileSync(path.resolve(cwd, options["prompt-file"]), "utf8");
  } else {
    prompt = positionals.join(" ") || readStdinIfPiped();
  }

  const write = Boolean(options.write);
  const taskMetadata = buildTaskMetadata(prompt);

  if (options.background) {
    const kimiStatus = getKimiAvailability(cwd);
    if (!kimiStatus.available) {
      throw new Error("Kimi CLI is not installed. Run `/kimi:setup` for instructions.");
    }
    if (!prompt) {
      throw new Error("Provide a prompt for the Kimi task.");
    }

    const job = buildTaskJob(workspaceRoot, taskMetadata, write);
    const request = {
      cwd,
      model,
      thinking,
      maxSteps,
      session,
      continueSession,
      prompt,
      write,
      jobId: job.id
    };
    const { payload } = enqueueBackgroundTask(cwd, job, request);
    outputCommandResult(payload, renderQueuedTaskLaunch(payload), options.json);
    return;
  }

  const job = buildTaskJob(workspaceRoot, taskMetadata, write);
  await runForegroundCommand(
    job,
    (progress) =>
      executeTaskRun({
        cwd,
        model,
        thinking,
        maxSteps,
        session,
        continueSession,
        prompt,
        write,
        title: taskMetadata.title,
        onProgress: progress
      }),
    { json: options.json }
  );
}

async function handleTaskWorker(argv) {
  const { options } = parseCommandInput(argv, {
    valueOptions: ["cwd", "job-id"]
  });

  if (!options["job-id"]) {
    throw new Error("Missing required --job-id for task-worker.");
  }

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);
  const storedJob = readStoredJob(workspaceRoot, options["job-id"]);
  if (!storedJob) {
    throw new Error(`No stored job found for ${options["job-id"]}.`);
  }

  const request = storedJob.request;
  if (!request || typeof request !== "object") {
    throw new Error(`Stored job ${options["job-id"]} is missing its task request payload.`);
  }

  const { logFile, progress } = createTrackedProgress(
    {
      ...storedJob,
      workspaceRoot
    },
    {
      logFile: storedJob.logFile ?? null
    }
  );
  await runTrackedJob(
    {
      ...storedJob,
      workspaceRoot,
      logFile
    },
    () =>
      executeTaskRun({
        ...request,
        onProgress: progress
      }),
    { logFile }
  );
}

async function handleReview(argv) {
  const { options } = parseCommandInput(argv, {
    valueOptions: ["base", "scope", "model", "cwd"],
    booleanOptions: ["json", "background", "wait"],
    aliasMap: {
      m: "model"
    }
  });

  const cwd = resolveCommandCwd(options);
  const workspaceRoot = resolveCommandWorkspace(options);

  const job = createCompanionJob({
    prefix: "review",
    kind: "review",
    title: "Kimi Review",
    workspaceRoot,
    jobClass: "review",
    summary: "Kimi code review"
  });

  await runForegroundCommand(
    job,
    (progress) =>
      executeReviewRun({
        cwd,
        base: options.base,
        scope: options.scope,
        model: options.model,
        onProgress: progress
      }),
    { json: options.json }
  );
}

function isActiveJobStatus(status) {
  return status === "queued" || status === "running";
}

async function waitForSingleJobSnapshot(cwd, reference, options = {}) {
  const timeoutMs = Math.max(0, Number(options.timeoutMs) || DEFAULT_STATUS_WAIT_TIMEOUT_MS);
  const pollIntervalMs = Math.max(100, Number(options.pollIntervalMs) || DEFAULT_STATUS_POLL_INTERVAL_MS);
  const deadline = Date.now() + timeoutMs;
  let snapshot = buildSingleJobSnapshot(cwd, reference);

  while (isActiveJobStatus(snapshot.job.status) && Date.now() < deadline) {
    await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - Date.now())));
    snapshot = buildSingleJobSnapshot(cwd, reference);
  }

  return {
    ...snapshot,
    waitTimedOut: isActiveJobStatus(snapshot.job.status),
    timeoutMs
  };
}

async function handleStatus(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["cwd", "timeout-ms", "poll-interval-ms"],
    booleanOptions: ["json", "all", "wait"]
  });

  const cwd = resolveCommandCwd(options);
  const reference = positionals[0] ?? "";
  if (reference) {
    const snapshot = options.wait
      ? await waitForSingleJobSnapshot(cwd, reference, {
          timeoutMs: options["timeout-ms"],
          pollIntervalMs: options["poll-interval-ms"]
        })
      : buildSingleJobSnapshot(cwd, reference);
    outputCommandResult(snapshot, renderJobStatusReport(snapshot.job), options.json);
    return;
  }

  if (options.wait) {
    throw new Error("`status --wait` requires a job id.");
  }

  const report = buildStatusSnapshot(cwd, { all: options.all });
  outputResult(options.json ? report : renderStatusReport(report), options.json);
}

function handleResult(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"]
  });

  const cwd = resolveCommandCwd(options);
  const reference = positionals[0] ?? "";
  const { workspaceRoot, job } = resolveResultJob(cwd, reference);
  const storedJob = readStoredJob(workspaceRoot, job.id);
  const payload = {
    job,
    storedJob
  };

  outputCommandResult(payload, renderStoredJobResult(job, storedJob), options.json);
}

async function handleCancel(argv) {
  const { options, positionals } = parseCommandInput(argv, {
    valueOptions: ["cwd"],
    booleanOptions: ["json"]
  });

  const cwd = resolveCommandCwd(options);
  const reference = positionals[0] ?? "";
  const { workspaceRoot, job } = resolveCancelableJob(cwd, reference);
  const existing = readStoredJob(workspaceRoot, job.id) ?? {};

  terminateProcessTree(job.pid ?? Number.NaN);
  appendLogLine(job.logFile, "Cancelled by user.");

  const completedAt = nowIso();
  const nextJob = {
    ...job,
    status: "cancelled",
    phase: "cancelled",
    pid: null,
    completedAt,
    errorMessage: "Cancelled by user."
  };

  writeJobFile(workspaceRoot, job.id, {
    ...existing,
    ...nextJob,
    cancelledAt: completedAt
  });
  upsertJob(workspaceRoot, {
    id: job.id,
    status: "cancelled",
    phase: "cancelled",
    pid: null,
    errorMessage: "Cancelled by user.",
    completedAt
  });

  const payload = {
    jobId: job.id,
    status: "cancelled",
    title: job.title
  };

  outputCommandResult(payload, renderCancelReport(nextJob), options.json);
}

// ─── main ───

async function main() {
  const [subcommand, ...argv] = process.argv.slice(2);
  if (!subcommand || subcommand === "help" || subcommand === "--help") {
    printUsage();
    return;
  }

  switch (subcommand) {
    case "setup":
      handleSetup(argv);
      break;
    case "task":
      await handleTask(argv);
      break;
    case "task-worker":
      await handleTaskWorker(argv);
      break;
    case "review":
      await handleReview(argv);
      break;
    case "status":
      await handleStatus(argv);
      break;
    case "result":
      handleResult(argv);
      break;
    case "cancel":
      await handleCancel(argv);
      break;
    default:
      throw new Error(`Unknown subcommand: ${subcommand}`);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
