/**
 * llm.ts — text generation with a local/prod split, behind one interface.
 *
 *  - Local (operator machine): the `claude` CLI (Max-plan file auth, no API key).
 *  - Prod (deployed container):  OpenRouter (OpenAI-compatible) when
 *    OPENROUTER_API_KEY is set — a container can't do interactive Max-plan auth.
 *
 * Callers (brand-kit, creative) use `generateText` and don't care which path
 * runs. Model for prod is OPENROUTER_MODEL (default anthropic/claude-3.5-sonnet).
 */
import { runClaudeCode } from "./claude-code.js";

export interface GenerateTextOptions {
  timeoutMs?: number;
  /** OpenRouter model override (prod path only). */
  model?: string;
}

export async function generateText(
  prompt: string,
  opts: GenerateTextOptions = {},
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY;
  if (key) return generateViaOpenRouter(prompt, key, opts);
  return runClaudeCode(prompt, { timeoutMs: opts.timeoutMs });
}

async function generateViaOpenRouter(
  prompt: string,
  key: string,
  opts: GenerateTextOptions,
): Promise<string> {
  const model =
    opts.model ?? process.env.OPENROUTER_MODEL ?? "anthropic/claude-3.5-sonnet";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 3 * 60 * 1000);
  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string") throw new Error("OpenRouter: no text in response");
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}
