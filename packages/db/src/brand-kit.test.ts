import { describe, it, expect } from "vitest";
import { renderBrandKit } from "./brand-kit";
import type { BrandSignals } from "./schema";

const full: BrandSignals = {
  palette: ["#b3d5f6", "#2f3b30"],
  primaryColor: "#b3d5f6",
  secondaryColor: "#2f3b30",
  accentColor: "#c97b4a",
  fonts: { heading: "Urbanist", body: "Urbanist" },
  toneOfVoiceSummary: "Warm en speels.",
  positioning: "Gepersonaliseerde kinderboeken met AI.",
  audience: "Ouders van jonge kinderen.",
  products: [{ name: "Persoonlijk boek", price: "€29", description: "Met de naam van je kind" }],
  socialLinks: { instagram: "https://instagram.com/kidsnovel" },
};

describe("renderBrandKit", () => {
  it("returns the three files in order", () => {
    const files = renderBrandKit(full, { brandName: "KidsNovel" });
    expect(files.map((f) => f.type)).toEqual([
      "visual-identity",
      "voice-and-messaging",
      "business",
    ]);
  });

  it("renders colors with brand-token vocabulary", () => {
    const [vi] = renderBrandKit(full);
    expect(vi.content).toContain("#b3d5f6");
    expect(vi.content).toContain("--brand-primary");
    expect(vi.content).toContain("Urbanist");
  });

  it("renders business name, products and positioning", () => {
    const biz = renderBrandKit(full, { brandName: "KidsNovel", sourceUrl: "https://kidsnovel.com" })
      .find((f) => f.type === "business")!;
    expect(biz.content).toContain("KidsNovel");
    expect(biz.content).toContain("Persoonlijk boek");
    expect(biz.content).toContain("€29");
    expect(biz.content).toContain("https://kidsnovel.com");
  });

  it("never throws on empty signals and shows fallbacks", () => {
    const files = renderBrandKit({}, {});
    expect(files).toHaveLength(3);
    for (const f of files) {
      expect(f.content.length).toBeGreaterThan(0);
      expect(f.content).toMatch(/Nog niet gedetecteerd/);
    }
  });

  it("voice file carries the tone summary", () => {
    const voice = renderBrandKit(full).find((f) => f.type === "voice-and-messaging")!;
    expect(voice.content).toContain("Warm en speels.");
    expect(voice.content).toContain("Ouders van jonge kinderen.");
  });
});
