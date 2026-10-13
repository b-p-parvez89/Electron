import Link from "next/link";
import Shell from "@/components/Shell";
export default function NotFound() {
  return <Shell><main className="container page" style={{ textAlign: "center" }}><div style={{ fontSize: 64 }}>🔌</div><h1>পেজটি পাওয়া যায়নি</h1><p className="muted">লিংকটি ভুল অথবা পণ্যটি আর নেই।</p><Link className="btn" href="/shop">শপে যান</Link></main></Shell>;
}
