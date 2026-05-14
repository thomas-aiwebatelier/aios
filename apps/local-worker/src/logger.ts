/**
 * logger.ts — Structured JSON logger for local-worker.
 *
 * One newline-delimited JSON line per event on stdout. No external deps
 * (winston/pino would pull a lot in for what is essentially a 30-line
 * function). The format is compatible with `Get-EventLog` consumers and
 * with `jq` — the Windows Task Scheduler captures stdout into the task's
 * log file when invoked via `pwsh.exe ... -Command`.
 *
 * Levels: debug | info | warn | error.
 * LOG_LEVEL env var gates emission (default: info).
 */

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevel(): Level {
  const raw = (process.env.LOG_LEVEL ?? "info").toLowerCase() as Level;
  return raw in LEVEL_RANK ? raw : "info";
}

function shouldEmit(level: Level): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[currentLevel()];
}

function emit(level: Level, event: string, data?: Record<string, unknown>): void {
  if (!shouldEmit(level)) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...(data && Object.keys(data).length > 0 ? { data } : {}),
  });
  // Always stdout — Windows Task Scheduler treats stderr the same way but
  // separating them avoids confusing the log tail when used as a service.
  process.stdout.write(line + "\n");
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => emit("debug", event, data),
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};

export type Logger = typeof logger;
