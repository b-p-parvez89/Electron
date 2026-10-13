"use client";
import { useState } from "react";

export default function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; error?: boolean } | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    const form = e.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।");
      form.reset();
      setResult({ text: "আপনার মেসেজটি পাঠানো হয়েছে। আমরা শিগগিরই যোগাযোগ করব।" });
    } catch (error) {
      setResult({ text: error instanceof Error ? error.message : "মেসেজ পাঠানো যায়নি। আবার চেষ্টা করুন।", error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form contact-form" onSubmit={submit}>
      <div className="contact-form-row">
        <div className="field"><label htmlFor="contact-name">আপনার নাম *</label><input id="contact-name" name="name" required minLength={2} maxLength={100} autoComplete="name" /></div>
        <div className="field"><label htmlFor="contact-phone">মোবাইল নম্বর *</label><input id="contact-phone" name="phone" required minLength={7} maxLength={25} type="tel" autoComplete="tel" /></div>
      </div>
      <div className="contact-form-row">
        <div className="field"><label htmlFor="contact-email">ইমেইল (ঐচ্ছিক)</label><input id="contact-email" name="email" type="email" maxLength={150} autoComplete="email" /></div>
        <div className="field"><label htmlFor="contact-subject">বিষয় *</label><input id="contact-subject" name="subject" required minLength={2} maxLength={120} /></div>
      </div>
      <div className="field"><label htmlFor="contact-message">আপনার মেসেজ *</label><textarea id="contact-message" name="message" required minLength={10} maxLength={3000} rows={6} placeholder="আপনার প্রশ্ন বা সমস্যাটি লিখুন..." /></div>
      <div className="contact-honeypot" aria-hidden="true"><label htmlFor="contact-company">Company</label><input id="contact-company" name="company" tabIndex={-1} autoComplete="off" /></div>
      <button className="btn" type="submit" disabled={busy}>{busy ? "পাঠানো হচ্ছে…" : "মেসেজ পাঠান →"}</button>
      {result && <p className={`contact-result${result.error ? " error" : ""}`} role="status">{result.text}</p>}
    </form>
  );
}
