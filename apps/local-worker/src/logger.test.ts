/**
 * logger.test.ts — JSON logger emits well-formed lines and respects LOG_LEVEL.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { logger } from "./logger.js";

describe("logger", () => {
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let originalLevel: string | undefined;

  beforeEach(() => {
    writeSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    originalLevel = process.env.LOG_LEVEL;
  });

  afterEach(() => {
    writeSpy.mockRestore();
    if (originalLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLevel;
    }
  });

  it("emits a newline-delimited JSON line with ts/level/event", () => {
    delete process.env.LOG_LEVEL;
    logger.info("test_event", { foo: "bar" });

    expect(writeSpy).toHaveBeenCalledOnce();
    const written = String(writeSpy.mock.calls[0][0]);
    expect(written.endsWith("\n")).toBe(true);

    const parsed = JSON.parse(written.trim());
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("test_event");
    expect(parsed.data).toEqual({ foo: "bar" });
    // ts is ISO-8601
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("omits data when not provided", () => {
    delete process.env.LOG_LEVEL;
    logger.info("bare_event");
    const written = String(writeSpy.mock.calls[0][0]);
    const parsed = JSON.parse(written.trim());
    expect("data" in parsed).toBe(false);
  });

  it("LOG_LEVEL=warn suppresses info and debug", () => {
    process.env.LOG_LEVEL = "warn";
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    // Only warn + error written
    expect(writeSpy).toHaveBeenCalledTimes(2);
    const events = writeSpy.mock.calls.map(
      (c) => JSON.parse(String(c[0]).trim()).event,
    );
    expect(events).toEqual(["w", "e"]);
  });

  it("unknown LOG_LEVEL falls back to info", () => {
    process.env.LOG_LEVEL = "bogus";
    logger.debug("d");
    logger.info("i");
    expect(writeSpy).toHaveBeenCalledOnce();
    const parsed = JSON.parse(String(writeSpy.mock.calls[0][0]).trim());
    expect(parsed.event).toBe("i");
  });
});
