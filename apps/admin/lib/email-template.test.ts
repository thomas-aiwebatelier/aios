import { describe, it, expect } from "vitest";
import {
  buildObservation,
  interpolate,
  buildTemplateVars,
  renderOutreachEmail,
  type RenderInput,
} from "./email-template.js";

function makeInput(overrides: Partial<RenderInput> = {}): RenderInput {
  return {
    lead: {
      businessName: "Bakkerij De Korenbloem",
      firstName: null,
      city: "Antwerpen",
      industryKey: "bakery-restaurant",
      existingWebsiteUrl: null,
      websiteStalenessScore: null,
      ...(overrides.lead ?? {}),
    },
    brandProfile: overrides.brandProfile ?? null,
    generatedSite: {
      cloudflarePreviewUrl: "https://preview.example.com",
      lighthouseScores: { performance: 98 },
      ...(overrides.generatedSite ?? {}),
    },
  };
}

describe("buildObservation", () => {
  it("flags a missing website", () => {
    const obs = buildObservation(makeInput({ lead: { existingWebsiteUrl: null } as RenderInput["lead"] }));
    expect(obs).toContain("nog geen eigen website");
    expect(obs).toContain("Bakkerij De Korenbloem");
  });

  it("mentions social media when no website but socials exist", () => {
    const obs = buildObservation(
      makeInput({
        lead: { existingWebsiteUrl: null } as RenderInput["lead"],
        brandProfile: { socialLinks: { instagram: "https://instagram.com/x" } },
      }),
    );
    expect(obs).toContain("social media");
  });

  it("calls out an outdated website above the staleness threshold", () => {
    const obs = buildObservation(
      makeInput({
        lead: {
          businessName: "Bakkerij De Korenbloem",
          firstName: null,
          city: "Antwerpen",
          industryKey: "bakery-restaurant",
          existingWebsiteUrl: "https://old.example.com",
          websiteStalenessScore: 80,
        },
      }),
    );
    expect(obs).toContain("verouderd");
  });

  it("uses the modernization angle for a fresh/unknown website", () => {
    const obs = buildObservation(
      makeInput({
        lead: {
          businessName: "Bakkerij De Korenbloem",
          firstName: null,
          city: "Antwerpen",
          industryKey: "bakery-restaurant",
          existingWebsiteUrl: "https://ok.example.com",
          websiteStalenessScore: 10,
        },
      }),
    );
    expect(obs).toContain("moderner");
  });

  it("never throws and always returns a non-empty string", () => {
    const obs = buildObservation(makeInput());
    expect(typeof obs).toBe("string");
    expect(obs.length).toBeGreaterThan(0);
  });
});

describe("interpolate", () => {
  it("replaces known tokens and tolerates whitespace", () => {
    expect(interpolate("Hallo {{name}} en {{ city }}", { name: "Thomas", city: "Gent" })).toBe(
      "Hallo Thomas en Gent",
    );
  });

  it("leaves unknown tokens intact", () => {
    expect(interpolate("Hallo {{name}} {{missing}}", { name: "Thomas" })).toBe(
      "Hallo Thomas {{missing}}",
    );
  });
});

describe("buildTemplateVars", () => {
  it("uses 'Beste ondernemer' when no firstName", () => {
    const vars = buildTemplateVars(makeInput(), "OBS");
    expect(vars.greeting).toBe("Beste ondernemer");
    expect(vars.observation).toBe("OBS");
    expect(vars.performance).toBe("98");
  });

  it("greets by first name when present", () => {
    const vars = buildTemplateVars(
      makeInput({ lead: { firstName: "Jan" } as RenderInput["lead"] }),
      "OBS",
    );
    expect(vars.greeting).toBe("Beste Jan");
  });

  it("falls back to em-dash performance when no lighthouse score", () => {
    const vars = buildTemplateVars(
      makeInput({ generatedSite: { cloudflarePreviewUrl: "x", lighthouseScores: null } }),
      "OBS",
    );
    expect(vars.performance).toBe("—");
  });
});

describe("per-angle templates", () => {
  it("breakup subject differs and signals closing", async () => {
    const out = await renderOutreachEmail(makeInput(), "breakup");
    expect(out.subject).toContain("Laatste");
  });
  it("social_proof differs from reveal", async () => {
    const reveal = await renderOutreachEmail(makeInput(), "reveal");
    const sp = await renderOutreachEmail(makeInput(), "social_proof");
    expect(sp.body).not.toBe(reveal.body);
  });
});
