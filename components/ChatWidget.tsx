"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type ChatMessage = { id: string; sender: "visitor" | "admin"; text: string; createdAt: string };
type ChatData = { conversation: { id: string; name: string; phone: string } | null; messages: ChatMessage[]; unreadCount: number };
const KEY_STORAGE = "electron-support-chat-key";
const NAME_STORAGE = "electron-support-chat-name";

function visitorKey() {
  let key = localStorage.getItem(KEY_STORAGE);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(KEY_STORAGE, key);
  }
  return key;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [data, setData] = useState<ChatData>({ conversation: null, messages: [], unreadCount: 0 });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAdminMessage = useRef("");

  useEffect(() => {
    setKey(visitorKey());
    setName(localStorage.getItem(NAME_STORAGE) || "");
    setNotifications("Notification" in window && Notification.permission === "granted");
  }, []);

  const refresh = useCallback(async (visitorToken: string, notify = false) => {
    try {
      const response = await fetch(`/api/chat?key=${encodeURIComponent(visitorToken)}&_=${Date.now()}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "চ্যাট আপডেট করা যায়নি।");
      const latest = (result.messages as ChatMessage[]).filter((message) => message.sender === "admin").at(-1);
      const hasNewReply = !!(notify && latest && lastAdminMessage.current && latest.id !== lastAdminMessage.current);
      if (hasNewReply && !open) {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("ELECTRON সাপোর্টের নতুন মেসেজ", { body: latest.text, tag: "electron-support-reply" });
        }
      }
      if (latest) lastAdminMessage.current = latest.id;
      if (result.conversation?.name) {
        setName(result.conversation.name);
        localStorage.setItem(NAME_STORAGE, result.conversation.name);
      }
      setData((current) => ({
        ...result,
        unreadCount: open ? 0 : Math.max(current.unreadCount, result.unreadCount) + (hasNewReply ? 1 : 0)
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "চ্যাট আপডেট করা যায়নি।");
    }
  }, [open]);

  useEffect(() => {
    if (!key) return;
    refresh(key);
    const timer = window.setInterval(() => refresh(key, true), 10000);
    return () => window.clearInterval(timer);
  }, [key, refresh]);

  useEffect(() => {
    if (open) {
      setData((current) => ({ ...current, unreadCount: 0 }));
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [open, data.messages.length]);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!key || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorKey: key, name: name.trim(), phone: phone.trim(), text: text.trim() })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "মেসেজ পাঠানো যায়নি।");
      localStorage.setItem(NAME_STORAGE, name.trim());
      setText("");
      await refresh(key);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "মেসেজ পাঠানো যায়নি।");
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    if (!("Notification" in window)) { setError("এই ব্রাউজারে notification সমর্থিত নয়।"); return; }
    const permission = await Notification.requestPermission();
    setNotifications(permission === "granted");
    if (permission !== "granted") setError("Notification permission দেওয়া হয়নি।");
  }

  return (
    <div className="support-chat">
      {open && <section className="support-chat-panel" aria-label="সাপোর্ট চ্যাট">
        <header className="support-chat-head">
          <div><b>সাপোর্ট চ্যাট</b><small>আমাদের টিমকে মেসেজ করুন</small></div>
          <div className="support-chat-head-actions">
            <button type="button" onClick={enableNotifications} aria-label="চ্যাট notification চালু করুন" title={notifications ? "Notification চালু" : "Notification চালু করুন"}>{notifications ? "🔔" : "♧"}</button>
            <button type="button" onClick={() => setOpen(false)} aria-label="চ্যাট বন্ধ করুন">×</button>
          </div>
        </header>
        <div className="support-chat-messages">
          {!data.messages.length && <p className="support-chat-welcome">হ্যালো! কীভাবে সাহায্য করতে পারি? আপনার মেসেজ লিখুন।</p>}
          {data.messages.map((message) => <div key={message.id} className={`support-chat-message ${message.sender === "visitor" ? "mine" : ""}`}><span>{message.sender === "admin" ? "ELECTRON Support" : "আপনি"}</span><p>{message.text}</p><time>{new Date(message.createdAt).toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })}</time></div>)}
          <div ref={bottomRef} />
        </div>
        <form className="support-chat-form" onSubmit={send}>
          {!data.conversation && <div className="support-chat-identity">
            <input aria-label="আপনার নাম" placeholder="আপনার নাম" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
            <input aria-label="মোবাইল নম্বর (ঐচ্ছিক)" placeholder="মোবাইল নম্বর (ঐচ্ছিক)" maxLength={25} value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>}
          <div className="support-chat-compose"><input aria-label="মেসেজ লিখুন" placeholder="মেসেজ লিখুন..." required maxLength={2000} value={text} onChange={(event) => setText(event.target.value)} /><button type="submit" disabled={busy || !key} aria-label="মেসেজ পাঠান">{busy ? "…" : "➤"}</button></div>
          {error && <small className="support-chat-error" role="status">{error}</small>}
        </form>
      </section>}
      <button className="support-chat-launch" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? "সাপোর্ট চ্যাট বন্ধ করুন" : "সাপোর্ট চ্যাট খুলুন"}>
        {open ? "×" : "💬"} {!open && <span>চ্যাট করুন</span>}
        {!open && data.unreadCount > 0 && <i>{data.unreadCount}</i>}
      </button>
    </div>
  );
}
