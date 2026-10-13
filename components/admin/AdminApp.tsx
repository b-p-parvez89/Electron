"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ToastCtx } from "./ui";
import Dashboard from "./Dashboard";
import Orders from "./Orders";
import Products from "./Products";
import Taxonomy from "./Taxonomy";
import Inventory from "./Inventory";
import Customers from "./Customers";
import Couriers from "./Couriers";
import Gateways from "./Gateways";
import Coupons from "./Coupons";
import Incomplete from "./Incomplete";
import Settings from "./Settings";
import Messages from "./Messages";
import Chats from "./Chats";
import Account from "./Account";

const TABS: [string, string][] = [["dashboard", "📊 ড্যাশবোর্ড"], ["orders", "📋 অর্ডার"], ["chats", "💬 লাইভ চ্যাট"], ["messages", "📨 যোগাযোগ"], ["products", "🛍️ পণ্য"], ["taxonomy", "🗂️ ক্যাটাগরি ও ব্র্যান্ড"], ["inventory", "📦 ইনভেন্টরি"], ["customers", "👥 কাস্টমার"], ["incomplete", "🛒 ইনকমপ্লিট অর্ডার"], ["coupons", "🏷️ কুপন"], ["couriers", "🚚 কুরিয়ার"], ["gateways", "💳 পেমেন্ট"], ["settings", "⚙️ সেটিংস, SEO ও ট্র্যাকিং"], ["account", "👤 অ্যাকাউন্ট"]];

export default function AdminApp() {
  const [tab, setTab] = useState("dashboard"); const [user, setUser] = useState<any>(null); const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<{ m: string; err?: boolean } | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  const chatNotificationPrimed = useRef(false);
  const t = useCallback((m: string, err?: boolean) => { setToast({ m, err }); setTimeout(() => setToast(null), 3200); }, []);
  useEffect(() => { api("/api/auth/me").then((d) => { if (d.user.role !== "admin") location.href = "/"; else setUser(d.user); }).catch(() => { location.href = "/admin/login"; }); const h = location.hash.slice(1); if (TABS.some(([k]) => k === h)) setTab(h); }, []);
  useEffect(() => {
    if (!user) return;
    let active = true;
    let reportedFailure = false;
    const poll = async () => {
      try {
        const lastChecked = localStorage.getItem("electron-admin-order-notifications-since");
        const query = new URLSearchParams({ _: String(Date.now()) });
        if (lastChecked) query.set("since", lastChecked);
        const orders = await api<{ orders: { orderNumber: string; customer?: { name?: string } }[]; latestAt: string | null }>(`/api/admin/notifications?${query}`);
        if (!active) return;
        if (lastChecked && orders.orders.length) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification(`${orders.orders.length}টি নতুন অর্ডার`, {
              body: orders.orders.slice(0, 3).map((order) => `${order.orderNumber} · ${order.customer?.name || "কাস্টমার"}`).join("\n"),
              tag: "electron-new-orders"
            });
          }
          t(`${orders.orders.length}টি নতুন অর্ডার এসেছে।`);
        }
        if (orders.latestAt) localStorage.setItem("electron-admin-order-notifications-since", orders.latestAt);
        const inbox = await api<{ unreadCount: number }>(`/api/admin/messages?unread=1&_=${Date.now()}`);
        const chats = await api<{ unreadCount: number }>(`/api/admin/chats?_=${Date.now()}`);
        if (!active) return;
        setUnreadMessages(inbox.unreadCount);
        setUnreadChats(chats.unreadCount);
        if (chatNotificationPrimed.current && chats.unreadCount > unreadChats) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("কাস্টমারের নতুন চ্যাট মেসেজ", { body: `${chats.unreadCount}টি চ্যাটে রিপ্লাই অপেক্ষা করছে।`, tag: "electron-support-chat" });
          }
          t("কাস্টমারের নতুন চ্যাট মেসেজ এসেছে।");
        }
        chatNotificationPrimed.current = true;
        reportedFailure = false;
      } catch (error) {
        console.error("Admin notifications could not be refreshed:", error);
        if (!reportedFailure) t("নোটিফিকেশন আপডেট করা যায়নি।", true);
        reportedFailure = true;
      }
    };
    poll();
    const timer = window.setInterval(poll, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user, t, unreadChats]);
  async function enableAlerts() {
    if (!("Notification" in window)) { t("এই ব্রাউজারে নোটিফিকেশন সমর্থিত নয়।", true); return; }
    const permission = await Notification.requestPermission();
    setAlertsEnabled(permission === "granted");
    t(permission === "granted" ? "অর্ডার নোটিফিকেশন চালু হয়েছে।" : "ব্রাউজার নোটিফিকেশনের অনুমতি দেওয়া হয়নি।", permission !== "granted");
  }
  const go = (k: string) => { setTab(k); setOpen(false); history.replaceState(null, "", "#" + k); window.scrollTo(0, 0); };
  async function logout() { await api("/api/auth/logout", "POST", {}).catch(() => {}); location.href = "/admin/login"; }
  if (!user) return <p className="muted" style={{ padding: 40 }}>লোড হচ্ছে…</p>;
  const title = TABS.find(([k]) => k === tab)?.[1] || "";
  return (
    <ToastCtx.Provider value={t}>
      <div className="adm-top-m"><b>ELECTRON Admin</b><button className="small-btn" onClick={() => setOpen(!open)}>☰ মেনু</button></div>
      <div className="adm">
        <aside className={"adm-side" + (open ? " open" : "")}>
          <a className="logo" href="/" target="_blank" rel="noopener noreferrer">ELECTR<span>ON</span></a>
          <nav className="adm-nav">{TABS.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => go(k)}>{l}{k === "messages" && unreadMessages > 0 ? ` · ${unreadMessages}` : ""}{k === "chats" && unreadChats > 0 ? ` · ${unreadChats}` : ""}</button>)}</nav>
          <div style={{ marginTop: 20, padding: "0 10px", fontSize: 11 }} className="muted">{user.email}<br /><button className="small-btn" style={{ marginTop: 8 }} onClick={logout}>সাইন আউট</button></div>
        </aside>
        <main className="adm-main">
          <div className="adm-head"><h1>{title}</h1><div style={{ display: "flex", gap: 8, alignItems: "center" }}><button className="btn secondary sm" onClick={enableAlerts}>{alertsEnabled ? "🔔 অর্ডার অ্যালার্ট চালু" : "🔔 অর্ডার অ্যালার্ট চালু করুন"}</button><a className="btn secondary sm" href="/" target="_blank" rel="noopener noreferrer">দোকান দেখুন ↗</a></div></div>
          {tab === "dashboard" && <Dashboard go={go} />}{tab === "orders" && <Orders />}{tab === "products" && <Products />}{tab === "taxonomy" && <Taxonomy />}{tab === "inventory" && <Inventory />}
          {tab === "chats" && <Chats onUnreadChange={setUnreadChats} />}{tab === "messages" && <Messages />}{tab === "customers" && <Customers />}{tab === "incomplete" && <Incomplete />}{tab === "coupons" && <Coupons />}{tab === "couriers" && <Couriers />}{tab === "gateways" && <Gateways />}{tab === "settings" && <Settings />}
          {tab === "account" && <Account email={user.email} onEmailChange={(email) => setUser((current: any) => ({ ...current, email }))} />}
        </main>
      </div>
      {toast && <div className="toast" role="status" style={toast.err ? { borderColor: "#ff6b8a" } : undefined}>{toast.m}</div>}
    </ToastCtx.Provider>
  );
}
