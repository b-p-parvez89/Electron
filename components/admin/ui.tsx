"use client";
import { createContext, useContext, useRef, useState } from "react";

export async function api<T = any>(url: string, method = "GET", body?: unknown): Promise<T> {
  const r = await fetch(url, { method, headers: body !== undefined ? { "Content-Type": "application/json" } : undefined, body: body !== undefined ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 || (r.status === 403 && /admin/i.test(d?.error || ""))) { location.href = "/admin/login"; throw new Error("Session expired"); }
  if (!r.ok) throw new Error(d.error || "Request failed");
  return d as T;
}
export const ToastCtx = createContext<(m: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export const taka = (n: number) => "৳ " + Math.round(n || 0).toLocaleString("en-BD");
export const dt = (d?: string) => (d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={wide ? { width: "min(1000px,100%)" } : undefined} role="dialog" aria-modal="true">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}><h2>{title}</h2><button className="small-btn" onClick={onClose} aria-label="বন্ধ">✕</button></div>
        {children}
      </div>
    </div>
  );
}
export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <div className="field"><label>{label}</label>{children}{hint && <small className="muted" style={{ fontSize: 11 }}>{hint}</small>}</div>;
}
export function Badge({ v }: { v: string }) { return <span className={"status s-" + v}>{v}</span>; }

/** Upload to Cloudinary using a server-signed request (secret never reaches the browser). */
export async function uploadFile(file: File): Promise<string> {
  const sig = await api("/api/admin/upload", "POST", {});
  const fd = new FormData();
  fd.append("file", file); fd.append("api_key", sig.apiKey); fd.append("timestamp", String(sig.timestamp)); fd.append("signature", sig.signature); fd.append("folder", sig.folder);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, { method: "POST", body: fd });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "আপলোড ব্যর্থ");
  return d.secure_url as string;
}

/** Ordered list of image URLs: upload files or paste URLs; reorder with arrows (used for the gallery and 360° frames). */
export function ImageList({ value, onChange, label, hint, max = 40 }: { value: string[]; onChange: (v: string[]) => void; label: string; hint?: string; max?: number }) {
  const toast = useToast();
  const [url, setUrl] = useState(""); const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  async function files(list: FileList | null) {
    if (!list?.length) return; setBusy(true);
    try { const out: string[] = []; for (const f of Array.from(list).slice(0, max)) out.push(await uploadFile(f)); onChange([...value, ...out].slice(0, max)); }
    catch (e: any) { toast(e.message + " — অথবা URL পেস্ট করুন", true); }
    setBusy(false); if (ref.current) ref.current.value = "";
  }
  const move = (i: number, d: number) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <Field label={`${label} (${value.length})`} hint={hint}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input ref={ref} type="file" accept="image/*" multiple onChange={(e) => files(e.target.files)} style={{ flex: 1, minWidth: 160 }} disabled={busy} />
        <input placeholder="অথবা ইমেজ URL পেস্ট করুন" value={url} onChange={(e) => setUrl(e.target.value)} style={{ flex: 2, minWidth: 180 }} />
        <button type="button" className="small-btn" onClick={() => { if (url.trim()) { onChange([...value, url.trim()].slice(0, max)); setUrl(""); } }}>যোগ</button>
      </div>
      {busy && <small className="muted">আপলোড হচ্ছে…</small>}
      <div className="imgs">{value.map((u, i) => (
        <div key={u.slice(-30) + i}><img src={u} alt="" /><button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="মুছুন">×</button>
          <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 2 }}><button type="button" style={{ position: "static", width: 20, background: "#16315a" }} onClick={() => move(i, -1)}>‹</button><button type="button" style={{ position: "static", width: 20, background: "#16315a" }} onClick={() => move(i, 1)}>›</button></div></div>
      ))}</div>
    </Field>
  );
}

export function Pager({ page, pages, set }: { page: number; pages: number; set: (n: number) => void }) {
  if (pages <= 1) return null;
  return <div className="pager"><button className="small-btn" disabled={page <= 1} onClick={() => set(page - 1)}>← আগে</button><span style={{ border: 0 }}>{page} / {pages}</span><button className="small-btn" disabled={page >= pages} onClick={() => set(page + 1)}>পরে →</button></div>;
}
