/**
 * higgsfield.ts — subprocess wrapper for the `higgsfield` CLI (@higgsfield/cli).
 *
 * Must be installed (`npm i -g @higgsfield/cli`) and authenticated
 * (`higgsfield auth login`) on the operator's machine — same model as the
 * `claude` CLI: locally it runs on the operator's Higgsfield account, no API
 * key in code. A deployed worker would auth the CLI via a token / or swap to
 * the HTTP API behind this same wrapper.
 */
import { spawn } from "node:child_process";
import { logger } from "../logger.js";

export interface RunHiggsfieldOptions {
  /** Timeout in ms. Default: 20 minutes (image+video gen can be slow). */
  timeoutMs?: number;
}

/** Run the higgsfield CLI with raw args; resolves with stdout on exit 0. */
export function runHiggsfield(
  args: string[],
  options: RunHiggsfieldOptions = {},
): Promise<string> {
  const { timeoutMs = 20 * 60 * 1000 } = options;

  return new Promise((resolve, reject) => {
    logger.debug("higgsfield_spawn", { args });
    const child = spawn("higgsfield", args, {
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32", // resolve higgsfield.cmd shim on PATH
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`higgsfield subprocess timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (c: Buffer) => {
      stdout += c.toString();
    });
    child.stderr.on("data", (c: Buffer) => {
      const t = c.toString();
      stderr += t;
      for (const line of t.split("\n")) if (line.trim()) logger.warn("higgsfield_stderr", { line });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`higgsfield spawn error: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`higgsfield exited with code ${code}. stderr: ${stderr.slice(0, 500)}`));
    });
  });
}

/**
 * Generate an on-brand image and return its hosted URL.
 * Uses `generate create <model> --prompt … --wait` and extracts the result URL
 * from the CLI output (works regardless of the exact JSON shape).
 */
export async function generateImage(
  prompt: string,
  opts: { aspectRatio?: string; model?: string } = {},
): Promise<string> {
  const model = opts.model ?? "nano_banana_2";
  const args = ["generate", "create", model, "--prompt", prompt, "--wait"];
  if (opts.aspectRatio) args.push("--aspect_ratio", opts.aspectRatio);

  const out = await runHiggsfield(args);
  const url = extractMediaUrl(out);
  if (!url) throw new Error("higgsfield: no media URL in CLI output");
  return url;
}

function extractMediaUrl(out: string): string | null {
  const urls = out.match(/https?:\/\/[^\s"'<>)]+/g) ?? [];
  if (!urls.length) return null;
  const media = urls.find((u) => /\.(png|jpe?g|webp|gif|mp4|mov|webm)(\?|$)/i.test(u));
  return media ?? urls[urls.length - 1];
}
