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

        {/* TODO: wire to Resend or a form service. Suggested path: a Resend
            transactional email to hello@privett.ai. Form is a placeholder — it
            does not submit anywhere yet. */}
        <form className="mt-10 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-brand-ink block text-sm font-medium">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="bg-brand-sand text-brand-ink placeholder:text-brand-walnut/60 w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "0.5px solid #E4DFD0" }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-brand-ink block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="bg-brand-sand text-brand-ink placeholder:text-brand-walnut/60 w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "0.5px solid #E4DFD0" }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="message" className="text-brand-ink block text-sm font-medium">
              Message
            </label>
            <textarea
              id="message"
              name="message"
              rows={5}
              className="bg-brand-sand text-brand-ink placeholder:text-brand-walnut/60 w-full rounded-lg px-3 py-2 text-sm"
              style={{ border: "0.5px solid #E4DFD0" }}
            />
          </div>
          <button
            type="submit"
            className="bg-brand-terracotta text-brand-cream w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Send
          </button>
        </form>

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
