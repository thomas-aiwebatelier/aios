import type { Metadata } from "next";
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blogPosts } from "@/lib/blog-schema";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

// DB-backed; skip build-time prerender (no DATABASE_URL during `next build`).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blog — AI Web Atelier",
  description:
    "Build-in-public dispatches over AI, Claude Code en eigen AIOS-bouw.",
  alternates: { canonical: "/blog" },
};

const dateFormatter = new Intl.DateTimeFormat("nl-BE", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

export default async function BlogIndexPage() {
  const db = getDb(process.env);

  const posts = await db
    .select({
      slug: blogPosts.slug,
      title: blogPosts.title,
      excerpt: blogPosts.excerpt,
      publishedAt: blogPosts.publishedAt,
    })
    .from(blogPosts)
    .where(eq(blogPosts.status, "published"))
    .orderBy(desc(blogPosts.publishedAt));

  return (
    <>
      <Nav />
      <main className="blog-index">
        <header className="blog-index-header">
          <span className="section-eyebrow">Blog</span>
          <h1>Build-in-public</h1>
          <p className="lead">
            Dispatches uit het atelier. Wat ik bouw, wat ik leer en wat ik een
            volgende keer anders zou doen.
          </p>
        </header>
        {posts.length > 0 ? (
          <ul className="blog-list">
            {posts.map((p) => (
              <li key={p.slug} className="blog-card">
                <a href={`/blog/${p.slug}`}>
                  <h2>{p.title}</h2>
                  {p.excerpt && <p className="excerpt">{p.excerpt}</p>}
                  {p.publishedAt && (
                    <time dateTime={p.publishedAt.toISOString()}>
                      {dateFormatter.format(p.publishedAt)}
                    </time>
                  )}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="blog-empty">
            Nog geen gepubliceerde posts. Binnenkort verschijnt hier de eerste.
          </p>
        )}
      </main>
      <Footer />
    </>
  );
}
