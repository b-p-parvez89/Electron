"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import CartLink from "@/components/CartLink";

type Site = { siteName: string; phone: string; announcement?: string; logo?: string };
/** Lightweight shell for client-rendered pages (cart / checkout / track): same look, minimal data. */
export default function ShellClient({ children }: { children: React.ReactNode }) {
  const [site, setSite] = useState<Site | null>(null);
  useEffect(() => { fetch("/api/site").then((r) => r.json()).then(setSite).catch(() => {}); }, []);
  const name = site?.siteName || "ELECTRON";
  return (
    <>
      {site?.announcement && <div className="announce">{site.announcement}</div>}
      <header className="topbar">
        <div className="container nav">
          <Link href="/" className="logo">{site?.logo ? <img src={site.logo} alt={name} height={36} style={{ height: 36, width: "auto" }} /> : <>{name.slice(0, -2)}<span>{name.slice(-2)}</span></>}</Link>
          <nav className="navlinks"><Link href="/shop">সব পণ্য</Link><Link href="/track">অর্ডার ট্র্যাক</Link><Link href="/pages/contact">যোগাযোগ</Link></nav>
          <CartLink />
        </div>
      </header>
      {children}
      <footer className="footer-wrap"><div className="container footer"><span>© {new Date().getFullYear()} {name}</span><span>
        <Link href="/pages/privacy">প্রাইভেসি</Link> · <Link href="/pages/terms">শর্তাবলি</Link> · <Link href="/pages/returns">রিটার্ন</Link>{site?.phone ? <> · 📞 {site.phone}</> : null}</span></div></footer>
    </>
  );
}
