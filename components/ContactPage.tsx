import ContactForm from "@/components/ContactForm";
import type { Settings } from "@/lib/settings";

function whatsappUrl(number: string) {
  const digits = number.replace(/\D/g, "");
  const international = digits.startsWith("0") ? `88${digits}` : digits;
  return international ? `https://wa.me/${international}` : "";
}

export default function ContactPage({ settings }: { settings: Settings }) {
  const channels = [
    settings.phone ? { icon: "☎", label: "ফোন করুন", value: settings.phone, href: `tel:${settings.phone.replace(/[^\d+]/g, "")}` } : null,
    settings.whatsapp ? { icon: "◉", label: "WhatsApp", value: settings.whatsapp, href: whatsappUrl(settings.whatsapp) } : null,
    settings.email ? { icon: "✉", label: "ইমেইল", value: settings.email, href: `mailto:${settings.email}` } : null,
    settings.address ? { icon: "⌖", label: "ঠিকানা", value: settings.address, href: "" } : null
  ].filter(Boolean) as { icon: string; label: string; value: string; href: string }[];
  const socials = [
    settings.social.facebook ? { label: "Facebook", href: settings.social.facebook } : null,
    settings.social.instagram ? { label: "Instagram", href: settings.social.instagram } : null,
    settings.social.youtube ? { label: "YouTube", href: settings.social.youtube } : null
  ].filter(Boolean) as { label: string; href: string }[];

  return (
    <main className="container page contact-page">
      <header className="contact-heading">
        <span className="eyebrow">আমরা সাহায্য করতে প্রস্তুত</span>
        <h1>যোগাযোগ করুন</h1>
        <p className="muted">পণ্য, অর্ডার বা যেকোনো সহায়তার জন্য আমাদের মেসেজ করুন। আমরা যত দ্রুত সম্ভব উত্তর দেব।</p>
      </header>
      <div className="contact-layout">
        <section className="contact-info panel">
          <span className="contact-kicker">সরাসরি যোগাযোগ</span>
          <h2>আপনার সুবিধামতো মাধ্যম বেছে নিন</h2>
          {channels.length ? <div className="contact-channels">
            {channels.map((item) => <div className="contact-channel" key={item.label}>
              <span className="contact-icon" aria-hidden="true">{item.icon}</span>
              <span><small>{item.label}</small>{item.href ? <a href={item.href} target={item.label === "WhatsApp" ? "_blank" : undefined} rel={item.label === "WhatsApp" ? "noopener noreferrer" : undefined}>{item.value}</a> : <b>{item.value}</b>}</span>
            </div>)}
          </div> : <p className="muted">যোগাযোগের তথ্য শিগগিরই যোগ করা হবে।</p>}
          {socials.length > 0 && <div className="contact-socials"><b>সোশ্যাল মিডিয়া</b><div>{socials.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer">{social.label} ↗</a>)}</div></div>}
          <div className="contact-hours"><span aria-hidden="true">◷</span><p><b>সাহায্য লাগবে?</b><br />ফর্মে আপনার প্রশ্নটি লিখুন—আমাদের টিম যোগাযোগ করবে।</p></div>
        </section>
        <section className="contact-form-card panel">
          <span className="contact-kicker">মেসেজ পাঠান</span>
          <h2>কীভাবে সাহায্য করতে পারি?</h2>
          <ContactForm />
        </section>
      </div>
    </main>
  );
}
