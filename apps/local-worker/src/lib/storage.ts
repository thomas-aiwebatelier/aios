/**
 * storage.ts — minimal Supabase Storage client for the worker (REST + fetch,
 * no @supabase/supabase-js dependency). Uses the service-role key from env.
 *
 * Generated ad images and uploaded reference images live in the public
 * `ad-media` bucket so the portal can render them directly by URL.
 */
import { logger } from "../logger.js";

function base(): string {
  const u = process.env.SUPABASE_URL;
  if (!u) throw new Error("SUPABASE_URL not set");
  return u.replace(/\/$/, "");
}
function serviceKey(): string {
  const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return k;
}

/** Worker can run without Storage configured (older local setups). */
export function storageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export interface FetchedBytes {
  bytes: Buffer;
  contentType: string;
}

/** Download a URL into memory (bounded). */
export async function fetchBytes(url: string, timeoutMs = 30_000): Promise<FetchedBytes> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
    const ab = await res.arrayBuffer();
    return {
      bytes: Buffer.from(ab),
      contentType: res.headers.get("content-type") ?? "application/octet-stream",
    };
  } finally {
    clearTimeout(t);
  }
}

/** Map a content-type to a file extension for the storage path. */
export function extFor(contentType: string): string {
  if (/png/i.test(contentType)) return "png";
  if (/webp/i.test(contentType)) return "webp";
  if (/gif/i.test(contentType)) return "gif";
  return "jpg";
}

/**
 * Upload bytes to a PUBLIC bucket (upsert) and return the public URL.
 */
export async function uploadToBucket(
  bucket: string,
  path: string,
  bytes: Buffer,
  contentType: string,
): Promise<string> {
  const res = await fetch(`${base()}/storage/v1/object/${bucket}/${encodeURI(path)}`, {
    method: "POST",
    headers: {
      apikey: serviceKey(),
      authorization: `Bearer ${serviceKey()}`,
      "content-type": contentType,
      "x-upsert": "true",
    },
    body: new Uint8Array(bytes),
  });
  if (!res.ok) {
    throw new Error(
      `storage upload ${bucket}/${path} -> ${res.status}: ${(await res.text()).slice(0, 200)}`,
    );
  }
  return `${base()}/storage/v1/object/public/${bucket}/${encodeURI(path)}`;
}

/**
 * Download an external image and re-host it in the public bucket. Returns the
 * new public URL, or the original URL if re-hosting fails (non-fatal).
 */
export async function rehostImage(srcUrl: string, bucket: string, basePath: string): Promise<string> {
  try {
    const { bytes, contentType } = await fetchBytes(srcUrl);
    const path = `${basePath}.${extFor(contentType)}`;
    return await uploadToBucket(bucket, path, bytes, contentType);
  } catch (err) {
    logger.warn("storage_rehost_failed", { srcUrl, error: String(err) });
    return srcUrl;
  }
}
