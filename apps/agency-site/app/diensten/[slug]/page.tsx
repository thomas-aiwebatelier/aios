import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import ServicePage from "@/components/ServicePage";
import { getService, serviceSlugs } from "@/app/diensten/content";

const siteUrl = "https://aiwebatelier.com";

export function generateStaticParams() {
  return serviceSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};

  const url = `/diensten/${service.slug}`;
  return {
    title: service.seoTitle,
    description: service.seoDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: service.seoTitle,
      description: service.seoDescription,
    },
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.title,
    description: service.seoDescription,
    serviceType: service.navTitle,
    url: `${siteUrl}/diensten/${service.slug}`,
    provider: {
      "@type": "Organization",
      name: "AI Web Atelier",
      url: siteUrl,
    },
    areaServed: { "@type": "Country", name: "België" },
  };

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Nav />
      <ServicePage service={service} />
      <Footer />
    </>
  );
}
