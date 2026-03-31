import { spawn } from "node:child_process";
import process from "node:process";

import { binaryAvailable } from "./process.mjs";

const DEFAULT_KIMI_BIN = "kimi";

/**
 * Check if the Kimi CLI is available and return version info.
 */
export function getKimiAvailability(cwd) {
  return binaryAvailable(DEFAULT_KIMI_BIN, ["--version"], { cwd });
}

/**
 * Build the Kimi CLI arguments for a task invocation.
 */
function buildKimiArgs(prompt, options = {}) {
  const args = [];

  if (options.quiet) {
    args.push("--quiet");
  } else {
    args.push("--print");
    args.push("--output-format", "stream-json");
  }

  args.push("-p", prompt);

  if (options.workDir) {
    args.push("--work-dir", options.workDir);
  }

  if (options.model) {
    args.push("--model", options.model);
  }

  if (options.thinking === true) {
    args.push("--thinking");
  } else if (options.thinking === false) {
    args.push("--no-thinking");
  }

  if (options.maxSteps != null) {
    args.push("--max-steps", String(options.maxSteps));
  }

  if (options.session) {
    args.push("--session", options.session);
  }

  if (options.continueSession) {
    args.push("--continue");
  }

  // Always add --yolo since Claude Code user has authorized delegation
  args.push("--yolo");

  return args;
}

/**
 * Extract text content from Kimi's assistant message.
 * Kimi outputs content as an array: [{type:"think", think:"..."}, {type:"text", text:"..."}]
 */
function extractAssistantText(content) {
  if (typeof content === "string") {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .filter((item) => item.type === "text" && item.text)
      .map((item) => item.text)
      .join("\n");
  }
  return "";
}

/**
 * Extract thinking/reasoning from Kimi's assistant message.
 */
function extractAssistantThinking(content) {
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .filter((item) => item.type === "think" && item.think)
    .map((item) => item.think)
    .join("\n");
}

/**
 * Calculate the total text length for progress reporting.
 */
function contentTextLength(content) {
  if (typeof content === "string") {
    return content.length;
  }
  if (Array.isArray(content)) {
    return content.reduce((sum, item) => {
      if (item.type === "text" && item.text) return sum + item.text.length;
      return sum;
    }, 0);
  }
  return 0;
}

/**
 * Run a Kimi task using stream-json mode.
 * Returns { exitStatus, output, lastAssistantMessage }.
 */
export function runKimiTask(cwd, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const args = buildKimiArgs(prompt, { ...options, quiet: false, workDir: cwd });
    const child = spawn(DEFAULT_KIMI_BIN, args, {
      cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    let stderrBuf = "";
    let lastAssistantMessage = "";
    const allOutput = [];
    let lineBuffer = "";

    child.stdout.on("data", (chunk) => {
      lineBuffer += chunk.toString("utf8");
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        allOutput.push(trimmed);

        try {
          const event = JSON.parse(trimmed);

          // Report progress
          if (options.onProgress) {
            if (event.type === "progress" || event.type === "status") {
              options.onProgress({
                message: event.message ?? event.status ?? trimmed,
                phase: event.phase ?? null
              });
            } else if (event.role === "assistant" && event.content) {
              const textLen = contentTextLength(event.content);
              options.onProgress({
                message: `Kimi responded (${textLen} chars)`,
                phase: "responding"
              });
            }
          }

          // Track last assistant message as the final result
          if (event.role === "assistant" && event.content) {
            const text = extractAssistantText(event.content);
            if (text) {
              lastAssistantMessage = text;
            }
          }
        } catch {
          // Non-JSON line - treat as plain text output
          if (options.onProgress) {
            options.onProgress({ message: trimmed, phase: "running" });
          }
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderrBuf += chunk.toString("utf8");
      if (options.onProgress) {
        const lines = chunk.toString("utf8").split("\n").filter(Boolean);
        for (const line of lines) {
          options.onProgress({ message: line.trim(), phase: "running", stderrMessage: line.trim() });
        }
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn kimi: ${err.message}`));
    });

    child.on("close", (code) => {
      // Process any remaining buffer
      if (lineBuffer.trim()) {
        allOutput.push(lineBuffer.trim());
        try {
          const event = JSON.parse(lineBuffer.trim());
          if (event.role === "assistant" && event.content) {
            const text = extractAssistantText(event.content);
            if (text) {
              lastAssistantMessage = text;
            }
          }
        } catch {
          // ignore
        }
      }

      resolve({
        exitStatus: code ?? 1,
        output: allOutput.join("\n"),
        lastAssistantMessage,
        stderr: stderrBuf.trim()
      });
    });

    // Store child reference for cancellation
    if (options.onSpawn) {
      options.onSpawn(child);
    }
  });
}

/**
 * Run Kimi in quiet mode (plain text output).
 * Used for simple tasks and reviews.
 */
export function runKimiQuiet(cwd, prompt, options = {}) {
  return new Promise((resolve, reject) => {
    const args = buildKimiArgs(prompt, { ...options, quiet: true, workDir: cwd });
    const child = spawn(DEFAULT_KIMI_BIN, args, {
      cwd,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true
    });

    let stdoutBuf = "";
    let stderrBuf = "";

    child.stdout.on("data", (chunk) => {
      stdoutBuf += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderrBuf += chunk.toString("utf8");
      if (options.onProgress) {
        const lines = chunk.toString("utf8").split("\n").filter(Boolean);
        for (const line of lines) {
          options.onProgress({ message: line.trim(), phase: "running" });
        }
      }
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to spawn kimi: ${err.message}`));
    });

    child.on("close", (code) => {
      resolve({
        exitStatus: code ?? 1,
        stdout: stdoutBuf.trim(),
        stderr: stderrBuf.trim()
      });
    });

    if (options.onSpawn) {
      options.onSpawn(child);
    }
  });
}
