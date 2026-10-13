"use client";
import { useCallback, useEffect, useState } from "react";
import { api, dt, useToast } from "./ui";

type Message = {
  _id: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  createdAt: string;
};

export default function Messages() {
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const data = await api<{ messages: Message[] }>("/api/admin/messages");
      setMessages(data.messages);
    } catch (error) {
      toast(error instanceof Error ? error.message : "মেসেজ লোড করা যায়নি।", true);
    } finally {
      setLoading(false);
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  async function updateStatus(message: Message, status: "read" | "replied") {
    try {
      await api(`/api/admin/messages/${message._id}`, "PATCH", { status });
      await load();
      toast(status === "replied" ? "মেসেজটি রিপ্লাইড হিসেবে চিহ্নিত হয়েছে।" : "মেসেজটি পড়া হয়েছে হিসেবে চিহ্নিত হয়েছে।");
    } catch (error) {
      toast(error instanceof Error ? error.message : "মেসেজ আপডেট করা যায়নি।", true);
    }
  }

  if (loading) return <p className="muted">মেসেজ লোড হচ্ছে…</p>;
  return (
    <div className="admin-messages">
      {!messages.length ? <div className="panel empty">এখনো কোনো যোগাযোগের মেসেজ আসেনি।</div> : messages.map((message) => (
        <article className={`panel admin-message${message.status === "new" ? " is-new" : ""}`} key={message._id}>
          <div className="admin-message-head">
            <div><span className={`status s-${message.status}`}>{message.status === "new" ? "নতুন" : message.status === "replied" ? "রিপ্লাইড" : "পড়া হয়েছে"}</span><h2>{message.subject}</h2><small className="muted">{dt(message.createdAt)}</small></div>
            <strong>{message.name}</strong>
          </div>
          <p className="admin-message-body">{message.message}</p>
          <div className="admin-message-actions">
            <a className="small-btn" href={`tel:${message.phone.replace(/[^\d+]/g, "")}`}>ফোন · {message.phone}</a>
            {message.email && <a className="small-btn" href={`mailto:${message.email}`}>ইমেইল · {message.email}</a>}
            {message.status !== "read" && <button className="small-btn" onClick={() => updateStatus(message, "read")}>পড়া হয়েছে</button>}
            {message.status !== "replied" && <button className="small-btn" onClick={() => updateStatus(message, "replied")}>রিপ্লাইড হিসেবে চিহ্নিত</button>}
          </div>
        </article>
      ))}
    </div>
  );
}
