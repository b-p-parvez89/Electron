"use client";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackEvent } from "@/lib/client";

type T = { metaPixelId?: string; ga4Id?: string; gtmId?: string };
const ok = (v?: string) => !!v && /^[A-Za-z0-9_-]{4,40}$/.test(v);

/** Loads Meta Pixel / GA4 / GTM from IDs configured in the admin panel and fires PageView on every route change. */
export default function Analytics({ tracking }: { tracking: T }) {
  const pathname = usePathname();
  useEffect(() => { if (pathname && !pathname.startsWith("/admin")) trackEvent("PageView"); }, [pathname]);
  if (pathname?.startsWith("/admin")) return null;
  const pixel = ok(tracking.metaPixelId) ? tracking.metaPixelId : "";
  const ga = ok(tracking.ga4Id) ? tracking.ga4Id : "";
  const gtm = ok(tracking.gtmId) ? tracking.gtmId : "";
  return (
    <>
      {gtm && (
        <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
      )}
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${ga}',{send_page_view:false});`}</Script>
        </>
      )}
      {pixel && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');`}</Script>
      )}
    </>
  );
}
