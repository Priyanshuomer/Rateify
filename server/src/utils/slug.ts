import { randomBytes } from "crypto";

export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 60);
  return `${base || "store"}-${randomBytes(3).toString("hex")}`;
}