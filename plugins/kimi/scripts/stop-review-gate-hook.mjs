#!/usr/bin/env node

import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCommand } from "./lib/process.mjs";
import { ensureGitRepository, getChangeSummary } from "./lib/git.mjs";
import { resolveWorkspaceRoot } from "./lib/workspace.mjs";
import { getKimiAvailability, runKimiQuiet } from "./lib/kimi.mjs";

const ROOT_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

function readHookInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function main() {
  const input = readHookInput();
  const cwd = input.cwd || process.cwd();
  
  // 1. Check for Kimi availability
  const kimiStatus = getKimiAvailability(cwd);
  if (!kimiStatus.available) {
    return; // Silently skip if Kimi is not setup
  }

  // 2. Check for uncommitted changes
  try {
    ensureGitRepository(cwd);
    const summary = getChangeSummary(cwd);
    if (!summary.hasChanges) {
      return; // No changes, proceed with exit
    }

    process.stderr.write(`\n[kimi] Uncommitted changes detected. Running a quick safety review...\n`);
    
    // 3. Run a quick "gate" review
    const context = summary.content;
    const prompt = `You are a pre-commit safety gate. Review the following uncommitted changes for critical bugs or security flaws that must be fixed before the user stops working. If everything looks okay, just say "No critical issues detected."\n\nChanges:\n${context}`;

    const result = await runKimiQuiet(cwd, prompt, { model: null });
    
    if (result.exitStatus === 0 && result.stdout) {
      process.stderr.write(`\n--- Kimi Gate Review ---\n`);
      process.stderr.write(result.stdout.trim());
      process.stderr.write(`\n------------------------\n\n`);
    } else {
      process.stderr.write(`\n[kimi] Safety review finished with no major findings or failed to run.\n`);
    }

  } catch (error) {
    // Fail gracefully for hooks
    // process.stderr.write(`[kimi] Hook error: ${error.message}\n`);
  }
}

main().catch(() => process.exit(0));
