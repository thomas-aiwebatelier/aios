import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getDb } from "@/lib/db";
import { blogPosts } from "@atelier/db";
import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const db = getDb();
  const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt));
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.slug || !body.body_markdown) {
    return NextResponse.json(
      { error: "title, slug, body_markdown required" },
      { status: 400 },
    );
  }

  const status: "draft" | "published" =
    body.status === "published" ? "published" : "draft";
  const now = new Date();
  const id = nanoid();

  try {
    const db = getDb();
    const [created] = await db
      .insert(blogPosts)
      .values({
        id,
        slug: body.slug,
        title: body.title,
        excerpt: body.excerpt ?? null,
        bodyMarkdown: body.body_markdown,
        language: body.language ?? "nl-BE",
        status,
        publishedAt:
          status === "published"
            ? body.published_at
              ? new Date(body.published_at)
              : now
            : null,
        seoTitle: body.seo_title ?? null,
        seoDescription: body.seo_description ?? null,
        ogImagePath: body.og_image_path ?? null,
        attributionName: body.attribution_name ?? null,
        attributionFramework: body.attribution_framework ?? null,
        attributionUrl: body.attribution_url ?? null,
        diagrams: body.diagrams ?? null,
        createdAt: now,
        updatedAt: now,
        authorId: session.user?.email ?? null,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23505" || e?.message?.includes("unique")) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("blog POST failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
