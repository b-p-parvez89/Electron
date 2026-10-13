"use client";
import Link from "next/link";
import { useCart } from "@/components/useCart";

export default function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/cart" className="btn secondary cart-link" aria-label="কার্ট">
      🛒 <span className="hide-sm">কার্ট</span>{ready && count > 0 && <b className="badge">{count}</b>}
    </Link>
  );
}
