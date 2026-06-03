"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  bootstrapAgencyRequestSchema,
  type BootstrapAgencyRequest,
  type BootstrapAgencyResponse,
} from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { apiFetch } from "@/lib/api";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Completes the agency bootstrap for a user who confirmed their email but
 * whose signup didn't reach the /v1/auth/bootstrap-agency call. Same form as
 * the signup page, minus email + password (already set).
 */
export function FinishSetupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BootstrapAgencyRequest>({
    resolver: zodResolver(bootstrapAgencyRequestSchema),
  });

  async function onSubmit(values: BootstrapAgencyRequest) {
    setServerError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      await apiFetch<BootstrapAgencyResponse>("/v1/auth/bootstrap-agency", {
        method: "POST",
        body: values,
        accessToken: session.access_token,
      });

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not finish setup.");
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
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
        <Label htmlFor="agency_name">Agency name</Label>
        <Input id="agency_name" autoComplete="organization" {...register("agency_name")} />
        {errors.agency_name ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.agency_name.message}
          </p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="branch_postcode">Branch postcode</Label>
        <Input
          id="branch_postcode"
          placeholder="e.g. SW1A 1AA"
          autoComplete="postal-code"
          {...register("branch_postcode")}
        />
        {errors.branch_postcode ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.branch_postcode.message}
          </p>
        ) : null}
      </div>
      {serverError ? (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      ) : null}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Finishing setup…" : "Finish setting up"}
      </Button>
    </form>
  );
}
