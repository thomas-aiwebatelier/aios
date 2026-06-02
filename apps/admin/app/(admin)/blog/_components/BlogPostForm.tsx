"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { marked } from "marked";

export interface BlogPostFormInitial {
  slug: string;
  title: string;
  excerpt: string | null;
  bodyMarkdown: string;
  language: string;
  status: "draft" | "published";
  seoTitle: string | null;
  seoDescription: string | null;
  attributionName: string | null;
  attributionFramework: string | null;
  attributionUrl: string | null;
  ogImagePath: string | null;
}

interface BlogPostFormProps {
  initial?: BlogPostFormInitial;
  mode: "new" | "edit";
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function BlogPostForm({ initial, mode }: BlogPostFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [excerpt, setExcerpt] = useState(initial?.excerpt ?? "");
  const [body, setBody] = useState(initial?.bodyMarkdown ?? "");
  const [language, setLanguage] = useState(initial?.language ?? "nl-BE");
  const [seoTitle, setSeoTitle] = useState(initial?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(initial?.seoDescription ?? "");
  const [attributionName, setAttributionName] = useState(initial?.attributionName ?? "");
  const [attributionFramework, setAttributionFramework] = useState(
    initial?.attributionFramework ?? "",
  );
  const [attributionUrl, setAttributionUrl] = useState(initial?.attributionUrl ?? "");
  const [ogImagePath, setOgImagePath] = useState(initial?.ogImagePath ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-derive slug from title if not manually touched (new posts only)
  useEffect(() => {
    if (!slugTouched && mode === "new") {
      setSlug(slugify(title));
    }
  }, [title, slugTouched, mode]);

  const preview = useMemo(() => {
    try {
      return marked.parse(body, { async: false }) as string;
    } catch {
      return "<p>(preview error)</p>";
    }
  }, [body]);

  async function save(targetStatus: "draft" | "published") {
    setSaving(true);
    setError(null);

    const payload = {
      title,
      slug,
      excerpt: excerpt || null,
      body_markdown: body,
      language,
      status: targetStatus,
      seo_title: seoTitle || null,
      seo_description: seoDescription || null,
      attribution_name: attributionName || null,
      attribution_framework: attributionFramework || null,
      attribution_url: attributionUrl || null,
      og_image_path: ogImagePath || null,
    };

    const url = mode === "new" ? "/api/blog" : `/api/blog/${initial!.slug}`;
    const method = mode === "new" ? "POST" : "PATCH";

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Network error");
      return;
    }

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({} as { error?: string }));
      setError(body.error ?? `${res.status} ${res.statusText}`);
      return;
    }

    router.push("/blog");
    router.refresh();
  }

  const canSave = !saving && title.trim() && slug.trim() && body.trim();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">
            {mode === "new" ? "New blog post" : `Edit: ${initial?.title}`}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {mode === "new" ? "Compose a new post." : "Update post content + metadata."}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save("draft")}
            disabled={!canSave}
            className="px-4 py-2 rounded border border-stone-300 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Save draft"}
          </button>
          <button
            type="button"
            onClick={() => save("published")}
            disabled={!canSave}
            className="px-4 py-2 rounded bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving…" : "Publish"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: form fields */}
        <div className="space-y-4">
          <Field label="Title">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
            />
          </Field>

          <Field label="Slug">
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className="w-full px-3 py-2 border border-stone-300 rounded font-mono text-xs"
            />
          </Field>

          <Field label="Excerpt">
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
            />
          </Field>

          <Field label="Body (Markdown)">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={24}
              className="w-full px-3 py-2 border border-stone-300 rounded font-mono text-xs"
            />
          </Field>

          <Field label="Language">
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
            />
          </Field>

          <details className="border border-stone-200 rounded p-3">
            <summary className="cursor-pointer text-sm font-medium text-stone-700">
              SEO + Attribution
            </summary>
            <div className="mt-3 space-y-3">
              <Field label="SEO title">
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
                />
              </Field>
              <Field label="SEO description">
                <textarea
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
                />
              </Field>
              <Field label="OG image path">
                <input
                  type="text"
                  value={ogImagePath}
                  onChange={(e) => setOgImagePath(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded font-mono text-xs"
                />
              </Field>
              <Field label="Attribution name">
                <input
                  type="text"
                  value={attributionName}
                  onChange={(e) => setAttributionName(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
                />
              </Field>
              <Field label="Attribution framework">
                <input
                  type="text"
                  value={attributionFramework}
                  onChange={(e) => setAttributionFramework(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
                />
              </Field>
              <Field label="Attribution URL">
                <input
                  type="url"
                  value={attributionUrl}
                  onChange={(e) => setAttributionUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded text-sm"
                />
              </Field>
            </div>
          </details>
        </div>

        {/* Right: live preview */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Live preview
          </label>
          <div
            className="border border-stone-200 rounded-lg p-6 bg-white prose prose-sm max-w-none min-h-[400px]"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
