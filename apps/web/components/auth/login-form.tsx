"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginFormSchema, type LoginFormValues } from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { sendMagicLink, signInWithPassword } from "@/lib/auth";

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [submittingMagicLink, setSubmittingMagicLink] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      await signInWithPassword(values.email, values.password);
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not sign in.");
    }
  }

  async function onMagicLink() {
    setServerError(null);
    setMagicLinkSent(false);
    const email = getValues("email");
    if (!email) {
      setServerError("Enter your email first.");
      return;
    }
    setSubmittingMagicLink(true);
    try {
      await sendMagicLink(email);
      setMagicLinkSent(true);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not send link.");
    } finally {
      setSubmittingMagicLink(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          {...register("password")}
        />
        {errors.password ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.password.message}
          </p>
        ) : null}
      </div>
      {serverError ? (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      ) : null}
      {magicLinkSent ? (
        <p className="text-sm text-emerald-700">Magic link sent — check your inbox.</p>
      ) : null}
      <div className="space-y-2">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={submittingMagicLink}
          onClick={onMagicLink}
          className="w-full"
        >
          {submittingMagicLink ? "Sending…" : "Email me a magic link"}
        </Button>
      </div>
    </form>
  );
}
