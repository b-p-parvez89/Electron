import Link from "next/link";
import Shell from "@/components/Shell";

const MSG: Record<string, { t: string; d: string; icon: string }> = {
  failed: { icon: "⚠️", t: "পেমেন্ট সম্পন্ন হয়নি", d: "আপনার অর্ডারটি বাতিল হয়েছে এবং স্টক ফিরিয়ে দেওয়া হয়েছে। চাইলে আবার অর্ডার করতে পারেন।" },
  cancelled: { icon: "↩️", t: "পেমেন্ট বাতিল করা হয়েছে", d: "আপনি পেমেন্ট বাতিল করেছেন। কোনো টাকা কাটা হয়নি।" },
  pending: { icon: "⏳", t: "পেমেন্ট যাচাই চলছে", d: "গেটওয়ে থেকে নিশ্চিতকরণ পাওয়ার অপেক্ষায় আছি। কয়েক মিনিট পর অর্ডার ট্র্যাক পেজে স্ট্যাটাস দেখুন। টাকা কাটা হলে অর্ডার নিজে থেকেই কনফার্ম হবে।" }
};
export const dynamic = "force-dynamic";
export default function PaymentResult({ searchParams }: { searchParams: { status?: string; order?: string } }) {
  const m = MSG[searchParams.status || ""] || { icon: "ℹ️", t: "পেমেন্ট স্ট্যাটাস", d: "অর্ডার ট্র্যাক পেজ থেকে সর্বশেষ অবস্থা দেখুন।" };
  const order = (searchParams.order || "").slice(0, 60);
  return (
    <Shell><main className="container page" style={{ maxWidth: 640 }}><section className="panel" style={{ textAlign: "center" }}>
      <div style={{ fontSize: 52 }}>{m.icon}</div><h1 style={{ fontSize: 28, margin: "10px 0" }}>{m.t}</h1><p className="muted" style={{ lineHeight: 1.8 }}>{m.d}</p>
      {order && <p className="muted" style={{ fontSize: 12 }}>অর্ডার নম্বর: <b style={{ color: "#54eaff" }}>{order}</b></p>}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}><Link className="btn" href={order ? `/track?order=${encodeURIComponent(order)}` : "/track"}>অর্ডার ট্র্যাক করুন</Link><Link className="btn secondary" href="/shop">শপে ফিরুন</Link></div>
    </section></main></Shell>
  );
}
