"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TONE_OPTIONS, type Tone } from "@app/shared/constants";
import type { DescriptionInputs, GenerateDescriptionRequest, Property } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { propertyApi, queryKeys, streamApi } from "@/lib/queries";

const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  luxury: "Luxury",
  lettings: "Lettings",
};

const CONDITION_OPTIONS = [
  "Immaculate",
  "Good condition",
  "Newly refurbished",
  "Neutrally decorated",
  "Needs modernising",
  "Needs renovation",
];

type Furnished = NonNullable<DescriptionInputs["furnished"]>;
const FURNISHED_OPTIONS: { value: Furnished; label: string }[] = [
  { value: "furnished", label: "Furnished" },
  { value: "part_furnished", label: "Part-furnished" },
  { value: "unfurnished", label: "Unfurnished" },
];

const COUNCIL_TAX_BANDS = ["A", "B", "C", "D", "E", "F", "G", "H"];

// Feature categories with common pre-made chips. Agents can also add their own.
const FEATURE_CATEGORIES: { id: string; label: string; presets: string[] }[] = [
  {
    id: "unique",
    label: "Unique features",
    presets: [
      "Period features",
      "High ceilings",
      "Original fireplace",
      "Exposed beams",
      "Bay windows",
      "Underfloor heating",
    ],
  },
  {
    id: "kitchen",
    label: "Kitchen",
    presets: [
      "Open-plan",
      "Fitted units",
      "Integrated appliances",
      "Kitchen island",
      "Breakfast bar",
      "Recently refitted",
    ],
  },
  {
    id: "bathroom",
    label: "Bathroom",
    presets: [
      "Family bathroom",
      "En-suite",
      "Freestanding bath",
      "Walk-in shower",
      "Heated towel rail",
      "Recently refitted",
    ],
  },
  {
    id: "outside",
    label: "Outside / garden",
    presets: [
      "Private garden",
      "South-facing",
      "Off-street parking",
      "Garage",
      "Patio",
      "Driveway",
    ],
  },
  {
    id: "location",
    label: "Location",
    presets: [
      "Close to schools",
      "Near transport links",
      "Town centre",
      "Quiet road",
      "Near park",
      "Sought-after area",
    ],
  },
  {
    id: "ideal_for",
    label: "Ideal for",
    presets: [
      "First-time buyers",
      "Families",
      "Investors",
      "Downsizers",
      "Professionals",
      "Renovation project",
    ],
  },
];

const EMPTY_INPUTS: DescriptionInputs = {
  condition: [],
  furnished: null,
  council_tax_band: null,
  features: {},
  other_details: "",
};

function normaliseInputs(stored: DescriptionInputs | null | undefined): DescriptionInputs {
  if (!stored) return EMPTY_INPUTS;
  return {
    condition: stored.condition ?? [],
    furnished: stored.furnished ?? null,
    council_tax_band: stored.council_tax_band ?? null,
    features: stored.features ?? {},
    other_details: stored.other_details ?? "",
  };
}

export function DescriptionPanel({ property }: { property: Property }) {
  const queryClient = useQueryClient();
  const [tone, setTone] = useState<Tone>(property.description_tone ?? "professional");
  const [inputs, setInputs] = useState<DescriptionInputs>(() =>
    normaliseInputs(property.description_inputs),
  );
  const [streaming, setStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: property.description ? toHtml(property.description) : "",
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[12rem] rounded-md border border-slate-300 bg-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[color:var(--brand-primary)]",
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function setFeature(categoryId: string, values: string[]) {
    setInputs((prev) => ({ ...prev, features: { ...prev.features, [categoryId]: values } }));
  }

  const save = useMutation({
    mutationFn: async () => {
      const text = editor?.getText().trim() ?? "";
      return propertyApi.update(property.id, {
        description: text.length > 0 ? text : null,
        description_tone: tone,
        description_inputs: inputs,
      });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.property(property.id), updated);
      queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
  });

  async function generate() {
    if (!editor) return;
    setStreamError(null);
    setStreaming(true);
    editor.setEditable(false);
    editor.commands.setContent("");

    const body: GenerateDescriptionRequest = { tone, inputs };

    let buffer = "";
    try {
      for await (const chunk of streamApi(`/v1/properties/${property.id}/description`, body)) {
        buffer += chunk;
        editor.commands.setContent(toHtml(buffer), false);
      }
      // Detect the in-band error marker we write from the API on stream
      // failures (see routes/properties.ts).
      const markerIndex = buffer.indexOf("\n\n[ERROR] ");
      if (markerIndex !== -1) {
        const message = buffer.slice(markerIndex + "\n\n[ERROR] ".length).trim();
        const cleaned = buffer.slice(0, markerIndex).trim();
        editor.commands.setContent(toHtml(cleaned), false);
        setStreamError(message || "Generation failed.");
      }
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setStreaming(false);
      editor.setEditable(true);
    }
  }

  if (!editor) {
    return <p className="text-sm text-slate-500">Loading editor…</p>;
  }

  return (
    <section className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold">Property details</h3>
        <p className="text-xs text-slate-500">
          Add the details you want included, then generate. The more you add, the more specific the
          description. Your selections are saved for next time.
        </p>
      </div>

      <ChipMultiSelect
        label="Condition"
        options={CONDITION_OPTIONS}
        selected={inputs.condition}
        onChange={(condition) => setInputs((prev) => ({ ...prev, condition }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <span className="block text-sm font-medium">Furnishing</span>
          <div className="flex flex-wrap gap-2">
            {FURNISHED_OPTIONS.map((o) => {
              const active = inputs.furnished === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() =>
                    setInputs((prev) => ({ ...prev, furnished: active ? null : o.value }))
                  }
                  className={chipClass(active)}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
        <label className="space-y-2 text-sm">
          <span className="block font-medium">Council tax band</span>
          <select
            value={inputs.council_tax_band ?? ""}
            onChange={(e) =>
              setInputs((prev) => ({ ...prev, council_tax_band: e.target.value || null }))
            }
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            <option value="">Not specified</option>
            {COUNCIL_TAX_BANDS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>
      </div>

      {FEATURE_CATEGORIES.map((cat) => (
        <ChipMultiSelect
          key={cat.id}
          label={cat.label}
          options={cat.presets}
          selected={inputs.features[cat.id] ?? []}
          onChange={(values) => setFeature(cat.id, values)}
          allowCustom
        />
      ))}

      <label className="space-y-1 text-sm">
        <span className="block font-medium">Any other details</span>
        <textarea
          value={inputs.other_details}
          onChange={(e) => setInputs((prev) => ({ ...prev, other_details: e.target.value }))}
          placeholder="Anything else worth mentioning: recent works, chain-free, viewings, etc."
          className="min-h-[5rem] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-3 md:grid-cols-[12rem_1fr]">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Tone</span>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value as Tone)}
            className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
          >
            {TONE_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {TONE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={generate} disabled={streaming}>
          {streaming ? "Generating…" : "Generate description"}
        </Button>
        <Button
          variant="outline"
          onClick={() => save.mutate()}
          disabled={save.isPending || streaming}
        >
          {save.isPending ? "Saving…" : "Save"}
        </Button>
        {save.isSuccess ? <span className="text-xs text-emerald-700">Saved.</span> : null}
      </div>

      {streamError ? (
        <p role="alert" className="text-sm text-red-600">
          {streamError}
        </p>
      ) : null}

      <EditorContent editor={editor} />
    </section>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "rounded-full border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-1 text-xs font-medium text-white"
    : "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-slate-400";
}

function ChipMultiSelect({
  label,
  options,
  selected,
  onChange,
  allowCustom = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = useState("");
  // Show the presets plus any custom selections that aren't presets.
  const chips = [...options, ...selected.filter((s) => !options.includes(s))];

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((s) => s !== value) : [...selected, value]);
  }

  function addCustom() {
    const value = custom.trim();
    if (value && !selected.includes(value)) onChange([...selected, value]);
    setCustom("");
  }

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium">
        {label}
        {selected.length > 0 ? (
          <span className="ml-1 font-normal text-slate-400">({selected.length})</span>
        ) : null}
      </span>
      <div className="flex flex-wrap gap-2">
        {chips.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={chipClass(selected.includes(opt))}
          >
            {opt}
          </button>
        ))}
      </div>
      {allowCustom ? (
        <div className="flex gap-2">
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Add your own"
            className="h-9 w-48 rounded-md border border-slate-300 bg-white px-3 text-sm"
          />
          <Button variant="outline" onClick={addCustom} disabled={!custom.trim()}>
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function toHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n{2,}/).map((p) => p.replace(/\n/g, "<br />"));
  return paragraphs.map((p) => `<p>${p}</p>`).join("");
}
