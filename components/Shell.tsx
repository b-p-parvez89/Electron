import Link from "next/link";
import CartLink from "@/components/CartLink";
import ChatWidget from "@/components/ChatWidget";
import { getSettings } from "@/lib/settings";

/** Server-rendered storefront shell (header, announcement bar, footer). */
export default async function Shell({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const name = s.siteName || "ELECTRON";
  return (
    <div className="storefront-shell">
    {s.announcement && <div className="announce">{s.announcement}</div>}
      <header className="topbar"><div className="container nav">
        <Link href="/" className="logo">{s.logo ? <img src={s.logo} alt={name} height={36} style={{ height: 36, width: "auto" }} /> : <>{name.slice(0, -2)}<span>{name.slice(-2)}</span></>}</Link>
        <nav className="navlinks"><Link href="/shop">সব পণ্য</Link><Link href="/#categories">ক্যাটাগরি</Link><Link href="/track">অর্ডার ট্র্যাক</Link><Link href="/pages/contact">যোগাযোগ</Link></nav>
        <CartLink />
      </div></header>
      {children}
      <footer className="footer-wrap"><div className="container footer">
        <span>© {new Date().getFullYear()} {name} · {s.tagline}</span>
        <span>
          <Link href="/pages/about">আমাদের সম্পর্কে</Link> · <Link href="/pages/shipping">ডেলিভারি</Link> · <Link href="/pages/returns">রিটার্ন</Link> · <Link href="/pages/privacy">প্রাইভেসি</Link> · <Link href="/pages/terms">শর্তাবলি</Link>
          {s.phone ? <> · 📞 {s.phone}</> : null}
          {s.social.facebook ? <> · <a href={s.social.facebook} target="_blank" rel="noopener noreferrer">Facebook</a></> : null}
          {s.social.instagram ? <> · <a href={s.social.instagram} target="_blank" rel="noopener noreferrer">Instagram</a></> : null}
        </span>
      </div>    </footer>
    {s.whatsapp && <a href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" style={{ position: "fixed", right: 16, bottom: 16, zIndex: 20, background: "#25d366", color: "#fff", width: 52, height: 52, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 26, boxShadow: "0 6px 20px #0008" }}>💬</a>}
    <ChatWidget />
    </div>
  );
}
