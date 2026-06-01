"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { acceptInviteFormSchema, type AcceptInviteFormValues } from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { signUpAndAcceptInvite } from "@/lib/auth";

export function AcceptInviteForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tokenFromUrl = params.get("token") ?? "";
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteFormValues>({
    resolver: zodResolver(acceptInviteFormSchema),
    defaultValues: { token: tokenFromUrl },
  });

  useEffect(() => {
    setValue("token", tokenFromUrl);
  }, [tokenFromUrl, setValue]);

  async function onSubmit(values: AcceptInviteFormValues) {
    setServerError(null);
    try {
      const outcome = await signUpAndAcceptInvite(values);
      if (outcome.status === "needs_confirmation") {
        setNeedsConfirmation(true);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not accept invite.");
    }
  }

  if (needsConfirmation) {
    return (
      <div className="space-y-2 rounded-md border border-slate-200 bg-white p-4 text-sm">
        <p className="font-medium">Check your inbox.</p>
        <p className="text-slate-600">
          We&apos;ve emailed you a confirmation link. Open it to finish joining your team.
        </p>
      </div>
    );
  }

  if (!tokenFromUrl) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Missing invite token. Use the link from your invite email.
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <input type="hidden" {...register("token")} />
      <div className="space-y-1">
        <Label htmlFor="full_name">Your full name</Label>
        <Input id="full_name" autoComplete="name" {...register("full_name")} />
        {errors.full_name ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.full_name.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email (must match the invite)</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.email.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Choose a password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
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
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Joining…" : "Accept invite"}
      </Button>
    </form>
  );
}
