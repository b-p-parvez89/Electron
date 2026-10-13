"use client";
import { useState } from "react";
import { api, Field, useToast } from "./ui";

export default function Account({ email, onEmailChange }: { email: string; onEmailChange: (email: string) => void }) {
  const toast = useToast();
  const [nextEmail, setNextEmail] = useState(email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentPassword) { toast("বর্তমান পাসওয়ার্ড লিখুন।", true); return; }
    if (newPassword && newPassword !== confirmPassword) { toast("নতুন পাসওয়ার্ড দুটি মেলেনি।", true); return; }
    if (nextEmail.toLowerCase() === email.toLowerCase() && !newPassword) { toast("ইমেইল বা নতুন পাসওয়ার্ডে পরিবর্তন দিন।", true); return; }
    setBusy(true);
    try {
      const result = await api<{ user: { email: string } }>("/api/auth/account", "PUT", {
        currentPassword,
        ...(nextEmail.toLowerCase() !== email.toLowerCase() ? { email: nextEmail } : {}),
        ...(newPassword ? { newPassword } : {})
      });
      onEmailChange(result.user.email);
      setNextEmail(result.user.email);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("অ্যাকাউন্ট আপডেট হয়েছে।");
    } catch (error) {
      toast(error instanceof Error ? error.message : "অ্যাকাউন্ট আপডেট করা যায়নি।", true);
    } finally {
      setBusy(false);
    }
  }

  return <div style={{ maxWidth: 720 }}>
    <section className="panel form">
      <h2 style={{ margin: 0 }}>Admin লগইন তথ্য</h2>
      <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>ইমেইল বা পাসওয়ার্ড বদলাতে বর্তমান পাসওয়ার্ড দিতে হবে। পাসওয়ার্ড বদলালে এই browser ছাড়া অন্য সব login session বাতিল হবে।</p>
      <form className="form" onSubmit={submit}>
        <Field label="নতুন ইমেইল"><input type="email" required maxLength={180} autoComplete="email" value={nextEmail} onChange={(event) => setNextEmail(event.target.value)} /></Field>
        <Field label="বর্তমান পাসওয়ার্ড"><input type="password" required maxLength={100} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /></Field>
        <div className="row2">
          <Field label="নতুন পাসওয়ার্ড (শুধু বদলাতে চাইলে)"><input type="password" minLength={10} maxLength={100} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="কমপক্ষে ১০ অক্ষর" /></Field>
          <Field label="নতুন পাসওয়ার্ড নিশ্চিত করুন"><input type="password" minLength={10} maxLength={100} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></Field>
        </div>
        <button className="btn" disabled={busy}>{busy ? "আপডেট হচ্ছে…" : "অ্যাকাউন্ট আপডেট করুন"}</button>
      </form>
    </section>
  </div>;
}
