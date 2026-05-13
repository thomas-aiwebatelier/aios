/**
 * claude-code.ts — shared subprocess wrapper for spawning `claude` CLI.
 *
 * Used by:
 *   - industry-classify.ts (Task 3.1)
 *   - staleness.ts (Task 3.1)
 *   - generation (Task 4.1)
 *   - edit (Task 4.5)
 *
 * Spec §13.2: 30-minute timeout per subprocess call.
 */

import { spawn } from "node:child_process";
import { logger } from "./logger.js";

export interface RunClaudeCodeOptions {
  /** Additional CLI flags, e.g. ['--model', 'claude-haiku-4-5'] */
  args?: string[];
  /** Timeout in milliseconds. Default: 30 minutes per spec §13.2 */
  timeoutMs?: number;
}

/**
 * Spawn `claude --print --output-format text` with the given prompt.
 * Streams stdout to the logger; resolves with the full stdout string.
 * Rejects on non-zero exit, timeout, or spawn error.
 */
export function runClaudeCode(
  prompt: string,
  options: RunClaudeCodeOptions = {},
): Promise<string> {
  const { args = [], timeoutMs = 30 * 60 * 1000 } = options;

  return new Promise((resolve, reject) => {
    const cliArgs = ["--print", "--output-format", "text", ...args];

    logger.debug("[claude-code] spawning claude", { args: cliArgs });

    const child = spawn("claude", cliArgs, {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
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
      // Stream to logger at debug level (avoids flooding info logs)
      for (const line of text.split("\n")) {
        if (line.trim()) logger.debug("[claude-code] stdout", { line });
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split("\n")) {
        if (line.trim()) logger.warn("[claude-code] stderr", { line });
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

    // Write the prompt to stdin and close it
    child.stdin.write(prompt, "utf8");
    child.stdin.end();
  });
}
