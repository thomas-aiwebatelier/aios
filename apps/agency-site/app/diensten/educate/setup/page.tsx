import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getUser, getRole } from "@atelier/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import SetupQuestionnaire from "@/components/SetupQuestionnaire";

/**
 * "Gratis AI-setup" questionnaire — built, deployed, and hidden.
 *
 * Not linked from anywhere, 404s for non-admins at the edge (middleware.ts),
 * and re-checks here because middleware is a convenience, not a security
 * boundary — a route can be reached in ways the matcher does not see.
 *
 * The intent is that you can walk a client through this live on a call while
 * it stays invisible to the public site.
 */

export const metadata: Metadata = {
  title: "AI-setup — AI Web Atelier",
  robots: { index: false, follow: false, nocache: true },
};

export default async function EducateSetupPage() {
  const supabase = await createSupabaseServerClient();
  const user = await getUser(supabase);
  if (!user) notFound();

  const role = await getRole(supabase, user.id);
  if (role !== "admin") notFound();

  return (
    <>
      <Nav />
      <main className="servicepage">
        <section className="svc-hero" aria-label="Gratis AI-setup">
          <div className="container svc-hero__inner">
            <span className="section-eyebrow">Educate</span>
            <h1 className="svc-hero__title">Je gratis AI-setup</h1>
            <p className="svc-hero__lead">
              Zeven vragen over hoe je zaak vandaag draait. Op basis daarvan
              stel ik een persoonlijke AI-setup samen: waar het bij jou het
              snelst rendeert, en waar je beter van afblijft.
            </p>
          </div>
        </section>

        <section className="svc-includes" aria-label="Vragenlijst">
          <div className="container">
            <SetupQuestionnaire />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
