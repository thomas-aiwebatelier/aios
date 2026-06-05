import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Inloggen — AI Web Atelier",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Welkom bij AI Web Atelier</h1>
        <p className="auth-sub">
          Log in of maak een account aan om je merk, je site en je marketing op
          één plek te beheren.
        </p>
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </div>
    </main>
  );
}
