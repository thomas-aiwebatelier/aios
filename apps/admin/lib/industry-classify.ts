/**
 * industry-classify.ts — resolves a lead's industry using the SKILL.md
 * resolution algorithm (Task 3.1).
 *
 * Resolution order per skills/industry-style-guides/SKILL.md:
 *   1. Direct match by Google Maps types  → confidence 0.95
 *   2. Keyword match on business_name     → confidence 0.75
 *   3. Free-form claude subprocess        → confidence from claude (clamped)
 *   4. Default fallback                   → professional-services, confidence 0.0
 *
 * IMPORTANT: canonical industry_key values are read from the filenames in
 * skills/industry-style-guides/*.md (excluding SKILL.md) — never hardcoded.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { logger } from "./logger.js";
import { runClaudeCode } from "./claude-code.js";
import { findSkillsDir } from "./skills-dir.js";

// ── Path resolution ──────────────────────────────────────────────────────────

const SKILL_DIR = findSkillsDir();
const SKILL_MD = SKILL_DIR ? path.join(SKILL_DIR, "SKILL.md") : null;

// Hardcoded fallback canonical keys — mirrors the *.md filenames. Used only if
// the skills dir can't be located at runtime (defensive; should not happen
// once post-build bundles skills/ into the standalone output).
const FALLBACK_KEYS = [
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

// ── Types ────────────────────────────────────────────────────────────────────

export type IndustrySource = "google_types" | "keyword" | "free_form" | "default";

export interface ClassifyResult {
  industry_key: string;
  confidence: number;
  source: IndustrySource;
}

// ── Boot-time cache (read SKILL.md once) ─────────────────────────────────────

interface SkillData {
  canonicalKeys: Set<string>;
  typesMap: Map<string, string>;   // google_type → industry_key
  keywordsMap: Array<{ keywords: string[]; key: string }>; // ordered, first-match-wins
}

let _cache: SkillData | undefined;

/**
 * Strips diacritics from a string and lowercases it.
 * Used for keyword matching per SKILL.md spec.
 */
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Parse SKILL.md to extract the types table and keyword table.
 * Called once at module load; result is cached in _cache.
 */
function loadSkillData(): SkillData {
  if (_cache) return _cache;

  // Defensive: if skills dir wasn't found, return fallback keys + empty maps.
  // Classification then relies on claude free-form (step 3) + default (step 4).
  if (!SKILL_DIR || !SKILL_MD) {
    logger.error("[industry-classify] skills dir not found at runtime — using fallback keys");
    _cache = {
      canonicalKeys: new Set(FALLBACK_KEYS),
      typesMap: new Map(),
      keywordsMap: [],
    };
    return _cache;
  }

  // 1. Read canonical keys from filenames (excluding SKILL.md itself)
  const mdFiles = readdirSync(SKILL_DIR)
    .filter((f) => f.endsWith(".md") && f !== "SKILL.md")
    .map((f) => f.replace(/\.md$/, ""));
  const canonicalKeys = new Set(mdFiles);

  logger.debug("[industry-classify] canonical keys loaded", {
    keys: [...canonicalKeys],
  });

  // 2. Parse SKILL.md for both tables
  const content = readFileSync(SKILL_MD, "utf8");
  const lines = content.split("\n");

  const typesMap = new Map<string, string>();
  const keywordsMap: Array<{ keywords: string[]; key: string }> = [];

  // Detect which table we are in
  let inTypesTable = false;
  let inKeywordsTable = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line.startsWith("## Google Maps")) {
      inTypesTable = true;
      inKeywordsTable = false;
      continue;
    }
    if (line.startsWith("## Keyword table")) {
      inKeywordsTable = true;
      inTypesTable = false;
      continue;
    }
    // A new ## heading ends both tables
    if (line.startsWith("## ") && !line.startsWith("## Google Maps") && !line.startsWith("## Keyword")) {
      inTypesTable = false;
      inKeywordsTable = false;
    }

    // Parse table rows: | col1 | col2 |
    if (!line.startsWith("|") || line.startsWith("| ---") || line.startsWith("|---")) continue;
    const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;

    const rawLeft = cols[0];
    const rawRight = cols[1];

    // Extract industry_key from right column: `industry_key`
    const keyMatch = rawRight.match(/`([^`]+)`/);
    if (!keyMatch) continue;
    const industryKey = keyMatch[1];

    if (inTypesTable) {
      // Left col: `google_type` — may have comments like "(generic — only if...)"
      // Extract just the first backtick-delimited token
      const typeMatch = rawLeft.match(/`([^`]+)`/);
      if (!typeMatch) continue;
      const googleType = typeMatch[1];
      typesMap.set(googleType, industryKey);
    }

    if (inKeywordsTable) {
      // Left col: comma-separated keywords inside backticks or as plain text
      // The SKILL.md format is: | `kw1`, `kw2`, ... | `industry_key` |
      // Extract all backtick tokens
      const kwMatches = [...rawLeft.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
      if (kwMatches.length === 0) continue;
      // Flatten comma-separated within each token
      const keywords: string[] = [];
      for (const kw of kwMatches) {
        for (const part of kw.split(",")) {
          const k = normalizeName(part.trim());
          if (k) keywords.push(k);
        }
      }
      if (keywords.length > 0) {
        keywordsMap.push({ keywords, key: industryKey });
      }
    }
  }

  logger.debug("[industry-classify] types map size", { size: typesMap.size });
  logger.debug("[industry-classify] keywords rows", { rows: keywordsMap.length });

  _cache = { canonicalKeys, typesMap, keywordsMap };
  return _cache;
}

// ── Validation ───────────────────────────────────────────────────────────────

function isCanonical(key: string): boolean {
  const { canonicalKeys } = loadSkillData();
  // When SKILL_DIR is missing we can't stat the .md file; fall back to the
  // in-memory key set (which is the fallback list in that case).
  const fileOk = SKILL_DIR ? existsSync(path.join(SKILL_DIR, `${key}.md`)) : true;
  const valid = canonicalKeys.has(key) && fileOk;
  if (!valid) {
    logger.warn("[industry-classify] non-canonical key rejected", { key });
  }
  return valid;
}

// ── Resolution steps ─────────────────────────────────────────────────────────

function resolveByGoogleTypes(googleTypes: string[]): string | undefined {
  const { typesMap } = loadSkillData();

  // Special case: "food" only matches if no more-specific type matched first.
  // So try all types except "food" first, then allow "food" as fallback.
  const priority = googleTypes.filter((t) => t !== "food");
  const fallback = googleTypes.filter((t) => t === "food");

  for (const t of [...priority, ...fallback]) {
    const key = typesMap.get(t);
    if (key) return key;
  }
  return undefined;
}

function resolveByKeyword(businessName: string): string | undefined {
  const { keywordsMap } = loadSkillData();
  const normalized = normalizeName(businessName);

  // Ordered match — first row whose ANY keyword appears in the name wins
  for (const { keywords, key } of keywordsMap) {
    for (const kw of keywords) {
      if (normalized.includes(kw)) {
        return key;
      }
    }
  }
  return undefined;
}

async function resolveByClaudeCode(
  businessName: string,
  googleTypes: string[],
): Promise<{ key: string; confidence: number } | undefined> {
  const { canonicalKeys } = loadSkillData();
  const keyList = [...canonicalKeys].join(", ");

  const prompt =
    `You are classifying a Belgian business for a website design pipeline.\n` +
    `Business name: "${businessName}"\n` +
    `Google Maps types: ${googleTypes.join(", ") || "(none)"}\n\n` +
    `Respond with a JSON object and NOTHING ELSE:\n` +
    `{ "industry_key": "<one of: ${keyList}>", "confidence": <number 0-1> }\n\n` +
    `Pick the single best matching industry_key from the list above. ` +
    `If unsure, use "professional-services". Confidence is your certainty (0.0–1.0).`;

  try {
    const raw = await runClaudeCode(prompt);
    // Extract JSON from the response (claude may add trailing text)
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      logger.warn("[industry-classify] claude returned no JSON", { raw: raw.slice(0, 200) });
      return undefined;
    }
    const parsed = JSON.parse(match[0]) as { industry_key?: string; confidence?: number };
    const key = parsed.industry_key ?? "";
    const confidence = typeof parsed.confidence === "number"
      ? Math.min(0.95, Math.max(0, parsed.confidence))
      : 0.5;

    if (!canonicalKeys.has(key)) {
      logger.warn("[industry-classify] claude returned non-canonical key", { key });
      return undefined;
    }
    return { key, confidence };
  } catch (err) {
    logger.warn("[industry-classify] claude subprocess error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function classifyIndustry(input: {
  name: string;
  googleTypes: string[];
}): Promise<ClassifyResult> {
  const { name, googleTypes } = input;

  // Step 1: Google Maps types
  const byTypes = resolveByGoogleTypes(googleTypes);
  if (byTypes && isCanonical(byTypes)) {
    return { industry_key: byTypes, confidence: 0.95, source: "google_types" };
  }

  // Step 2: Keyword match
  const byKeyword = resolveByKeyword(name);
  if (byKeyword && isCanonical(byKeyword)) {
    return { industry_key: byKeyword, confidence: 0.75, source: "keyword" };
  }

  // Step 3: Free-form claude
  const byClaudeCode = await resolveByClaudeCode(name, googleTypes);
  if (byClaudeCode && isCanonical(byClaudeCode.key)) {
    return {
      industry_key: byClaudeCode.key,
      confidence: byClaudeCode.confidence,
      source: "free_form",
    };
  }

  // Step 4: Default
  logger.warn("[industry-classify] falling back to professional-services", { name });
  return {
    industry_key: "professional-services",
    confidence: 0.0,
    source: "default",
  };
}

// Export for testing
export { loadSkillData, normalizeName };
