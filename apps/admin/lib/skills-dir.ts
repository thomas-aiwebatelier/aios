/**
 * skills-dir.ts — robust locator for skills/industry-style-guides.
 *
 * In local dev the dir sits at <repo>/skills/industry-style-guides, resolvable
 * relative to this module. In the Firebase App Hosting standalone bundle the
 * repo tree isn't present at runtime — only `.next/standalone/` is. The
 * post-build script copies skills/ into the standalone root, so we also probe
 * relative to process.cwd(). We walk several levels up from BOTH anchors and
 * return the first dir that actually contains SKILL.md.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

let _cached: string | null | undefined;

export function findSkillsDir(): string | null {
  if (_cached !== undefined) return _cached;

  const candidates: string[] = [];

  // Anchor 1: this module's directory, walking up
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 8; i++) {
      candidates.push(path.join(dir, "skills", "industry-style-guides"));
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    // import.meta.url unavailable in some bundling modes — ignore
  }

  // Anchor 2: process.cwd(), walking up
  let cwd = process.cwd();
  for (let i = 0; i < 8; i++) {
    candidates.push(path.join(cwd, "skills", "industry-style-guides"));
    const parent = path.dirname(cwd);
    if (parent === cwd) break;
    cwd = parent;
  }

  for (const c of candidates) {
    try {
      if (fs.existsSync(path.join(c, "SKILL.md"))) {
        _cached = c;
        return c;
      }
    } catch {
      // keep probing
    }
  }

  _cached = null;
  return null;
}
