import { decrypt } from "@/lib/crypto";
import { getSettings } from "@/lib/settings";

export type SocialPlatform = "facebook" | "instagram";
export type SocialPublishResult = Record<SocialPlatform, { ok: boolean; error?: string }>;

type ShareableProduct = {
  name: string;
  slug: string;
  shortDescription?: string;
  description: string;
  images: string[];
  price: number;
};

function graphError(payload: any, fallback: string) {
  return typeof payload?.error?.message === "string" ? payload.error.message : fallback;
}

async function graphPost(url: string, body: URLSearchParams) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.error) throw new Error(graphError(result, "Meta Graph API request failed"));
  return result;
}

export async function publishProductToSocial(product: ShareableProduct, platforms: SocialPlatform[], customCaption?: string): Promise<SocialPublishResult> {
  const result: SocialPublishResult = { facebook: { ok: false }, instagram: { ok: false } };
  const settings = await getSettings();
  const { facebookPageId, instagramAccountId, apiVersion } = settings.socialPublishing;
  const accessToken = decrypt(settings.socialPublishing.pageAccessToken);
  if (!accessToken) {
    for (const platform of platforms) result[platform] = { ok: false, error: "Meta Page Access Token Admin Settings-এ সেট করা নেই।" };
    return result;
  }
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (!base || !/^https:\/\//i.test(base)) {
    for (const platform of platforms) result[platform] = { ok: false, error: "NEXT_PUBLIC_SITE_URL-এ public HTTPS domain সেট করুন।" };
    return result;
  }

  const productUrl = `${base}/products/${encodeURIComponent(product.slug)}`;
  const caption = `${(customCaption?.trim() || [product.name, product.shortDescription || product.description.slice(0, 250), `মূল্য: ৳${Math.round(product.price).toLocaleString("en-BD")}`].join("\n\n"))}\n\n${productUrl}`;
  const graphBase = `https://graph.facebook.com/${settings.socialPublishing.apiVersion || "v23.0"}`;

  for (const platform of platforms) {
    try {
      if (platform === "facebook") {
        if (!facebookPageId) throw new Error("Facebook Page ID Admin Settings-এ সেট করা নেই।");
        if (product.images?.[0]) {
          const body = new URLSearchParams({ url: product.images[0], caption, access_token: accessToken });
          await graphPost(`${graphBase}/${encodeURIComponent(facebookPageId)}/photos`, body);
        } else {
          const body = new URLSearchParams({ link: productUrl, message: caption, access_token: accessToken });
          await graphPost(`${graphBase}/${encodeURIComponent(facebookPageId)}/feed`, body);
        }
      } else {
        if (!instagramAccountId) throw new Error("Instagram Professional Account ID Admin Settings-এ সেট করা নেই।");
        if (!product.images?.[0] || !/^https:\/\//i.test(product.images[0])) {
          throw new Error("Instagram-এ পোস্ট করতে পণ্যের public HTTPS ছবি প্রয়োজন।");
        }
        const media = await graphPost(`${graphBase}/${encodeURIComponent(instagramAccountId)}/media`, new URLSearchParams({
          image_url: product.images[0], caption, access_token: accessToken
        }));
        if (typeof media.id !== "string") throw new Error("Instagram media container তৈরি হয়নি।");
        await graphPost(`${graphBase}/${encodeURIComponent(instagramAccountId)}/media_publish`, new URLSearchParams({
          creation_id: media.id, access_token: accessToken
        }));
      }
      result[platform] = { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Meta-তে পোস্ট করা যায়নি।";
      console.error(`Social product publish failed (${platform}):`, message);
      result[platform] = { ok: false, error: message };
    }
  }
  return result;
}
