export { activeBrands, allCategories, homeProducts } from "@/lib/catalog";
/** Server-safe copy of the Cloudinary resize helper (lib/client.ts is a client module). */
export function img(url: string | undefined, w = 600) {
  if (!url) return "";
  return url.includes("res.cloudinary.com") && url.includes("/upload/") ? url.replace("/upload/", `/upload/f_auto,q_auto,w_${w}/`) : url;
}
