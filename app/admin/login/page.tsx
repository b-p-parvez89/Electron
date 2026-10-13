"use client";
import { useState } from "react";
import Link from "next/link";

export default function AdminLogin() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try {
      const r = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const d = await r.json();
      if (!r.ok) { setError(d.error || "সাইন ইন ব্যর্থ"); setBusy(false); return; }
      if (d.user.role !== "admin") { await fetch("/api/auth/logout", { method: "POST" }); setError("এই অ্যাকাউন্টে অ্যাডমিন অ্যাক্সেস নেই।"); setBusy(false); return; }
      location.href = "/admin";
    } catch { setError("নেটওয়ার্ক সমস্যা"); setBusy(false); }
  }
  return (
    <main className="container page" style={{ maxWidth: 460, display: "grid", alignContent: "center", minHeight: "100vh" }}>
      <Link href="/" className="muted" style={{ fontSize: 13 }}>← দোকানে ফিরুন</Link>
      <div className="panel" style={{ marginTop: 16 }}>
        <span className="eyebrow">SECURE ADMIN AREA</span><h1 style={{ fontSize: 28, margin: "16px 0" }}>অ্যাডমিন লগইন</h1>
        <form className="form" onSubmit={submit}>
          <div className="field"><label>ইমেইল</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" /></div>
          <div className="field"><label>পাসওয়ার্ড</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" /></div>
          {error && <div className="notice err">{error}</div>}
          <button className="btn" disabled={busy}>{busy ? "যাচাই হচ্ছে…" : "ড্যাশবোর্ডে প্রবেশ করুন"}</button>
        </form>
      </div>
    </main>
  );
}
