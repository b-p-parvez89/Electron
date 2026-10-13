"use client";
import { useState } from "react";
import { addToCart } from "@/lib/client";
import type { PProduct } from "@/lib/catalog";

export default function AddToCartButton({ p }: { p: PProduct }) {
  const [done, setDone] = useState(false);
  return (
    <button className="small-btn" onClick={() => { addToCart({ productId: p._id, name: p.name, price: p.price, quantity: 1, image: p.images?.[0], slug: p.slug }); setDone(true); setTimeout(() => setDone(false), 1400); }}>
      {done ? "✓ যোগ হয়েছে" : "কার্টে +"}
    </button>
  );
}
