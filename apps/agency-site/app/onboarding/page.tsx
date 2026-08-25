import { Suspense } from "react";
import type { Metadata } from "next";
import OnboardingFlow from "@/components/OnboardingFlow";

export const metadata: Metadata = {
  // Not a landing page — you only ever arrive here from a capture form.
  title: "Onboarding — AI Web Atelier",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Suspense fallback={null}>
          <OnboardingFlow />
        </Suspense>
      </div>
    </main>
  );
}
