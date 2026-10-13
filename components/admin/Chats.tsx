"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, dt, useToast } from "./ui";

type Conversation = { id: string; name: string; phone: string; lastMessage: string; lastMessageAt: string; unreadCount: number };
type Message = { id: string; sender: "visitor" | "admin"; text: string; createdAt: string };

export default function Chats({ onUnreadChange }: { onUnreadChange: (count: number) => void }) {
  const toast = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const result = await api<{ conversations: Conversation[]; unreadCount: number }>("/api/admin/chats");
      setConversations(result.conversations);
      onUnreadChange(result.unreadCount);
      if (selected && !result.conversations.some((conversation) => conversation.id === selected)) setSelected("");
    } catch (error) {
      toast(error instanceof Error ? error.message : "চ্যাট লোড করা যায়নি।", true);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange, selected, toast]);

  const loadMessages = useCallback(async (id: string) => {
    try {
      const result = await api<{ messages: Message[] }>(`/api/admin/chats/${id}`);
      setMessages(result.messages);
      await loadConversations();
    } catch (error) {
      toast(error instanceof Error ? error.message : "চ্যাট মেসেজ লোড করা যায়নি।", true);
    }
  }, [loadConversations, toast]);

  useEffect(() => {
    loadConversations();
    const timer = window.setInterval(loadConversations, 8000);
    return () => window.clearInterval(timer);
  }, [loadConversations]);

  useEffect(() => {
    if (!selected) { setMessages([]); return; }
    loadMessages(selected);
    const timer = window.setInterval(() => loadMessages(selected), 5000);
    return () => window.clearInterval(timer);
  }, [loadMessages, selected]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, selected]);

  async function reply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !text.trim() || busy) return;
    setBusy(true);
    try {
      await api(`/api/admin/chats/${selected}`, "POST", { text: text.trim() });
      setText("");
      await loadMessages(selected);
    } catch (error) {
      toast(error instanceof Error ? error.message : "রিপ্লাই পাঠানো যায়নি।", true);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">চ্যাট লোড হচ্ছে…</p>;
  return (
    <div className="admin-chat-layout">
      <aside className="admin-chat-list panel">
        <h2>কাস্টমার চ্যাট <span>{conversations.length}</span></h2>
        {!conversations.length && <p className="muted">এখনো কোনো চ্যাট আসেনি।</p>}
        {conversations.map((conversation) => <button type="button" key={conversation.id} className={`admin-chat-conversation${selected === conversation.id ? " on" : ""}`} onClick={() => setSelected(conversation.id)}>
          <span><b>{conversation.name}</b><small>{conversation.phone || "ফোন দেওয়া হয়নি"}</small><small>{conversation.lastMessage}</small></span>
          <span className="admin-chat-meta">{conversation.unreadCount > 0 && <i>{conversation.unreadCount}</i>}<small>{dt(conversation.lastMessageAt)}</small></span>
        </button>)}
      </aside>
      <section className="admin-chat-thread panel">
        {!selected ? <div className="empty">বাম পাশ থেকে একটি চ্যাট বেছে নিন।</div> : <>
          <div className="admin-chat-thread-head"><b>{conversations.find((conversation) => conversation.id === selected)?.name || "কাস্টমার"}</b>{conversations.find((conversation) => conversation.id === selected)?.phone && <a href={`tel:${conversations.find((conversation) => conversation.id === selected)?.phone}`}>📞 কল</a>}</div>
          <div className="admin-chat-thread-messages">
            {messages.map((message) => <article key={message.id} className={`support-chat-message ${message.sender === "admin" ? "mine" : ""}`}><span>{message.sender === "admin" ? "আপনি" : "কাস্টমার"}</span><p>{message.text}</p><time>{dt(message.createdAt)}</time></article>)}
            <div ref={bottomRef} />
          </div>
          <form className="admin-chat-reply" onSubmit={reply}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder="রিপ্লাই লিখুন..." aria-label="রিপ্লাই লিখুন" required /><button className="btn sm" disabled={busy}>পাঠান</button></form>
        </>}
      </section>
    </div>
  );
}
