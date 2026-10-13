"use client";
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return <main className="container page" style={{ textAlign: "center" }}><div style={{ fontSize: 56 }}>⚠️</div><h1>কিছু একটা সমস্যা হয়েছে</h1><p className="muted">কিছুক্ষণ পর আবার চেষ্টা করুন।</p><button className="btn" onClick={reset}>আবার চেষ্টা করুন</button></main>;
}
