"use client";

import { forwardRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupFormSchema, type SignupFormValues } from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { signUpAndBootstrap } from "@/lib/auth";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
  });

  async function onSubmit(values: SignupFormValues) {
    setServerError(null);
    try {
      const outcome = await signUpAndBootstrap(values);
      if (outcome.status === "needs_confirmation") {
        setNeedsConfirmation(true);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (needsConfirmation) {
    return (
      <div className="border-brand-stone bg-brand-cream space-y-2 rounded-md border p-4 text-sm">
        <p className="font-medium">Check your inbox.</p>
        <p className="text-brand-walnut">
          We&apos;ve emailed you a confirmation link. Open it to finish setting up your agency.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Field
        id="full_name"
        label="Your full name"
        error={errors.full_name?.message}
        autoComplete="name"
        {...register("full_name")}
      />
      <Field
        id="email"
        type="email"
        label="Work email"
        error={errors.email?.message}
        autoComplete="email"
        {...register("email")}
      />
      <Field
        id="password"
        type="password"
        label="Password"
        error={errors.password?.message}
        autoComplete="new-password"
        {...register("password")}
      />
      <Field
        id="agency_name"
        label="Agency name"
        error={errors.agency_name?.message}
        autoComplete="organization"
        {...register("agency_name")}
      />
      <Field
        id="branch_postcode"
        label="Branch postcode"
        placeholder="e.g. SW1A 1AA"
        error={errors.branch_postcode?.message}
        autoComplete="postal-code"
        {...register("branch_postcode")}
      />
      {serverError ? (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating your agency…" : "Create agency"}
      </Button>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { id, label, error, ...rest },
  ref,
) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} ref={ref} aria-invalid={Boolean(error)} {...rest} />
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
