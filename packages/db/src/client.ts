import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import * as schema from "./schema.js";

export function createDb(path: string) {
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("synchronous = NORMAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

/**
 * Create all tables in the given database instance.
 * Used for in-memory test databases and migrate.ts startup.
 * For production, prefer the drizzle-kit migration workflow.
 */
export function createSchema(db: Db) {
  db.run(sql`CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL,
    business_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT NOT NULL,
    postal_code TEXT,
    google_maps_place_id TEXT UNIQUE,
    google_maps_url TEXT,
    existing_website_url TEXT,
    website_staleness_score INTEGER,
    industry_key TEXT NOT NULL,
    industry_classification_confidence REAL,
    language TEXT DEFAULT 'nl',
    created_at INTEGER,
    updated_at INTEGER,
    approved_at INTEGER,
    sent_at INTEGER,
    responded_at INTEGER
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS brand_profiles (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    logo_path TEXT,
    extracted_palette TEXT,
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT,
    fonts_detected TEXT,
    tone_of_voice_summary TEXT,
    social_links TEXT
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS site_inventories (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    crawled_at INTEGER,
    pages TEXT,
    assets TEXT
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS competitors (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    competitor_url TEXT NOT NULL,
    competitor_name TEXT,
    selection_reason TEXT,
    structure_summary TEXT,
    learnings TEXT
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS generated_sites (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    astro_project_path TEXT,
    cloudflare_project_name TEXT,
    cloudflare_preview_url TEXT,
    cloudflare_deployment_id TEXT,
    lighthouse_scores TEXT,
    design_system_version TEXT,
    industry_guide_version TEXT,
    created_at INTEGER,
    created_via TEXT NOT NULL,
    prompt_used TEXT
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS outreach_messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    gmail_thread_id TEXT,
    gmail_message_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    sent_at INTEGER
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS pipeline_jobs (
    id TEXT PRIMARY KEY,
    lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
    pipeline_step TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    started_at INTEGER,
    finished_at INTEGER,
    error_message TEXT,
    payload TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_heartbeat_at INTEGER,
    created_at INTEGER
  )`);

  db.run(sql`CREATE TABLE IF NOT EXISTS inbound_inquiries (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    message TEXT,
    created_at INTEGER,
    status TEXT NOT NULL DEFAULT 'new'
  )`);
}
