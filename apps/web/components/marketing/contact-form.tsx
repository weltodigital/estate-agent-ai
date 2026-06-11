"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactFormSchema,
  type ContactFormValues,
  type ContactResponse,
} from "@app/shared/schemas";
import { apiFetch } from "@/lib/api";
import { ERROR_COPY } from "@/lib/copy";

const fieldClass =
  "bg-brand-sand text-brand-ink placeholder:text-brand-walnut/60 w-full rounded-lg px-3 py-2 text-sm";
const fieldBorder = { border: "0.5px solid #E4DFD0" };

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
  });

  async function onSubmit(values: ContactFormValues) {
    setServerError(null);
    try {
      await apiFetch<ContactResponse>("/v1/contact", { method: "POST", body: values });
      setSent(true);
    } catch {
      setServerError(ERROR_COPY.generic);
    }
  }

  if (sent) {
    return (
      <div
        className="bg-brand-sand text-brand-ink mt-10 rounded-lg px-5 py-6 text-center text-sm"
        style={fieldBorder}
        role="status"
      >
        <p className="text-brand-ink text-base font-medium">Thanks, message received.</p>
        <p className="text-brand-walnut mt-2">
          We&rsquo;ll be in touch shortly. Keep an eye on your inbox.
        </p>
      </div>
    );
  }

  return (
    <form className="mt-10 space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-brand-ink block text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          aria-invalid={Boolean(errors.name)}
          className={fieldClass}
          style={fieldBorder}
          {...register("name")}
        />
        {errors.name ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-brand-ink block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(errors.email)}
          className={fieldClass}
          style={fieldBorder}
          {...register("email")}
        />
        {errors.email ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="message" className="text-brand-ink block text-sm font-medium">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          aria-invalid={Boolean(errors.message)}
          className={fieldClass}
          style={fieldBorder}
          {...register("message")}
        />
        {errors.message ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.message.message}
          </p>
        ) : null}
      </div>

      {/* Honeypot: hidden from people, catches bots. Real submissions leave it empty. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        {...register("company")}
      />

      {serverError ? (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-brand-terracotta text-brand-cream w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {isSubmitting ? "Sending…" : "Send"}
      </button>
    </form>
  );
}
