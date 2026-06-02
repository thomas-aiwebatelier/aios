import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { blogPosts } from "@atelier/db";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { slug } = await params;
  const db = getDb();
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  if (!post) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json(post);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { slug } = await params;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const colMap: Record<string, string> = {
    title: "title",
    slug: "slug",
    excerpt: "excerpt",
    body_markdown: "bodyMarkdown",
    language: "language",
    status: "status",
    seo_title: "seoTitle",
    seo_description: "seoDescription",
    og_image_path: "ogImagePath",
    attribution_name: "attributionName",
    attribution_framework: "attributionFramework",
    attribution_url: "attributionUrl",
    diagrams: "diagrams",
  };

  for (const [k, dbKey] of Object.entries(colMap)) {
    if (k in body) updates[dbKey] = body[k];
  }

  const db = getDb();

  // Bump publishedAt if transitioning to published and not previously set
  if (body.status === "published") {
    const [existing] = await db
      .select({ publishedAt: blogPosts.publishedAt })
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);
    if (existing && !existing.publishedAt) {
      updates.publishedAt = new Date();
    }
  }

  try {
    const [updated] = await db
      .update(blogPosts)
      .set(updates as typeof blogPosts.$inferInsert)
      .where(eq(blogPosts.slug, slug))
      .returning();
    if (!updated) return new NextResponse("Not found", { status: 404 });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const e = err as { code?: string; message?: string };
    if (e?.code === "23505" || e?.message?.includes("unique")) {
      return NextResponse.json(
        { error: "Slug collision with another post" },
        { status: 409 },
      );
    }
    console.error("blog PATCH failed", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });
  const { slug } = await params;
  const db = getDb();
  const [deleted] = await db
    .delete(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .returning();
  if (!deleted) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ok: true });
}
