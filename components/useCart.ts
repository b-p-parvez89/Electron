"use client";
import { useEffect, useState } from "react";
import { CART_EVENT, CartItem, readCart, writeCart } from "@/lib/client";

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const sync = () => setItems(readCart());
    sync(); setReady(true);
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(CART_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const count = items.reduce((a, i) => a + i.quantity, 0);
  const subtotal = items.reduce((a, i) => a + i.price * i.quantity, 0);
  return { items, ready, count, subtotal, set: writeCart };
}
