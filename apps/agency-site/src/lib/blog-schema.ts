/**
 * Local copy of the blog_posts schema (mirrors packages/db/src/schema.ts).
 *
 * Why duplicate: agency-site deploys to Firebase App Hosting, whose generic
 * Node.js launcher runs `pnpm install` at container startup. That fails on
 * `workspace:^` deps because packages/db isn't shipped in the runtime image
 * (only the rootDir's contents are). Admin escapes this via the Next.js
 * Firebase adapter, which bypasses pnpm at launch — Astro has no such
 * adapter, so we drop the workspace dep here.
 *
 * agency-site only READS this one table; admin owns writes + migrations.
 * Schema drift is constrained to: if you change blog_posts in packages/db,
 * mirror the change here.
 */

import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const blogPostStatusValues = ["draft", "published"] as const;
export type BlogPostStatus = (typeof blogPostStatusValues)[number];

export type BlogDiagram = {
  slug: string;
  alt: string;
  svgPath: string;
};

export const blogPosts = pgTable("blog_posts", {
  id:                    text("id").primaryKey(),
  slug:                  text("slug").notNull().unique(),
  title:                 text("title").notNull(),
  excerpt:               text("excerpt"),
  bodyMarkdown:          text("body_markdown").notNull(),
  language:              text("language").notNull().default("nl-BE"),
  status:                text("status").$type<BlogPostStatus>().notNull().default("draft"),
  publishedAt:           timestamp("published_at", { withTimezone: true, mode: "date" }),
  seoTitle:              text("seo_title"),
  seoDescription:        text("seo_description"),
  ogImagePath:           text("og_image_path"),
  attributionName:       text("attribution_name"),
  attributionFramework:  text("attribution_framework"),
  attributionUrl:        text("attribution_url"),
  diagrams:              jsonb("diagrams").$type<BlogDiagram[]>(),
  createdAt:             timestamp("created_at", { withTimezone: true, mode: "date" }).defaultNow().notNull(),
  updatedAt:             timestamp("updated_at", { withTimezone: true, mode: "date" }).defaultNow().notNull().$onUpdateFn(() => new Date()),
  authorId:              text("author_id"),
});

export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
