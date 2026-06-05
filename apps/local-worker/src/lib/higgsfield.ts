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

// Characters that are dangerous in cmd.exe (we use shell:true to launch the
// .cmd shim) and cannot be reliably escaped inside a quoted string — a bare
// double-quote ends the quote and the rest runs as a command (RCE). Built from
// a string to avoid character-class range mistakes: control chars (00-1f, incl.
// newlines), the double-quote, cmd metacharacters, and env-expansion markers.
// Hyphens/letters/digits/_/:/ are NOT included, so flags (--prompt), models
// (nano_banana_2) and ratios (1:1) survive intact.
const WIN_UNSAFE = new RegExp('[\\u0000-\\u001f"&|<>^()%!`]', "g");

/**
 * Make an argument safe to pass through cmd.exe. SECURITY: the `--prompt` value
 * is user-derived (the customer's ad-campaign text), so we STRIP unsafe chars
 * rather than escape them. Lossless for legitimate image prompts. After
 * stripping, wrapping a value that contains spaces in double quotes is safe.
 */
function quoteWinArg(arg: string): string {
  const cleaned = arg.replace(WIN_UNSAFE, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length === 0) return '""';
  return /\s/.test(cleaned) ? `"${cleaned}"` : cleaned;
}

/** Run the higgsfield CLI with raw args; resolves with stdout on exit 0. */
export function runHiggsfield(
  args: string[],
  options: RunHiggsfieldOptions = {},
): Promise<string> {
  const { timeoutMs = 20 * 60 * 1000 } = options;

  return new Promise((resolve, reject) => {
    logger.debug("higgsfield_spawn", { args });
    // On Windows the `higgsfield` shim is a `.cmd`, which Node can only launch
    // via the shell — but shell:true means WE must quote/sanitize. On POSIX we
    // pass the args array directly (no shell), so spaces are handled by the OS.
    const isWin = process.platform === "win32";
    const child = isWin
      ? spawn(["higgsfield", ...args.map(quoteWinArg)].join(" "), {
          stdio: ["ignore", "pipe", "pipe"],
          shell: true,
        })
      : spawn("higgsfield", args, {
          stdio: ["ignore", "pipe", "pipe"],
          shell: false,
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
  opts: { aspectRatio?: string; model?: string; imagePath?: string } = {},
): Promise<string> {
  const model = opts.model ?? "nano_banana_2";
  const args = ["generate", "create", model, "--prompt", prompt, "--wait"];
  if (opts.aspectRatio) args.push("--aspect_ratio", opts.aspectRatio);
  // Optional reference image (local file path; the CLI auto-uploads it).
  if (opts.imagePath) args.push("--image", opts.imagePath);

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
