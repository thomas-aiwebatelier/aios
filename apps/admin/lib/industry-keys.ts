import fs from "node:fs";
import { findSkillsDir } from "./skills-dir.js";

let cached: string[] | null = null;

/**
 * Returns the list of valid industry keys derived from
 * skills/industry-style-guides/*.md filenames at runtime.
 * Result is cached after first call.
 */
export function getValidIndustryKeys(): string[] {
  if (cached) return cached;

  const guidesDir = findSkillsDir();

  try {
    if (!guidesDir) throw new Error("skills dir not found");
    const files = fs.readdirSync(guidesDir);
    cached = files
      .filter((f) => f.endsWith(".md") && f !== "SKILL.md")
      .map((f) => f.replace(/\.md$/, ""));
    return cached;
  } catch {
    // Fallback if directory not found (e.g., in test environments)
    cached = [
      "automotive",
      "bakery-restaurant",
      "beauty-personal-care",
      "creative-services",
      "fitness-sport",
      "health-wellness",
      "professional-services",
      "real-estate-property",
      "retail-boutique",
      "trades-construction",
    ];
    return cached;
  }
}
