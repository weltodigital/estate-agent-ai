"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TONE_OPTIONS, type Tone } from "@app/shared/constants";
import type { GenerateDescriptionRequest, Property } from "@app/shared/schemas";
import { Button } from "@app/ui";
import { propertyApi, queryKeys, streamApi } from "@/lib/queries";

const TONE_LABELS: Record<Tone, string> = {
  professional: "Professional",
  friendly: "Friendly",
  luxury: "Luxury",
  lettings: "Lettings",
};

export function DescriptionPanel({ property }: { property: Property }) {
  const queryClient = useQueryClient();
  const [tone, setTone] = useState<Tone>(property.description_tone ?? "professional");
  const [highlights, setHighlights] = useState("");
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

  const save = useMutation({
    mutationFn: async () => {
      const text = editor?.getText().trim() ?? "";
      return propertyApi.update(property.id, {
        description: text.length > 0 ? text : null,
        description_tone: tone,
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

    const body: GenerateDescriptionRequest = {
      tone,
      highlights: highlights
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
    };

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
    <section className="space-y-4">
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
        <label className="space-y-1 text-sm">
          <span className="block font-medium">Highlights (optional, one per line)</span>
          <textarea
            value={highlights}
            onChange={(e) => setHighlights(e.target.value)}
            placeholder="South-facing garden&#10;Off-street parking"
            className="min-h-[5rem] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
          />
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

function toHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n{2,}/).map((p) => p.replace(/\n/g, "<br />"));
  return paragraphs.map((p) => `<p>${p}</p>`).join("");
}
