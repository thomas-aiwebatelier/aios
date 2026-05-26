import { describe, it, expect } from "vitest";
import { addWeekdays } from "./sequence.js";

describe("addWeekdays", () => {
  it("skips weekends (Fri + 1 = Mon)", () => {
    const fri = new Date("2026-05-22T09:00:00Z"); // Friday
    expect(addWeekdays(fri, 1).getUTCDate()).toBe(25); // Monday
  });
  it("adds within the week (Mon + 3 = Thu)", () => {
    const mon = new Date("2026-05-25T09:00:00Z");
    expect(addWeekdays(mon, 3).getUTCDate()).toBe(28);
  });
  it("returns a new Date, does not mutate input", () => {
    const d = new Date("2026-05-25T09:00:00Z");
    addWeekdays(d, 2);
    expect(d.getUTCDate()).toBe(25);
  });
});
