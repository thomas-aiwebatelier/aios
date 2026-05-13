/**
 * research-contact.ts — Task 3.3: Contact enrichment.
 *
 * Crawls up to 5 pages on the lead's website to collect mailto: and tel:
 * links, then cross-references with Maps data already on the lead row.
 * Updates leads.email and leads.phone per spec §11.2b (Maps wins on conflict).
 *
 * Called by research.ts orchestrator.
 */

import { eq } from "drizzle-orm";
import { leads } from "@atelier/db";
import type { Db } from "@atelier/db";
import { getBrowser } from "../lib/playwright-pool.js";
import { logger } from "../lib/logger.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extract hostname from an email address. Returns null for invalid input. */
function emailDomain(email: string): string | null {
  const idx = email.indexOf("@");
  if (idx === -1) return null;
  return email.slice(idx + 1).toLowerCase();
}

/** Is this email from a free webmail provider? */
function isFreeEmail(email: string): boolean {
  const domain = emailDomain(email) ?? "";
  return ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "live.com"].includes(domain);
}

/** Prefer business-domain email over free-email; dedup. */
function pickBestEmail(emails: string[], websiteUrl: string | null): string | null {
  if (emails.length === 0) return null;
  if (emails.length === 1) return emails[0];

  // Try to derive the business domain from the website URL
  let bizDomain: string | null = null;
  if (websiteUrl) {
    try {
      bizDomain = new URL(websiteUrl).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
      // ignore
    }
  }

  // Prefer email whose domain matches the website domain
  if (bizDomain) {
    const domainMatch = emails.find((e) => emailDomain(e) === bizDomain);
    if (domainMatch) return domainMatch;
  }

  // Prefer non-free-email over free
  const biz = emails.find((e) => !isFreeEmail(e));
  return biz ?? emails[0];
}

/** Normalize a tel: href to a standard format. */
function normalizeTel(tel: string): string {
  return tel.replace(/^tel:/i, "").replace(/\s/g, "");
}

/** True if the two phone strings are plausibly the same number. */
function phonesMatch(a: string, b: string): boolean {
  const clean = (s: string) => s.replace(/[\s\-().+]/g, "");
  return clean(a) === clean(b);
}

// ── Contact page discovery ────────────────────────────────────────────────────

/** Heuristic: does this URL look like a contact/about/over page? */
function isContactPage(url: string): boolean {
  const lower = url.toLowerCase();
  return ["contact", "about", "over", "apropos", "reach"].some((kw) =>
    lower.includes(kw),
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function enrichContact(
  db: Db,
  leadId: string,
  websiteUrl: string | null,
): Promise<void> {
  logger.info("[research-contact] starting", { leadId, websiteUrl });

  if (!websiteUrl) {
    logger.info("[research-contact] no website — skipping contact enrichment", { leadId });
    return;
  }

  // Load current lead data (phone may already be set from Maps)
  const lead = db.select({ phone: leads.phone, email: leads.email })
    .from(leads)
    .where(eq(leads.id, leadId))
    .get();

  if (!lead) {
    logger.warn("[research-contact] lead not found", { leadId });
    return;
  }

  const mapsPhone = lead.phone;

  const browser = await getBrowser();

  // Collect emails and phones from up to 5 pages
  const collectedEmails = new Set<string>();
  const collectedPhones = new Set<string>();

  // Discover candidate pages: home + contact/about pages from nav links
  let pagesToVisit: string[] = [websiteUrl];

  try {
    // Quick scan of home page links for contact/about pages
    const homeCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const homePage = await homeCtx.newPage();
    try {
      await homePage.goto(websiteUrl, { timeout: 20_000, waitUntil: "domcontentloaded" });
      const origin = new URL(websiteUrl).origin;
      const hrefs = await homePage.evaluate(() =>
        Array.from(document.querySelectorAll("a[href]")).map(
          (a) => (a as HTMLAnchorElement).href,
        ),
      );
      const contactPages = hrefs.filter((h) => {
        try {
          return new URL(h).origin === origin && isContactPage(h);
        } catch {
          return false;
        }
      });
      pagesToVisit = [...new Set([websiteUrl, ...contactPages])].slice(0, 5);
    } catch (err) {
      logger.warn("[research-contact] home scan failed", { error: String(err) });
    } finally {
      await homeCtx.close();
    }
  } catch (err) {
    logger.warn("[research-contact] browser context error", { error: String(err) });
  }

  // Crawl each page for mailto/tel links
  for (const pageUrl of pagesToVisit) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    try {
      await page.goto(pageUrl, { timeout: 20_000, waitUntil: "domcontentloaded" });
      const contacts = await page.evaluate(() => {
        const emails: string[] = [];
        const phones: string[] = [];
        document.querySelectorAll("a[href]").forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          if (href.startsWith("mailto:")) {
            const email = href.slice(7).split("?")[0].trim().toLowerCase();
            if (email) emails.push(email);
          } else if (href.startsWith("tel:")) {
            phones.push(href);
          }
        });
        return { emails, phones };
      });
      contacts.emails.forEach((e) => collectedEmails.add(e));
      contacts.phones.forEach((p) => collectedPhones.add(normalizeTel(p)));
    } catch (err) {
      logger.warn("[research-contact] page crawl failed", { pageUrl, error: String(err) });
    } finally {
      await ctx.close();
    }
  }

  // ── Email resolution ───────────────────────────────────────────────────────
  const emails = [...collectedEmails];
  const bestEmail = pickBestEmail(emails, websiteUrl);

  // ── Phone resolution (Maps wins per spec §11.2b) ───────────────────────────
  let resolvedPhone: string | null = null;
  const sitePhones = [...collectedPhones];

  if (mapsPhone) {
    // Maps wins — keep it unless site has extra data
    resolvedPhone = mapsPhone;
    const siteHasDifferent = sitePhones.some((p) => !phonesMatch(p, mapsPhone));
    if (siteHasDifferent) {
      logger.info("[research-contact] Maps phone and site disagree — Maps wins", {
        leadId,
        mapsPhone,
        sitePhones,
      });
    }
  } else if (sitePhones.length > 0) {
    // Maps had nothing — use site phone
    resolvedPhone = sitePhones[0];
  }

  // Update lead row
  const updates: Partial<typeof leads.$inferInsert> = {};
  if (bestEmail) updates.email = bestEmail;
  if (resolvedPhone && !mapsPhone) updates.phone = resolvedPhone;

  if (Object.keys(updates).length > 0) {
    db.update(leads).set(updates).where(eq(leads.id, leadId)).run();
    logger.info("[research-contact] lead updated", { leadId, ...updates });
  } else {
    logger.info("[research-contact] no new contact data found", { leadId });
  }
}
