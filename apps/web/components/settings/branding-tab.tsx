"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agency, UpdateAgencyRequest } from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { agencyApi } from "@/lib/queries";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function BrandingTab() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data } = useQuery<Agency>({
    queryKey: ["agency", "me"],
    queryFn: agencyApi.me,
  });

  useEffect(() => {
    if (!data) return;
    setPrimary(data.brand_colour_primary ?? "#0f172a");
    setSecondary(data.brand_colour_secondary ?? "#e2e8f0");
  }, [data]);

  const update = useMutation<Agency, Error, UpdateAgencyRequest>({
    mutationFn: agencyApi.update,
    onSuccess: (row) => queryClient.setQueryData(["agency", "me"], row),
  });

  async function onLogo(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { upload_url } = await agencyApi.createLogoUpload({
        filename: file.name,
        content_type: file.type || "image/png",
      });
      const putRes = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "content-type": file.type || "image/png" },
      });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      await queryClient.invalidateQueries({ queryKey: ["agency", "me"] });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function saveColours() {
    if (!HEX_RE.test(primary) || !HEX_RE.test(secondary)) {
      return;
    }
    update.mutate({
      brand_colour_primary: primary,
      brand_colour_secondary: secondary,
    });
  }

  if (!data) return <p className="text-sm text-slate-500">Loading branding…</p>;

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Logo</h2>
        </header>
        <div className="flex flex-wrap items-center gap-4">
          {data.logo_url ? (
            <img
              src={data.logo_url}
              alt="Agency logo"
              className="h-16 max-w-[8rem] object-contain"
            />
          ) : (
            <div className="flex h-16 w-32 items-center justify-center rounded border border-dashed border-slate-300 text-xs text-slate-400">
              No logo yet
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onLogo(e.target.files)}
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : data.logo_url ? "Replace logo" : "Upload logo"}
          </Button>
        </div>
        {uploadError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {uploadError}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Brand colours</h2>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <ColourField
            id="primary"
            label="Primary"
            value={primary}
            onChange={setPrimary}
            preview="bg-[color:var(--brand-primary)]"
          />
          <ColourField
            id="secondary"
            label="Secondary"
            value={secondary}
            onChange={setSecondary}
            preview="bg-[color:var(--brand-secondary)]"
          />
        </div>

        {update.isError ? (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {(update.error as Error).message}
          </p>
        ) : null}
        {update.isSuccess ? <p className="mt-3 text-sm text-emerald-700">Saved.</p> : null}

        <div className="mt-4">
          <Button
            onClick={saveColours}
            disabled={update.isPending || !HEX_RE.test(primary) || !HEX_RE.test(secondary)}
          >
            {update.isPending ? "Saving…" : "Save colours"}
          </Button>
        </div>
      </div>
    </section>
  );
}

function ColourField({
  id,
  label,
  value,
  onChange,
  preview,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  preview: string;
}) {
  const valid = HEX_RE.test(value);
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded border border-slate-300"
          aria-label={`${label} colour picker`}
        />
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      <div className={`h-3 w-full rounded ${preview}`} />
      {!valid ? <p className="text-xs text-red-600">Use a 6-digit hex (e.g. #0f172a).</p> : null}
    </div>
  );
}
