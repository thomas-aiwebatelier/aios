import { describe, it, expect } from "vitest";
import { generateSlug } from "./slug.js";

describe("generateSlug", () => {
  it("kebabs business name + first 4 of city + 4-char nanoid", () => {
    const s = generateSlug("Bakkerij Van den Berg", "Antwerpen");
    expect(s).toMatch(/^bakkerij-van-den-berg-antw-[a-z0-9]{4}$/);
  });

  it("strips diacritics", () => {
    const s = generateSlug("Café Élysée", "Liège");
    expect(s).toMatch(/^cafe-elysee-lieg-[a-z0-9]{4}$/);
  });
});
