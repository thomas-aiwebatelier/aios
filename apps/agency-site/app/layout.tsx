import type { Metadata } from "next";
import "./globals.css";
import "./components.css";

const siteUrl = "https://aiwebatelier.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AI Web Atelier — Vakwerk websites, gebouwd met AI",
    template: "%s",
  },
  description:
    "Custom AI-gegenereerde websites voor Belgische ondernemers. €499 eenmalig, inclusief één herzieningsronde. Online binnen 7 dagen.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    type: "website",
    siteName: "AI Web Atelier",
    locale: "nl_BE",
    url: siteUrl,
    title: "AI Web Atelier — Vakwerk websites, gebouwd met AI",
    description:
      "Custom AI-gegenereerde websites voor Belgische ondernemers. €499 eenmalig, inclusief één herzieningsronde. Online binnen 7 dagen.",
    images: [{ url: "/og-image.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Web Atelier — Vakwerk websites, gebouwd met AI",
    description:
      "Custom AI-gegenereerde websites voor Belgische ondernemers. €499 eenmalig, inclusief één herzieningsronde. Online binnen 7 dagen.",
    images: ["/og-image.jpg"],
  },
};

const orgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AI Web Atelier",
  url: siteUrl,
  logo: `${siteUrl}/logo.svg`,
  description:
    "Custom AI-gegenereerde websites voor Belgische ondernemers. €499 eenmalig, inclusief één herzieningsronde. Online binnen 7 dagen.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Antwerpen",
    addressCountry: "BE",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "thomas@aiwebatelier.com",
    contactType: "customer service",
  },
  founder: {
    "@type": "Person",
    name: "Thomas Cortebeeck",
    jobTitle: "AI Engineer",
    worksFor: {
      "@type": "Organization",
      name: "Streamz",
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300..600&family=Hanken+Grotesk:wght@300..600&display=swap"
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
