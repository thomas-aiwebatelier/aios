import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { marked } from "marked";
import { getDb } from "@/lib/db";
import { blogPosts } from "@/lib/blog-schema";

// DB-backed; skip build-time prerender (DATABASE_URL is RUNTIME-only on
// Firebase App Hosting). Pages render per request with no SSG fallback.
export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

type Params = { slug: string };

async function loadPost(slug: string) {
  const db = getDb(process.env);
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(and(eq(blogPosts.slug, slug), eq(blogPosts.status, "published")))
    .limit(1);
  return post ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "Niet gevonden — AI Web Atelier" };

  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt ?? undefined;
  const ogImage = post.ogImagePath ? post.ogImagePath : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/blog/${post.slug}`,
      images: ogImage ? [{ url: ogImage }] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) notFound();

  // Rewrite `.excalidraw` refs to served SVG paths.
  const markdown = post.bodyMarkdown.replace(
    /!\[([^\]]*)\]\(\.\/diagrams\/([^)]+)\.excalidraw\)/g,
    (_m, alt, name) => `![${alt}](/blog/diagrams/${name}.svg)`
  );

  const html = await marked.parse(markdown);

  return (
    <article className="blog-post">
      <header className="blog-post-header">
        <p className="back">
          <a href="/blog">← terug naar alle posts</a>
        </p>
        <h1>{post.title}</h1>
        <div className="post-meta">
          {post.publishedAt && (
            <time dateTime={post.publishedAt.toISOString()}>
              {dateFormatter.format(post.publishedAt)}
            </time>
          )}
          {post.attributionName && post.attributionUrl && (
            <p className="attribution">
              Framework <em>{post.attributionFramework}</em> door{" "}
              <a
                href={post.attributionUrl}
                target="_blank"
                rel="noopener"
              >
                {post.attributionName}
              </a>
            </p>
          )}
        </div>
      </header>
      <div
        className="blog-post-body"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
