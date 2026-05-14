/**
 * claude-code.ts — subprocess wrapper for the `claude` CLI.
 *
 * Ported from apps/admin/lib/claude-code.ts. The CLI must be on PATH and
 * authenticated against the operator's Max plan (`%USERPROFILE%\.claude\`).
 *
 * Spec §13.2: 30-minute timeout per subprocess call.
 */

import { spawn } from "node:child_process";
import { logger } from "../logger.js";

export interface RunClaudeCodeOptions {
  /** Additional CLI flags, e.g. ["--dangerously-skip-permissions", "--cwd", path] */
  args?: string[];
  /** Timeout in ms. Default: 30 minutes. */
  timeoutMs?: number;
}

export function runClaudeCode(
  prompt: string,
  options: RunClaudeCodeOptions = {},
): Promise<string> {
  const { args = [], timeoutMs = 30 * 60 * 1000 } = options;

  return new Promise((resolve, reject) => {
    const cliArgs = ["--print", "--output-format", "text", ...args];
    logger.debug("claude_spawn", { args: cliArgs });

    // shell:true on Windows lets PATH resolution find `claude.cmd` shim
    // installed by `npm i -g @anthropic-ai/claude-code`. On POSIX shell:false
    // is safer (avoids shell-injection); we pick true here because the local
    // worker only runs on Windows in production and the args we pass are
    // not user-controlled.
    const child = spawn("claude", cliArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`claude subprocess timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      for (const line of text.split("\n")) {
        if (line.trim()) logger.debug("claude_stdout", { line });
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split("\n")) {
        if (line.trim()) logger.warn("claude_stderr", { line });
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`claude spawn error: ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `claude exited with code ${code}. stderr: ${stderr.slice(0, 500)}`,
          ),
        );
      }
    });

    child.stdin.write(prompt, "utf8");
    child.stdin.end();
  });
}
