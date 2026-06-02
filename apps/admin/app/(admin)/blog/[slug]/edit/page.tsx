import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { blogPosts } from "@atelier/db";
import { eq } from "drizzle-orm";
import BlogPostForm from "../../_components/BlogPostForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditBlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const db = getDb();
  const [post] = await db
    .select()
    .from(blogPosts)
    .where(eq(blogPosts.slug, slug))
    .limit(1);
  if (!post) notFound();

  return (
    <BlogPostForm
      mode="edit"
      initial={{
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
        bodyMarkdown: post.bodyMarkdown,
        language: post.language,
        status: post.status as "draft" | "published",
        seoTitle: post.seoTitle,
        seoDescription: post.seoDescription,
        attributionName: post.attributionName,
        attributionFramework: post.attributionFramework,
        attributionUrl: post.attributionUrl,
        ogImagePath: post.ogImagePath,
      }}
    />
  );
}
