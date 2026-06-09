import { ContactForm } from "@/components/marketing/contact-form";
import { CONTACT_EMAIL } from "@/lib/copy";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-[480px]">
        <h1 className="text-brand-ink text-center text-[44px]">Get in touch.</h1>
        <p className="text-brand-walnut mt-4 text-center text-base">
          Questions, demos, or just want to see if we&rsquo;re a fit? Drop us a line.
        </p>

        <ContactForm />

        <p className="text-brand-walnut mt-8 text-center text-sm">
          Prefer email? Reach us at{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-terracotta">
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
