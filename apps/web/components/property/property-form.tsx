"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  createPropertySchema,
  type CreatePropertyRequest,
  type Property,
} from "@app/shared/schemas";
import {
  LISTING_TYPES,
  UK_PROPERTY_TYPES,
  type ListingType,
  type UkPropertyType,
} from "@app/shared/constants";
import { Button, Input, Label } from "@app/ui";
import { propertyApi } from "@/lib/queries";

type Mode = { kind: "create" } | { kind: "edit"; property: Property };

// Agents think in pounds, not pence — the form collects a pounds value and we
// convert to pence (the DB/API contract) on submit. Everything else in
// createPropertySchema is reused as-is so the contract stays the source of truth.
const propertyFormSchema = createPropertySchema.omit({ price_pence: true }).extend({
  price_pounds: z
    .number({ invalid_type_error: "Enter a price in pounds" })
    .min(0, "Price cannot be negative"),
});

type FormValues = z.infer<typeof propertyFormSchema>;

const poundsToPence = (pounds: number) => Math.round(pounds * 100);
const penceToPounds = (pence: number) => pence / 100;

const PROPERTY_TYPE_LABELS: Record<UkPropertyType, string> = {
  detached: "Detached",
  "semi-detached": "Semi-detached",
  terraced: "Terraced",
  flat: "Flat",
  bungalow: "Bungalow",
  other: "Other",
};

const LISTING_LABELS: Record<ListingType, string> = {
  sale: "For sale",
  rent: "To let",
};

export function PropertyForm({ mode, branchId }: { mode: Mode; branchId: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  // Creating: just address, price and sale/let. Editing: the full detail set.
  const isEdit = mode.kind === "edit";

  // Memoise so the defaults object reference is stable across renders;
  // otherwise the reset() effect below loops and the inputs feel frozen.
  const propertyKey = mode.kind === "edit" ? mode.property.id : "create";
  const defaults = useMemo<FormValues>(
    () =>
      mode.kind === "edit"
        ? {
            branch_id: mode.property.branch_id,
            address_line_1: mode.property.address_line_1,
            address_line_2: mode.property.address_line_2 ?? undefined,
            town: mode.property.town,
            postcode: mode.property.postcode,
            property_type: mode.property.property_type,
            listing_type: mode.property.listing_type,
            bedrooms: mode.property.bedrooms,
            bathrooms: mode.property.bathrooms,
            price_pounds: penceToPounds(mode.property.price_pence),
            notes: mode.property.notes ?? undefined,
          }
        : {
            branch_id: branchId,
            address_line_1: "",
            town: "",
            postcode: "",
            property_type: "other",
            listing_type: "sale",
            bedrooms: 0,
            bathrooms: 0,
            price_pounds: 0,
          },
    // propertyKey changes when we switch between create/edit or between two
    // different properties — that's the only time defaults need to flip.
    // (Intentionally not depending on every form default; see comment above.)
    [propertyKey, branchId],
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [reset, defaults]);

  async function onSubmit(values: FormValues) {
    setServerError(null);
    const { price_pounds, ...rest } = values;
    const payload: CreatePropertyRequest = {
      ...rest,
      price_pence: poundsToPence(price_pounds),
    };
    try {
      const property =
        mode.kind === "edit"
          ? await propertyApi.update(mode.property.id, payload)
          : await propertyApi.create(payload);
      router.push(`/properties/${property.id}`);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Address line 1" id="address_line_1" error={errors.address_line_1?.message}>
          <Input id="address_line_1" {...register("address_line_1")} />
        </Field>
        {isEdit ? (
          <Field
            label="Address line 2 (optional)"
            id="address_line_2"
            error={errors.address_line_2?.message}
          >
            <Input id="address_line_2" {...register("address_line_2")} />
          </Field>
        ) : null}
        <Field label="Town" id="town" error={errors.town?.message}>
          <Input id="town" {...register("town")} />
        </Field>
        <Field label="Postcode" id="postcode" error={errors.postcode?.message}>
          <Input id="postcode" {...register("postcode")} />
        </Field>
        {isEdit ? (
          <Field label="Property type" id="property_type" error={errors.property_type?.message}>
            <select
              id="property_type"
              className="border-brand-stone bg-brand-cream flex h-10 w-full rounded-md border px-3 text-sm"
              {...register("property_type")}
            >
              {UK_PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PROPERTY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label="Listing type" id="listing_type" error={errors.listing_type?.message}>
          <select
            id="listing_type"
            className="border-brand-stone bg-brand-cream flex h-10 w-full rounded-md border px-3 text-sm"
            {...register("listing_type")}
          >
            {LISTING_TYPES.map((t) => (
              <option key={t} value={t}>
                {LISTING_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>
        {isEdit ? (
          <>
            <Field label="Bedrooms" id="bedrooms" error={errors.bedrooms?.message}>
              <Input
                id="bedrooms"
                type="number"
                min={0}
                {...register("bedrooms", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Bathrooms" id="bathrooms" error={errors.bathrooms?.message}>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                {...register("bathrooms", { valueAsNumber: true })}
              />
            </Field>
          </>
        ) : null}
        <Field label="Price (£)" id="price_pounds" error={errors.price_pounds?.message}>
          <Input
            id="price_pounds"
            type="number"
            min={0}
            step="0.01"
            {...register("price_pounds", { valueAsNumber: true })}
          />
        </Field>
        {isEdit ? (
          <div className="md:col-span-2">
            <Field label="Notes (optional)" id="notes" error={errors.notes?.message}>
              <textarea
                id="notes"
                className="border-brand-stone bg-brand-cream min-h-[6rem] w-full rounded-md border px-3 py-2 text-sm"
                {...register("notes")}
              />
            </Field>
          </div>
        ) : null}
      </div>

      {serverError ? (
        <p role="alert" className="text-sm text-red-600">
          {serverError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : mode.kind === "edit" ? "Save changes" : "Create property"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
