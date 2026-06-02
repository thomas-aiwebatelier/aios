export const prerender = false;

import type { APIContext } from "astro";
import { eq, desc } from "drizzle-orm";
import { getDb } from "../../lib/db";
import { blogPosts } from "@atelier/db";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET({ site, locals }: APIContext) {
  const runtimeEnv = (locals as any)?.runtime?.env as
    | Record<string, unknown>
    | undefined;
  const db = getDb(runtimeEnv);

  const posts = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt))
    .limit(50);

  const siteUrl = site?.toString() ?? "https://aiwebatelier.com/";
  const items = posts
    .map((p) => {
      const link = `${siteUrl.replace(/\/$/, "")}/blog/${p.slug}`;
      const pubDate = p.publishedAt ? p.publishedAt.toUTCString() : new Date().toUTCString();
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(p.excerpt ?? "")}</description>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>AI Web Atelier — Blog</title>
    <link>${siteUrl}blog</link>
    <atom:link href="${siteUrl}blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Build-in-public dispatches over AI, Claude Code en eigen AIOS-bouw.</description>
    <language>nl-BE</language>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
