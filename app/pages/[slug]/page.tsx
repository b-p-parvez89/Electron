import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Shell from "@/components/Shell";
import ContactPage from "@/components/ContactPage";
import { getSettings } from "@/lib/settings";

/**
 * Starter legal/info pages in Bengali. Review them with your lawyer / actual business policy before launch
 * (return window, delivery times, company details are placeholders you should adjust).
 */
const PAGES: Record<string, { title: string; body: (s: any) => string }> = {
  about: { title: "আমাদের সম্পর্কে", body: (s) => `${s.siteName} একটি অনলাইন ইলেকট্রনিক্স স্টোর। আমরা অরিজিনাল ও মানসম্পন্ন গ্যাজেট সঠিক দামে সারা বাংলাদেশে পৌঁছে দিই।\n\n${s.tagline}` },
  shipping: { title: "ডেলিভারি তথ্য", body: (s) => `• ঢাকার ভেতরে ডেলিভারি চার্জ ৳${s.shipping.insideDhaka}, ঢাকার বাইরে ৳${s.shipping.outsideDhaka}।\n• ৳${s.shipping.freeOver} বা তার বেশি অর্ডারে ডেলিভারি ফ্রি।\n• সাধারণত ঢাকায় ১–২ কার্যদিবস এবং ঢাকার বাইরে ২–৫ কার্যদিবসে ডেলিভারি দেওয়া হয়।\n• কুরিয়ার বুকিং হলে আপনি ট্র্যাকিং কোড পাবেন; অর্ডার ট্র্যাক পেজ থেকেও দেখা যাবে।` },
  returns: { title: "রিটার্ন ও রিফান্ড পলিসি", body: () => `• পণ্য হাতে পাওয়ার ৩ দিনের মধ্যে ত্রুটিপূর্ণ বা ভুল পণ্যের ক্ষেত্রে আমাদের জানান।\n• পণ্য অবশ্যই অব্যবহৃত ও আসল প্যাকেজিংসহ হতে হবে।\n• যাচাই শেষে রিপ্লেসমেন্ট বা রিফান্ড দেওয়া হবে। অনলাইন পেমেন্টের রিফান্ড একই মাধ্যমে ফেরত যাবে।\n• ওয়ারেন্টিযুক্ত পণ্যের ওয়ারেন্টি শর্ত পণ্যের বিবরণে উল্লেখ থাকবে।` },
  privacy: { title: "প্রাইভেসি পলিসি", body: (s) => `${s.siteName} আপনার নাম, মোবাইল নম্বর, ঠিকানা ও ইমেইল শুধুমাত্র অর্ডার প্রসেস, ডেলিভারি ও গ্রাহক সহায়তার জন্য সংগ্রহ করে।\n\n• অর্ডার সম্পূর্ণ করার জন্য কুরিয়ার সার্ভিসকে আপনার ডেলিভারি তথ্য দেওয়া হয়।\n• চেকআউট শুরু করে সম্পন্ন না করলে আপনার দেওয়া তথ্য (নাম, ফোন, কার্ট) অর্ডার সহায়তার জন্য সংরক্ষিত হতে পারে।\n• আমরা মার্কেটিং ও বিজ্ঞাপন পরিমাপের জন্য Meta Pixel / Google Analytics এবং সার্ভার-সাইড ইভেন্ট ব্যবহার করতে পারি; এতে ইমেইল/ফোন হ্যাশ করে পাঠানো হয়।\n• কার্ডের তথ্য আমরা সংরক্ষণ করি না; অনলাইন পেমেন্ট SSLCommerz-এর নিরাপদ পেজে হয়।\n• তথ্য মুছে ফেলতে চাইলে যোগাযোগ পেজের মাধ্যমে জানান।` },
  terms: { title: "শর্তাবলি", body: (s) => `${s.siteName}-এ অর্ডার করার মাধ্যমে আপনি নিচের শর্তগুলো মেনে নিচ্ছেন:\n\n• পণ্যের দাম ও স্টক পরিবর্তনযোগ্য; কনফার্মেশনের আগে ভুল দাম দেখা গেলে অর্ডার বাতিলের অধিকার সংরক্ষিত।\n• ভুয়া বা ভুল তথ্য দিয়ে অর্ডার করলে অর্ডার বাতিল করা হতে পারে।\n• ডেলিভারির সময় পণ্য যাচাই করে নিন।\n• রিটার্ন ও ডেলিভারি পলিসি আলাদা পেজে দেওয়া আছে।` }
};

type PageProps = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug === "contact" ? "যোগাযোগ" : PAGES[slug]?.title;
  return title ? { title, alternates: { canonical: `/pages/${slug}` } } : { title: "পেজ পাওয়া যায়নি" };
}
export default async function InfoPage({ params }: PageProps) {
  const { slug } = await params;
  const p = PAGES[slug];
  if (slug === "contact") return <Shell><ContactPage settings={await getSettings()} /></Shell>;
  if (!p) return notFound();
  const s = await getSettings();
  return <Shell><main className="container page" style={{ maxWidth: 780 }}><h1 style={{ fontSize: 32 }}>{p.title}</h1><section className="panel"><div className="prose">{p.body(s)}</div></section></main></Shell>;
}
