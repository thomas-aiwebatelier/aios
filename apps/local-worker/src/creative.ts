/**
 * creative.ts — processor for the `creative` pipeline step (Market ad generation).
 *
 * Reads the brand kit, generates on-brand ad copy (Claude CLI = local Max-plan;
 * OpenRouter in prod) and an on-brand image (higgsfield CLI), and fills the
 * ad_assets row. Status: queued → generating → ready | failed.
 */
import { eq } from "drizzle-orm";
import {
  adAssets,
  brands,
  brandKitFiles,
  type Db,
} from "@atelier/db";
import { logger } from "./logger.js";
import { runClaudeCode } from "./lib/claude-code.js";
import { generateImage } from "./lib/higgsfield.js";

type CreativePayload = { adAssetId?: string; brandId?: string };

const ASPECT: Record<string, string> = {
  feed: "1:1",
  story: "9:16",
  reels: "9:16",
};

export async function processCreativeJob(
  db: Db,
  job: { id: string; payload: unknown; leadId: string | null },
): Promise<void> {
  const payload = (job.payload ?? {}) as CreativePayload;
  const adAssetId = payload.adAssetId;
  if (!adAssetId) throw new Error("creative job is missing payload.adAssetId");

  const asset = (await db.select().from(adAssets).where(eq(adAssets.id, adAssetId)))[0];
  if (!asset) throw new Error(`ad_asset not found: ${adAssetId}`);

  try {
    await db.update(adAssets).set({ status: "generating" }).where(eq(adAssets.id, adAssetId));
    logger.info("creative_start", { adAssetId, brandId: asset.brandId });

    const brand = (await db.select().from(brands).where(eq(brands.id, asset.brandId)))[0];
    const kit = await db
      .select()
      .from(brandKitFiles)
      .where(eq(brandKitFiles.brandId, asset.brandId));
    const voice = kit.find((f) => f.type === "voice-and-messaging")?.content ?? "";
    const visual = kit.find((f) => f.type === "visual-identity")?.content ?? "";

    const aspect = asset.placement ? ASPECT[asset.placement] ?? "1:1" : "1:1";

    const copy = await generateCopy({
      campaign: asset.prompt,
      placement: asset.placement ?? "feed",
      voice,
    });

    const imagePrompt = buildImagePrompt({
      brandName: brand?.sourceUrl ?? "",
      campaign: asset.prompt,
      visual,
    });
    const mediaUrl = await generateImage(imagePrompt, { aspectRatio: aspect });

    await db
      .update(adAssets)
      .set({
        status: "ready",
        errorMessage: null,
        aspectRatio: aspect,
        headline: copy.headline ?? null,
        primaryText: copy.primaryText ?? null,
        description: copy.description ?? null,
        mediaUrl,
      })
      .where(eq(adAssets.id, adAssetId));
    logger.info("creative_ready", { adAssetId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(adAssets)
      .set({ status: "failed", errorMessage: msg })
      .where(eq(adAssets.id, adAssetId));
    throw err;
  }
}

type Copy = { headline?: string; primaryText?: string; description?: string };

async function generateCopy(input: {
  campaign: string;
  placement: string;
  voice: string;
}): Promise<Copy> {
  const prompt = `Je schrijft advertentietekst in het Nederlands (nl-BE), informeel (je/jij), in deze merkstem:

"""
${input.voice || "(geen merkstem beschikbaar — schrijf warm, concreet en zonder hype)"}
"""

Campagne-briefing van de klant: "${input.campaign}"
Plaatsing: ${input.placement}

Geef UITSLUITEND geldige JSON terug (geen uitleg, geen codeblok):
{
  "headline": "korte pakkende kop (max ~40 tekens)",
  "primaryText": "1-2 zinnen hoofdtekst die tot actie aanzet",
  "description": "korte ondersteunende zin / CTA"
}`;
  let raw = "";
  try {
    raw = await runClaudeCode(prompt, { timeoutMs: 3 * 60 * 1000 });
  } catch (err) {
    logger.warn("creative_copy_failed", { error: String(err) });
    return {};
  }
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return {};
  try {
    return JSON.parse(m[0]) as Copy;
  } catch {
    return {};
  }
}

function buildImagePrompt(input: {
  brandName: string;
  campaign: string;
  visual: string;
}): string {
  const palette = (input.visual.match(/#[0-9a-fA-F]{6}/g) ?? []).slice(0, 3).join(", ");
  const parts = [
    `On-brand social ad image. Campaign: ${input.campaign}.`,
    palette ? `Use the brand palette: ${palette}.` : "",
    "Clean, modern, high-quality commercial photography or illustration.",
    "No text overlays, no watermarks, no logos.",
  ];
  return parts.filter(Boolean).join(" ");
}
