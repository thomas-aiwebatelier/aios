import slugify from "slugify";
import { customAlphabet } from "nanoid";

const slugAlphabet = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 4);

export function generateSlug(businessName: string, city: string): string {
  const businessSlug = slugify(businessName, { lower: true, strict: true, locale: "nl" });
  const citySlug = slugify(city, { lower: true, strict: true, locale: "nl" }).slice(0, 4);
  const id = slugAlphabet();
  return `${businessSlug}-${citySlug}-${id}`;
}
