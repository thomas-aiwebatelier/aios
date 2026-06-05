import type { MetadataRoute } from "next";
import { serviceSlugs } from "@/app/diensten/content";

const siteUrl = "https://aiwebatelier.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/diensten", "/blog", "/privacy", "/terms"];

  const serviceRoutes = serviceSlugs.map((slug) => `/diensten/${slug}`);

  return [...staticRoutes, ...serviceRoutes].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
