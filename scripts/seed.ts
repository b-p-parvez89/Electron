import { config } from "dotenv";
config({ path: ".env.local" });
config(); // fall back to .env
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";
import Category from "../models/Category";
import Brand from "../models/Brand";
import Product from "../models/Product";
import Coupon from "../models/Coupon";
import PaymentGateway from "../models/PaymentGateway";
import CourierProvider from "../models/CourierProvider";
import Setting from "../models/Setting";
import { defaultSettings } from "../lib/settings";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in .env.local");

/** Free placeholder frames for the 360° demo (replace from the admin panel with your own product shots). */
const svg = (label: string, hue: number, angle = 0) => "data:image/svg+xml;utf8," + encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'><defs><radialGradient id='g' cx='50%' cy='45%'><stop offset='0' stop-color='hsl(${hue},70%,38%)'/><stop offset='1' stop-color='#070d1d'/></radialGradient></defs><rect width='800' height='800' fill='url(#g)'/><g transform='translate(400 400) rotate(${angle})'><rect x='-150' y='-210' width='300' height='420' rx='${40 + Math.abs(Math.sin(angle / 57) * 40)}' fill='hsl(${hue},80%,60%)' opacity='.9'/><rect x='${-120 + Math.sin(angle / 57) * 40}' y='-170' width='${240 - Math.abs(Math.sin(angle / 57) * 120)}' height='340' rx='24' fill='#0b1530'/></g><text x='400' y='740' text-anchor='middle' font-family='sans-serif' font-size='34' fill='#cfe4ff'>${label}</text></svg>`);
const spin = (label: string, hue: number) => Array.from({ length: 24 }, (_, i) => svg(label, hue, i * 15));

async function main() {
  await mongoose.connect(uri!);
  const email = (process.env.SEED_ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.length < 10) throw new Error("Set SEED_ADMIN_PASSWORD (at least 10 chars) in .env.local");
  if (!(await User.findOne({ email }))) await User.create({ name: process.env.SEED_ADMIN_NAME || "ELECTRON Admin", email, passwordHash: await bcrypt.hash(password, 12), role: "admin" });

  // Payment gateways (admin can add/edit more: bKash/Nagad manual, more SSLCommerz accounts ...)
  await PaymentGateway.updateOne({ key: "cod" }, { $setOnInsert: { key: "cod", name: "ক্যাশ অন ডেলিভারি", type: "cod", active: true, sortOrder: 1 } }, { upsert: true });
  await PaymentGateway.updateOne({ key: "sslcommerz" }, { $setOnInsert: { key: "sslcommerz", name: "অনলাইন পেমেন্ট (SSLCommerz)", type: "sslcommerz", active: !!process.env.SSLCOMMERZ_STORE_ID, sandbox: process.env.SSLCOMMERZ_IS_LIVE !== "true", sortOrder: 2 } }, { upsert: true });
  await CourierProvider.updateOne({ name: "Manual / Other" }, { $setOnInsert: { name: "Manual / Other", type: "manual", active: true, isDefault: true } }, { upsert: true });
  await Setting.updateOne({ key: "main" }, { $setOnInsert: { key: "main", data: defaultSettings } }, { upsert: true });
  await Coupon.updateOne({ code: "WELCOME10" }, { $setOnInsert: { code: "WELCOME10", description: "প্রথম অর্ডারে ১০% ছাড়", type: "percent", value: 10, minOrder: 1000, maxDiscount: 500, active: true } }, { upsert: true });

  const catSpecs = [
    { name: "অডিও", slug: "audio", description: "হেডফোন, ইয়ারবাড ও স্পিকার", icon: "🎧", sortOrder: 1 },
    { name: "ওয়্যারেবল", slug: "wearables", description: "স্মার্টওয়াচ ও ফিটনেস ব্যান্ড", icon: "⌚", sortOrder: 2 },
    { name: "পাওয়ার ও চার্জিং", slug: "power-charging", description: "চার্জার, ক্যাবল ও পাওয়ার ব্যাংক", icon: "🔌", sortOrder: 3 },
    { name: "অ্যাক্সেসরিজ", slug: "accessories", description: "দৈনন্দিন টেক অ্যাক্সেসরিজ", icon: "⌨️", sortOrder: 4 }
  ];
  const cats: Record<string, any> = {};
  for (const c of catSpecs) cats[c.slug] = await Category.findOneAndUpdate({ slug: c.slug }, { $setOnInsert: c }, { upsert: true, new: true });
  const brands: Record<string, any> = {};
  for (const b of [{ name: "SoundX", slug: "soundx" }, { name: "Pulse", slug: "pulse" }, { name: "Volt", slug: "volt" }]) brands[b.slug] = await Brand.findOneAndUpdate({ slug: b.slug }, { $setOnInsert: b }, { upsert: true, new: true });

  const products: any[] = [
    { name: "SoundX Pro ওয়্যারলেস হেডফোন", slug: "soundx-pro-wireless-headphones", sku: "EL-AUD-001", shortDescription: "অ্যাক্টিভ নয়েজ ক্যান্সেলেশনসহ সারাদিনের আরাম।", description: "গভীর বেস, পরিষ্কার ভোকাল এবং ৪০ ঘণ্টা পর্যন্ত ব্যাটারি ব্যাকআপ। ফোল্ডেবল ডিজাইন ও কেস সহ।", price: 6990, compareAtPrice: 9990, stock: 20, category: cats.audio._id, brand: brands.soundx._id, featured: true, soldCount: 12, images: [svg("SoundX Pro", 265)], spinImages: spin("SoundX Pro", 265), variants: [{ name: "ব্ল্যাক", price: 6990, compareAtPrice: 9990, stock: 12, sku: "EL-AUD-001-BK", image: "" }, { name: "সিলভার", price: 7190, compareAtPrice: 9990, stock: 8, sku: "EL-AUD-001-SV", image: "" }], specs: [{ key: "ব্লুটুথ", value: "5.3" }, { key: "ব্যাটারি", value: "৪০ ঘণ্টা" }, { key: "ওয়ারেন্টি", value: "১ বছর" }], tags: ["headphone", "anc"] },
    { name: "Pulse স্মার্টওয়াচ X", slug: "pulse-smartwatch-x", sku: "EL-WEA-001", shortDescription: "নোটিফিকেশন, হেলথ ট্র্যাকিং ও কলিং।", description: "১.৮৫ ইঞ্চি AMOLED ডিসপ্লে, ব্লুটুথ কলিং, হার্ট রেট ও SpO2 মনিটর। IP68 ওয়াটার রেজিস্ট্যান্ট।", price: 4590, stock: 12, category: cats.wearables._id, brand: brands.pulse._id, featured: true, soldCount: 7, images: [svg("Pulse X", 190)], spinImages: spin("Pulse X", 190), specs: [{ key: "ডিসপ্লে", value: "1.85\" AMOLED" }, { key: "ব্যাটারি", value: "৭ দিন" }], tags: ["smartwatch"] },
    { name: "Volt 65W ফাস্ট চার্জার", slug: "volt-65w-fast-charger", sku: "EL-PWR-001", shortDescription: "ল্যাপটপ ও ফোনের জন্য কমপ্যাক্ট GaN চার্জার।", description: "৬৫ ওয়াট পর্যন্ত দ্রুত চার্জিং। কেনার আগে আপনার ডিভাইসের সাপোর্ট দেখে নিন।", price: 1890, stock: 50, category: cats["power-charging"]._id, brand: brands.volt._id, featured: true, soldCount: 20, images: [svg("Volt 65W", 45)], specs: [{ key: "আউটপুট", value: "65W" }, { key: "পোর্ট", value: "2×USB-C, 1×USB-A" }], tags: ["charger"] },
    { name: "AirBeat ওয়্যারলেস ইয়ারবাড", slug: "airbeat-wireless-earbuds", sku: "EL-AUD-002", shortDescription: "পকেট-সাইজ সাউন্ড, ক্রিস্টাল ক্লিয়ার কল।", description: "ডুয়াল মাইক, লো-লেটেন্সি গেমিং মোড ও ২৪ ঘণ্টা ব্যাটারি।", price: 3290, compareAtPrice: 3990, stock: 18, category: cats.audio._id, brand: brands.soundx._id, featured: true, soldCount: 9, images: [svg("AirBeat", 330)], specs: [{ key: "ব্যাটারি", value: "২৪ ঘণ্টা (কেসসহ)" }], tags: ["earbuds"] }
  ];
  for (const p of products) await Product.findOneAndUpdate({ slug: p.slug }, { $setOnInsert: p }, { upsert: true, new: true });
  console.log("Seed complete. Admin:", email, "— পাসওয়ার্ড পরিবর্তন করুন এবং /admin থেকে SSLCommerz কী ও কুরিয়ার সেট করুন।");
  await mongoose.disconnect();
}
main().catch(async (e) => { console.error(e); await mongoose.disconnect(); process.exit(1); });
