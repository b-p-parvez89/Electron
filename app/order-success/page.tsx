"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Shell from "@/components/ShellClient";
import { trackEvent } from "@/lib/client";
import { money } from "@/lib/format";

function Inner() {
  const sp = useSearchParams();
  const order = sp.get("order") || "";
  const [info, setInfo] = useState<{ orderNumber: string; total: number; eventId?: string; phone?: string; gateway?: string } | null>(null);
  useEffect(() => {
    try {
      const o = JSON.parse(sessionStorage.getItem("electron_last_order") || "null");
      if (o && o.orderNumber === order) {
        setInfo(o);
        // browser half of Purchase; the server sends the same event_id via Conversions API (de-duplicated)
        if (o.gateway !== "manual" && !sessionStorage.getItem("electron_purchase_" + o.orderNumber)) {
          sessionStorage.setItem("electron_purchase_" + o.orderNumber, "1");
          trackEvent("Purchase", { value: o.total, orderId: o.orderNumber, eventId: o.eventId });
        }
      }
    } catch {}
  }, [order]);
  return (
    <main className="container page" style={{ maxWidth: 640 }}>
      <section className="panel" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 56 }}>🎉</div>
        <h1 style={{ fontSize: 30, margin: "10px 0" }}>অর্ডার সফল হয়েছে!</h1>
        <p className="muted">ধন্যবাদ। আমাদের টিম শীঘ্রই আপনার সাথে যোগাযোগ করে অর্ডার কনফার্ম করবে।</p>
        <div className="panel" style={{ margin: "20px 0", background: "#08122a" }}>
          <div className="muted" style={{ fontSize: 12 }}>আপনার অর্ডার নম্বর</div>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1, color: "#54eaff" }}>{order}</div>
          {info && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>মোট: {money(info.total)}</div>}
        </div>
        {info?.gateway === "manual" && <div className="notice info" style={{ marginBottom: 14 }}>আপনার ট্রানজেকশন আইডি যাচাই করা হচ্ছে। যাচাই শেষে অর্ডার কনফার্ম হবে।</div>}
        <p className="muted" style={{ fontSize: 12 }}>অর্ডার ট্র্যাক করতে অর্ডার নম্বর ও আপনার মোবাইল নম্বর ব্যবহার করুন।</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 14 }}>
          <Link className="btn" href={`/track?order=${encodeURIComponent(order)}${info?.phone ? "&phone=" + info.phone : ""}`}>অর্ডার ট্র্যাক করুন</Link><Link className="btn secondary" href="/shop">আরও কিনুন</Link>
        </div>
      </section>
    </main>
  );
}
export default function OrderSuccess() { return <Shell><Suspense fallback={null}><Inner /></Suspense></Shell>; }
