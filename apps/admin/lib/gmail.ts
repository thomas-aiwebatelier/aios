/**
 * gmail.ts — Gmail API wrapper for AI Web Atelier outreach pipeline.
 *
 * Uses OAuth2 with a long-lived refresh token stored in .env.
 *
 * SECURITY NOTE: The refresh token is stored in .env (plaintext on disk) for
 * the spine phase. Production hardening (encrypt-at-rest in DB, per-user
 * credential vault) is deferred to post-spine as documented in spec §11.6b.
 * For now, .env is gitignored and the token only ever leaves this module via
 * the googleapis library over TLS.
 *
 * Exports:
 *   sendEmail    — RFC2822 → base64url → users.messages.send
 *   createDraft  — users.drafts.create (useful for smoke-test pattern)
 *   deleteDraft  — users.drafts.delete (cancel-before-30s safety net stub)
 */

import { google } from "googleapis";
import { logger } from "./logger.js";

// ── Gmail client singleton ─────────────────────────────────────────────────────

type GmailClient = ReturnType<typeof google.gmail>;
let _client: GmailClient | null = null;

function getGmailClient(): GmailClient {
  if (_client) return _client;

  const {
    GMAIL_OAUTH_CLIENT_ID,
    GMAIL_OAUTH_CLIENT_SECRET,
    GMAIL_OAUTH_REFRESH_TOKEN,
  } = process.env;

  if (!GMAIL_OAUTH_CLIENT_ID || !GMAIL_OAUTH_CLIENT_SECRET || !GMAIL_OAUTH_REFRESH_TOKEN) {
    throw new Error(
      "[gmail] GMAIL_OAUTH_CLIENT_ID / GMAIL_OAUTH_CLIENT_SECRET / GMAIL_OAUTH_REFRESH_TOKEN " +
      "missing from .env — run scripts/probe/gmail-oauth.ts to obtain them.",
    );
  }

  const oauth = new google.auth.OAuth2(GMAIL_OAUTH_CLIENT_ID, GMAIL_OAUTH_CLIENT_SECRET);
  oauth.setCredentials({ refresh_token: GMAIL_OAUTH_REFRESH_TOKEN });

  _client = google.gmail({ version: "v1", auth: oauth });
  logger.info("[gmail] Gmail API client initialised");
  return _client;
}

// ── RFC2822 builder ────────────────────────────────────────────────────────────

/**
 * Build a raw RFC2822 message and base64url-encode it for the Gmail API.
 * Subject is UTF-8 encoded per RFC2047 Q-encoding so accents survive.
 */
function buildRaw(opts: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
  inReplyTo?: string;
}): string {
  const subjectEncoded = `=?UTF-8?B?${Buffer.from(opts.subject, "utf8").toString("base64")}?=`;

  const headers: string[] = [
    `From: AI Web Atelier <thomas@aiwebatelier.com>`,
    `To: ${opts.to}`,
    `Subject: ${subjectEncoded}`,
    `Content-Type: text/plain; charset=utf-8`,
    `MIME-Version: 1.0`,
  ];

  if (opts.inReplyTo) {
    headers.push(`In-Reply-To: ${opts.inReplyTo}`);
    headers.push(`References: ${opts.inReplyTo}`);
  }

  const rfc = headers.join("\r\n") + "\r\n\r\n" + opts.body;

  return Buffer.from(rfc, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface SendEmailArgs {
  to: string;
  subject: string;
  body: string;
  /** If provided, appends the message to this Gmail thread (reply). */
  threadId?: string;
}

export interface SendEmailResult {
  messageId: string;
  threadId: string;
}

/**
 * Send an email via the Gmail API.
 *
 * If `threadId` is provided the message is appended to the existing thread
 * (used by Task 4.7 reply). For new outreach messages, omit threadId.
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const gmail = getGmailClient();
  const raw = buildRaw({ to: args.to, subject: args.subject, body: args.body });

  logger.info("[gmail] sending email", { to: args.to, subject: args.subject });

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      ...(args.threadId ? { threadId: args.threadId } : {}),
    },
  });

  const messageId = res.data.id;
  const threadId = res.data.threadId;

  if (!messageId || !threadId) {
    throw new Error(`[gmail] send returned no id/threadId: ${JSON.stringify(res.data)}`);
  }

  logger.info("[gmail] email sent", { messageId, threadId });
  return { messageId, threadId };
}

export interface CreateDraftArgs {
  to: string;
  subject: string;
  body: string;
}

export interface CreateDraftResult {
  draftId: string;
  messageId: string;
}

/**
 * Create a Gmail draft (used by the smoke-test pattern; the live composer
 * uses sendEmail + 30s undo timer, not draft-first).
 */
export async function createDraft(args: CreateDraftArgs): Promise<CreateDraftResult> {
  const gmail = getGmailClient();
  const raw = buildRaw({ to: args.to, subject: args.subject, body: args.body });

  const res = await gmail.users.drafts.create({
    userId: "me",
    requestBody: { message: { raw } },
  });

  const draftId = res.data.id;
  const messageId = res.data.message?.id;

  if (!draftId || !messageId) {
    throw new Error(`[gmail] createDraft returned no id: ${JSON.stringify(res.data)}`);
  }

  logger.info("[gmail] draft created", { draftId, messageId });
  return { draftId, messageId };
}

/**
 * Delete a Gmail draft. Useful if we switch to a draft-first send pattern
 * in a future iteration. Currently unused by the spine (we use timer + job
 * cancel instead).
 */
export async function deleteDraft(draftId: string): Promise<void> {
  const gmail = getGmailClient();
  await gmail.users.drafts.delete({ userId: "me", id: draftId });
  logger.info("[gmail] draft deleted", { draftId });
}

// ── Thread read (Migration Plan B — reply-poll) ───────────────────────────────

export interface GmailThreadMessage {
  id: string;
  /** Gmail-internal sender header (e.g. "Owner <owner@example.com>"). */
  from: string | null;
  /** Plain-text body if available, otherwise empty string. */
  body: string;
  /** Epoch ms from Gmail's internalDate field, or null if unavailable. */
  internalDate: number | null;
}

export interface GmailThread {
  id: string;
  messages: GmailThreadMessage[];
}

function extractHeader(headers: Array<{ name?: string | null; value?: string | null }> | undefined, name: string): string | null {
  if (!headers) return null;
  const lower = name.toLowerCase();
  for (const h of headers) {
    if (h.name?.toLowerCase() === lower) return h.value ?? null;
  }
  return null;
}

function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function extractPlainBody(payload: { mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown }): string {
  // Top-level text/plain
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  // Walk parts depth-first looking for the first text/plain leaf
  const parts = (payload as { parts?: Array<{ mimeType?: string | null; body?: { data?: string | null } | null; parts?: unknown }> }).parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const found = extractPlainBody(part);
      if (found) return found;
    }
  }
  return "";
}

/**
 * Fetch a Gmail thread by id and return a flat list of its messages.
 * Used by the reply-poll worker to count messages and pull reply bodies.
 */
export async function getThread(threadId: string): Promise<GmailThread> {
  const gmail = getGmailClient();
  const res = await gmail.users.threads.get({
    userId: "me",
    id: threadId,
    format: "full",
  });

  const messages = (res.data.messages ?? []).map((m): GmailThreadMessage => ({
    id: m.id ?? "",
    from: extractHeader(m.payload?.headers ?? undefined, "From"),
    body: m.payload ? extractPlainBody(m.payload) : "",
    internalDate: m.internalDate ? Number(m.internalDate) : null,
  }));

  return { id: res.data.id ?? threadId, messages };
}

/** The From-header value used for outbound messages. Used by reply-poll to
 *  filter out our own replies on a thread. Kept in sync with buildRaw above. */
export const SENDER_ADDRESS = "thomas@aiwebatelier.com";
