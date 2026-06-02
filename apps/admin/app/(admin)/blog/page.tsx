import Link from "next/link";
import { getDb } from "@/lib/db";
import { blogPosts } from "@atelier/db";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "published"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : "bg-stone-100 text-stone-600 border border-stone-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

export default async function BlogListPage() {
  const db = getDb();
  const posts = await db
    .select()
    .from(blogPosts)
    .orderBy(desc(blogPosts.updatedAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Blog</h1>
          <p className="text-stone-500 text-sm mt-1">
            {posts.length} post{posts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/blog/new"
          className="inline-flex items-center px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + New post
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="border border-stone-200 rounded-lg p-12 text-center">
          <p className="text-stone-400 text-sm">
            No posts yet. Create the first one.
          </p>
        </div>
      ) : (
        <div className="border border-stone-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-500 uppercase tracking-wide">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/blog/${p.slug}/edit`}
                      className="font-medium text-stone-900 hover:text-indigo-700 hover:underline"
                    >
                      {p.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-stone-400">
                    {p.slug}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {p.updatedAt?.toLocaleDateString("nl-BE")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
