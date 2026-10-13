import type { Metadata, Viewport } from "next";
import "./globals.css";
import Analytics from "@/components/Analytics";
import { getPublicSettings, getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f7f8fc" };

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const title = s.seo.title || `${s.siteName} — Electronics & Gadgets`;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
    title: { default: title, template: `%s | ${s.siteName}` },
    description: s.seo.description,
    keywords: s.seo.keywords ? s.seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    icons: {
      icon: s.favicon || "/favicon.svg",
      shortcut: s.favicon || "/favicon.svg",
      apple: s.favicon || "/favicon.svg"
    },
    openGraph: { title, description: s.seo.description, type: "website", siteName: s.siteName, locale: "bn_BD", images: s.seo.ogImage ? [s.seo.ogImage] : undefined },
    twitter: { card: "summary_large_image", title, description: s.seo.description },
    robots: { index: true, follow: true }
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const s = await getPublicSettings();
  return (
    <html lang="bn">
      <body>
        <Analytics tracking={{ metaPixelId: s.tracking.metaPixelId, ga4Id: s.tracking.ga4Id, gtmId: s.tracking.gtmId }} />
        {children}
      </body>
    </html>
  );
}
