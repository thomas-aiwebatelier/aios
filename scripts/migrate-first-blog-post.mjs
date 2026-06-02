// Migrate the first Dutch blog post markdown into the blog_posts table.
// Idempotent: re-running updates the row on slug conflict.

import fs from "node:fs/promises";
import postgres from "postgres";
import matter from "gray-matter";

const SRC = "C:/Users/ThomasCortebeeck/aiwebatelier-spec/blog/2026-06-01-een-eigen-ai-besturingssysteem-bouwen.md";

const file = await fs.readFile(SRC, "utf8");
const { data: fm, content } = matter(file);

const dbUrl =
  process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error(
    "SUPABASE_DATABASE_URL (or DATABASE_URL) not set. Source the env first."
  );
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false });

const id = crypto.randomUUID();
const now = new Date();

const diagrams = [
  { slug: "four-cs-toren",       alt: "De Vier C's als toren",                       svgPath: "/blog/diagrams/four-cs-toren.svg" },
  { slug: "drie-ms-kader",       alt: "De Drie M's als kader voor skills",            svgPath: "/blog/diagrams/drie-ms-kader.svg" },
  { slug: "productiviteits-dip", alt: "Productiviteits-dip op weg van C1 naar C4",    svgPath: "/blog/diagrams/productiviteits-dip.svg" },
  { slug: "mijn-aios-kaart",     alt: "Mijn AIOS-kaart",                              svgPath: "/blog/diagrams/mijn-aios-kaart.svg" },
];

const result = await sql`
  INSERT INTO blog_posts (
    id, slug, title, excerpt, body_markdown, language, status, published_at,
    seo_title, seo_description,
    attribution_name, attribution_framework, attribution_url,
    diagrams,
    created_at, updated_at,
    author_id
  ) VALUES (
    ${id},
    ${fm.slug},
    ${fm.title},
    ${"Een eerste lange Dutch dispatch over hoe je een eigen AI-besturingssysteem bouwt, gebaseerd op het Vier C's-kader van Nate Herk en gekalibreerd op mijn eigen stack."},
    ${content},
    ${fm.language ?? "nl-BE"},
    ${"published"},
    ${new Date(fm.date)},
    ${fm.title},
    ${null},
    ${fm.source_credit?.name ?? null},
    ${fm.source_credit?.framework ?? null},
    ${fm.source_credit?.url ?? null},
    ${sql.json(diagrams)},
    ${now},
    ${now},
    ${"thomas.cortebeeck@streamz.be"}
  )
  ON CONFLICT (slug) DO UPDATE SET
    title = EXCLUDED.title,
    excerpt = EXCLUDED.excerpt,
    body_markdown = EXCLUDED.body_markdown,
    language = EXCLUDED.language,
    status = EXCLUDED.status,
    published_at = EXCLUDED.published_at,
    seo_title = EXCLUDED.seo_title,
    attribution_name = EXCLUDED.attribution_name,
    attribution_framework = EXCLUDED.attribution_framework,
    attribution_url = EXCLUDED.attribution_url,
    diagrams = EXCLUDED.diagrams,
    updated_at = EXCLUDED.updated_at
  RETURNING id, slug, status, published_at;
`;

console.log("Migrated post:", fm.slug);
console.log(result[0]);
await sql.end();
