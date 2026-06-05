/**
 * creative.ts — processor for the `creative` pipeline step (Market ad generation).
 *
 * Reads the brand kit, generates on-brand ad copy (Claude CLI = local Max-plan;
 * OpenRouter in prod) and an on-brand image (higgsfield CLI), and fills the
 * ad_assets row. Status: queued → generating → ready | failed.
 */
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import {
  adAssets,
  brands,
  brandKitFiles,
  type Db,
} from "@atelier/db";
import { logger } from "./logger.js";
import { generateText } from "./lib/llm.js";
import { generateImage } from "./lib/higgsfield.js";
import {
  storageConfigured,
  rehostImage,
  fetchBytes,
  extFor,
} from "./lib/storage.js";

const AD_MEDIA_BUCKET = "ad-media";

type CreativePayload = { adAssetId?: string; brandId?: string; referenceUrl?: string };

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
      hasReference: Boolean(payload.referenceUrl),
    });

    // Optional reference image: download it to a temp file and hand it to the
    // CLI as --image. Cleaned up afterwards.
    let refPath: string | undefined;
    if (payload.referenceUrl) {
      try {
        const { bytes, contentType } = await fetchBytes(payload.referenceUrl);
        refPath = join(tmpdir(), `atelier-ref-${adAssetId}.${extFor(contentType)}`);
        writeFileSync(refPath, bytes);
      } catch (err) {
        logger.warn("creative_reference_download_failed", { error: String(err) });
        refPath = undefined;
      }
    }

    let genUrl: string;
    try {
      genUrl = await generateImage(imagePrompt, { aspectRatio: aspect, imagePath: refPath });
    } finally {
      if (refPath) {
        try {
          unlinkSync(refPath);
        } catch {
          /* temp cleanup best-effort */
        }
      }
    }

    // Re-host the generated image in our own public bucket so it survives the
    // provider's CDN expiry; fall back to the provider URL if Storage is off.
    const mediaUrl = storageConfigured()
      ? await rehostImage(genUrl, AD_MEDIA_BUCKET, `generated/${adAssetId}`)
      : genUrl;

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
    raw = await generateText(prompt, { timeoutMs: 3 * 60 * 1000 });
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
  hasReference?: boolean;
}): string {
  const palette = (input.visual.match(/#[0-9a-fA-F]{6}/g) ?? []).slice(0, 3).join(", ");
  const parts = [
    `On-brand social ad image. Campaign: ${input.campaign}.`,
    palette ? `Use the brand palette: ${palette}.` : "",
    input.hasReference
      ? "Use the provided reference image as style, mood and composition guidance."
      : "",
    "Clean, modern, high-quality commercial photography or illustration.",
    "No text overlays, no watermarks, no logos.",
  ];
  return parts.filter(Boolean).join(" ");
}
