"use client";
import { useEffect, useState } from "react";
import { api, taka } from "./ui";

export default function Dashboard({ go }: { go: (t: string) => void }) {
  const [s, setS] = useState<any>(null); const [err, setErr] = useState("");
  useEffect(() => { api("/api/admin/stats").then(setS).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="notice err">{err}</div>;
  if (!s) return <p className="muted">লোড হচ্ছে…</p>;
  const max = Math.max(1, ...s.daily.map((d: any) => d.revenue));
  const St = ({ t, v, sub }: { t: string; v: string; sub?: string }) => <div className="stat"><small>{t}</small><b>{v}</b>{sub && <span>{sub}</span>}</div>;
  return (
    <>
      <div className="stats">
        <St t="আজকের বিক্রি" v={taka(s.today.revenue)} sub={`${s.today.orders}টি অর্ডার`} />
        <St t="গত ৭ দিন" v={taka(s.week.revenue)} sub={`${s.week.orders}টি অর্ডার`} />
        <St t="গত ৩০ দিন" v={taka(s.month.revenue)} sub={`${s.month.orders}টি অর্ডার`} />
        <St t="নতুন (Pending) অর্ডার" v={String(s.byStatus.pending || 0)} sub={`শিপড ${s.byStatus.shipped || 0} · ডেলিভারড ${s.byStatus.delivered || 0}`} />
      </div>
      <div className="stats">
        <button className="stat" style={{ textAlign: "left", color: "inherit" }} onClick={() => go("inventory")}><small>লো স্টক</small><b style={{ color: s.lowStock ? "#ffd27a" : undefined }}>{s.lowStock}</b></button>
        <button className="stat" style={{ textAlign: "left", color: "inherit" }} onClick={() => go("inventory")}><small>স্টক আউট</small><b style={{ color: s.outOfStock ? "#ff9bb0" : undefined }}>{s.outOfStock}</b></button>
        <button className="stat" style={{ textAlign: "left", color: "inherit" }} onClick={() => go("incomplete")}><small>ইনকমপ্লিট অর্ডার</small><b>{s.incomplete}</b></button>
        <button className="stat" style={{ textAlign: "left", color: "inherit" }} onClick={() => go("orders")}><small>পেমেন্ট ভেরিফিকেশন বাকি</small><b>{s.pendingPay}</b></button>
      </div>
      <div className="grid-2">
        <section className="panel"><h3 style={{ margin: 0 }}>গত ১৪ দিনের বিক্রি</h3>
          {s.daily.length ? <div className="bars">{s.daily.map((d: any) => <div key={d._id} style={{ height: `${Math.max(3, (d.revenue / max) * 100)}%` }} data-t={`${d._id}: ${taka(d.revenue)} (${d.orders})`} />)}</div> : <p className="muted" style={{ fontSize: 13 }}>এখনো কোনো অর্ডার নেই।</p>}
        </section>
        <section className="panel"><h3 style={{ margin: 0 }}>টপ প্রোডাক্ট (৩০ দিন)</h3>
          {s.top.length ? <table className="table"><tbody>{s.top.map((t: any) => <tr key={t._id}><td style={{ whiteSpace: "normal" }}>{t._id}</td><td>{t.qty} পিস</td><td>{taka(t.revenue)}</td></tr>)}</tbody></table> : <p className="muted" style={{ fontSize: 13 }}>ডেটা নেই।</p>}
        </section>
      </div>
    </>
  );
}
