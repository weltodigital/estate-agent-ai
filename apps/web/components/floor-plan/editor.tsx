"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type Konva from "konva";
import type { FloorPlan, FloorPlanParsed } from "@app/shared/schemas";
import { Button, Input, Label } from "@app/ui";
import { floorPlanApi, queryKeys } from "@/lib/queries";

// react-konva pulls Konva's canvas which doesn't ship a server build. Dynamic
// import with ssr=false avoids "ReferenceError: window is not defined".
const Stage = dynamic(() => import("react-konva").then((m) => m.Stage), { ssr: false });
const Layer = dynamic(() => import("react-konva").then((m) => m.Layer), { ssr: false });
const Group = dynamic(() => import("react-konva").then((m) => m.Group), { ssr: false });
const KonvaLine = dynamic(() => import("react-konva").then((m) => m.Line), { ssr: false });
const KonvaText = dynamic(() => import("react-konva").then((m) => m.Text), { ssr: false });
const KonvaRect = dynamic(() => import("react-konva").then((m) => m.Rect), { ssr: false });

const STAGE_WIDTH = 900;
const STAGE_HEIGHT = 600;

type Vec = [number, number];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function bounds(plan: FloorPlanParsed): { minX: number; minY: number; maxX: number; maxY: number } {
  const xs = [
    ...plan.rooms.flatMap((r) => r.polygon.map((p) => p[0])),
    ...plan.openings.flatMap((o) => [o.segment[0][0], o.segment[1][0]]),
  ];
  const ys = [
    ...plan.rooms.flatMap((r) => r.polygon.map((p) => p[1])),
    ...plan.openings.flatMap((o) => [o.segment[0][1], o.segment[1][1]]),
  ];
  if (xs.length === 0) return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function polygonCentroid(points: Vec[]): Vec {
  const n = points.length;
  const cx = points.reduce((s, p) => s + p[0], 0) / n;
  const cy = points.reduce((s, p) => s + p[1], 0) / n;
  return [cx, cy];
}

function polygonAreaSqm(points: Vec[], scale: number): number {
  const n = points.length;
  let s = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i]!;
    const [x2, y2] = points[(i + 1) % n]!;
    s += x1 * y2 - x2 * y1;
  }
  return (Math.abs(s) / 2) * scale * scale;
}

type Selection = { kind: "none" } | { kind: "room"; id: string } | { kind: "opening"; id: string };

const ROOM_FILL = "#f1f5f9";
const ROOM_STROKE = "#0f172a";
const ROOM_FILL_SELECTED = "#dbeafe";
const ROOM_STROKE_SELECTED = "#2563eb";

export function FloorPlanEditor({ floorPlanId }: { floorPlanId: string }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.floorPlan(floorPlanId),
    queryFn: () => floorPlanApi.get(floorPlanId),
  });

  const initialPlan = useMemo<FloorPlanParsed | null>(() => {
    const plan = query.data;
    if (!plan) return null;
    const source = (plan.editor_state ?? plan.parsed_json) as FloorPlanParsed | null;
    return source ? clone(source) : null;
  }, [query.data]);

  const [state, setState] = useState<FloorPlanParsed | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [finaliseError, setFinaliseError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed local state once the plan loads.
  useEffect(() => {
    if (initialPlan && !state) setState(initialPlan);
  }, [initialPlan, state]);

  const save = useMutation({
    mutationFn: (next: FloorPlanParsed) => floorPlanApi.saveEditor(floorPlanId, next),
    onMutate: () => setSaveStatus("saving"),
    onSuccess: (row) => {
      setSaveStatus("saved");
      queryClient.setQueryData(queryKeys.floorPlan(floorPlanId), row);
    },
    onError: () => setSaveStatus("error"),
  });

  const finalise = useMutation({
    mutationFn: () => floorPlanApi.finalise(floorPlanId),
    onMutate: () => setFinaliseError(null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.floorPlan(floorPlanId) }),
    onError: (err) => setFinaliseError(err instanceof Error ? err.message : "Could not finalise."),
  });

  // Debounced auto-save on edits.
  function update(updater: (prev: FloorPlanParsed) => FloorPlanParsed) {
    setState((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save.mutate(next), 1000);
      return next;
    });
  }

  // Map plan units to stage pixels.
  const transform = useMemo(() => {
    if (!state) return { scale: 1, ox: 0, oy: 0 };
    const b = bounds(state);
    const w = b.maxX - b.minX || 1;
    const h = b.maxY - b.minY || 1;
    const pad = 20;
    const scale = Math.min((STAGE_WIDTH - pad * 2) / w, (STAGE_HEIGHT - pad * 2) / h);
    const ox = pad - b.minX * scale + (STAGE_WIDTH - pad * 2 - w * scale) / 2;
    const oy = pad - b.minY * scale + (STAGE_HEIGHT - pad * 2 - h * scale) / 2;
    return { scale, ox, oy };
  }, [state]);

  function toStage(p: Vec): Vec {
    return [p[0] * transform.scale + transform.ox, p[1] * transform.scale + transform.oy];
  }
  function toPlan(p: Vec): Vec {
    return [(p[0] - transform.ox) / transform.scale, (p[1] - transform.oy) / transform.scale];
  }

  if (query.isLoading) return <p className="text-brand-slate text-sm">Loading floor plan…</p>;
  if (query.isError)
    return (
      <p role="alert" className="text-sm text-red-600">
        {(query.error as Error).message}
      </p>
    );
  if (!query.data || !state) return null;

  const plan = query.data as FloorPlan;
  const selectedRoom =
    selection.kind === "room" ? state.rooms.find((r) => r.id === selection.id) : null;
  const selectedOpening =
    selection.kind === "opening" ? state.openings.find((o) => o.id === selection.id) : null;

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="border-brand-stone shadow-card flex-1 overflow-hidden rounded-md border bg-white">
        <div className="border-brand-stone flex items-center justify-between border-b px-4 py-2">
          <h1 className="text-brand-ink font-serif text-lg font-medium">
            {plan.floor_label} <span className="text-brand-slate text-sm">· {plan.status}</span>
          </h1>
          <div className="text-brand-slate flex items-center gap-3 text-xs">
            <span>
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : ""}
            </span>
            <Button
              onClick={() => finalise.mutate()}
              disabled={finalise.isPending || saveStatus === "saving"}
            >
              {finalise.isPending ? "Rendering…" : "Finalise"}
            </Button>
          </div>
        </div>
        <Stage
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          onMouseDown={(e: Konva.KonvaEventObject<MouseEvent>) => {
            if (e.target === e.target.getStage()) setSelection({ kind: "none" });
          }}
          className="bg-slate-50"
        >
          <Layer>
            {state.rooms.map((room) => {
              const isSelected = selection.kind === "room" && selection.id === room.id;
              const stagePoints = room.polygon.map(toStage).flat();
              const centroid = polygonCentroid(room.polygon);
              const stageCentroid = toStage(centroid);
              const area =
                room.area_sqm ?? polygonAreaSqm(room.polygon, state.scale_metres_per_unit);
              return (
                <Group
                  key={room.id}
                  draggable
                  onClick={() => setSelection({ kind: "room", id: room.id })}
                  onTap={() => setSelection({ kind: "room", id: room.id })}
                  onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                    const dx = e.target.x();
                    const dy = e.target.y();
                    e.target.position({ x: 0, y: 0 });
                    update((prev) => ({
                      ...prev,
                      rooms: prev.rooms.map((r) =>
                        r.id === room.id
                          ? {
                              ...r,
                              polygon: r.polygon.map(
                                (p) =>
                                  [p[0] + dx / transform.scale, p[1] + dy / transform.scale] as Vec,
                              ),
                            }
                          : r,
                      ),
                    }));
                  }}
                >
                  <KonvaLine
                    points={stagePoints}
                    closed
                    fill={isSelected ? ROOM_FILL_SELECTED : ROOM_FILL}
                    stroke={isSelected ? ROOM_STROKE_SELECTED : ROOM_STROKE}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <KonvaText
                    x={stageCentroid[0] - 60}
                    y={stageCentroid[1] - 10}
                    width={120}
                    align="center"
                    text={room.label}
                    fontSize={14}
                    fill={ROOM_STROKE}
                  />
                  <KonvaText
                    x={stageCentroid[0] - 60}
                    y={stageCentroid[1] + 6}
                    width={120}
                    align="center"
                    text={`${area.toFixed(1)} m²`}
                    fontSize={11}
                    fill="#475569"
                  />
                </Group>
              );
            })}

            {state.openings.map((o) => {
              const isSelected = selection.kind === "opening" && selection.id === o.id;
              const stageA = toStage(o.segment[0]);
              const stageB = toStage(o.segment[1]);
              const stroke = o.kind === "door" ? "#2563eb" : "#16a34a";
              return (
                <Group key={o.id}>
                  <KonvaLine
                    points={[stageA[0], stageA[1], stageB[0], stageB[1]]}
                    stroke={isSelected ? "#dc2626" : stroke}
                    strokeWidth={isSelected ? 4 : 3}
                    dash={o.kind === "window" ? [4, 3] : undefined}
                    onClick={() => setSelection({ kind: "opening", id: o.id })}
                    onTap={() => setSelection({ kind: "opening", id: o.id })}
                  />
                  <DraggableHandle
                    x={stageA[0]}
                    y={stageA[1]}
                    onDragEnd={(nx, ny) => {
                      const planPoint = toPlan([nx, ny]);
                      update((prev) => ({
                        ...prev,
                        openings: prev.openings.map((op) =>
                          op.id === o.id ? { ...op, segment: [planPoint, op.segment[1]] } : op,
                        ),
                      }));
                    }}
                  />
                  <DraggableHandle
                    x={stageB[0]}
                    y={stageB[1]}
                    onDragEnd={(nx, ny) => {
                      const planPoint = toPlan([nx, ny]);
                      update((prev) => ({
                        ...prev,
                        openings: prev.openings.map((op) =>
                          op.id === o.id ? { ...op, segment: [op.segment[0], planPoint] } : op,
                        ),
                      }));
                    }}
                  />
                </Group>
              );
            })}
          </Layer>
        </Stage>
      </div>

      <aside className="border-brand-stone shadow-card w-72 space-y-4 overflow-y-auto rounded-md border bg-white p-4">
        {finaliseError ? (
          <p role="alert" className="text-sm text-red-600">
            {finaliseError}
          </p>
        ) : null}

        {plan.output_pdf_url || plan.output_png_url ? (
          <div className="space-y-1 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <p className="font-medium">Latest export</p>
            <div className="flex flex-wrap gap-3">
              {plan.output_svg_url ? (
                <a
                  className="underline"
                  href={plan.output_svg_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  SVG
                </a>
              ) : null}
              {plan.output_png_url ? (
                <a
                  className="underline"
                  href={plan.output_png_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  PNG
                </a>
              ) : null}
              {plan.output_pdf_url ? (
                <a
                  className="underline"
                  href={plan.output_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  PDF
                </a>
              ) : null}
            </div>
          </div>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Canvas</h2>
          <div className="space-y-1">
            <Label htmlFor="scale">Metres per unit</Label>
            <Input
              id="scale"
              type="number"
              step="0.001"
              min={0.0001}
              value={state.scale_metres_per_unit}
              onChange={(e) =>
                update((prev) => ({
                  ...prev,
                  scale_metres_per_unit: Math.max(
                    0.0001,
                    Number(e.target.value) || prev.scale_metres_per_unit,
                  ),
                }))
              }
            />
          </div>
        </section>

        {selectedRoom ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Room</h2>
            <div className="space-y-1">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                value={selectedRoom.label}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    rooms: prev.rooms.map((r) =>
                      r.id === selectedRoom.id ? { ...r, label: e.target.value } : r,
                    ),
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={selectedRoom.type}
                onChange={(e) =>
                  update((prev) => ({
                    ...prev,
                    rooms: prev.rooms.map((r) =>
                      r.id === selectedRoom.id ? { ...r, type: e.target.value } : r,
                    ),
                  }))
                }
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    openings: [
                      ...prev.openings,
                      {
                        id: `op_${Math.random().toString(36).slice(2, 9)}`,
                        kind: "door",
                        segment: nearestEdge(selectedRoom.polygon),
                      },
                    ],
                  }))
                }
              >
                Add door
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    openings: [
                      ...prev.openings,
                      {
                        id: `op_${Math.random().toString(36).slice(2, 9)}`,
                        kind: "window",
                        segment: nearestEdge(selectedRoom.polygon),
                      },
                    ],
                  }))
                }
              >
                Add window
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (!confirm("Delete this room?")) return;
                  update((prev) => ({
                    ...prev,
                    rooms: prev.rooms.filter((r) => r.id !== selectedRoom.id),
                  }));
                  setSelection({ kind: "none" });
                }}
              >
                Delete room
              </Button>
            </div>
          </section>
        ) : null}

        {selectedOpening ? (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Opening</h2>
            <p className="text-brand-slate text-xs">
              Drag the red handles in the canvas to position. Use the toggle to switch kind.
            </p>
            <div className="flex gap-2">
              <Button
                variant={selectedOpening.kind === "door" ? "default" : "outline"}
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    openings: prev.openings.map((op) =>
                      op.id === selectedOpening.id ? { ...op, kind: "door" } : op,
                    ),
                  }))
                }
              >
                Door
              </Button>
              <Button
                variant={selectedOpening.kind === "window" ? "default" : "outline"}
                onClick={() =>
                  update((prev) => ({
                    ...prev,
                    openings: prev.openings.map((op) =>
                      op.id === selectedOpening.id ? { ...op, kind: "window" } : op,
                    ),
                  }))
                }
              >
                Window
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                update((prev) => ({
                  ...prev,
                  openings: prev.openings.filter((op) => op.id !== selectedOpening.id),
                }));
                setSelection({ kind: "none" });
              }}
            >
              Delete opening
            </Button>
          </section>
        ) : null}

        {!selectedRoom && !selectedOpening ? (
          <p className="text-brand-slate text-xs">
            Click a room or opening to edit. Drag rooms to reposition. Click empty canvas to
            deselect.
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function DraggableHandle({
  x,
  y,
  onDragEnd,
}: {
  x: number;
  y: number;
  onDragEnd: (x: number, y: number) => void;
}) {
  return (
    <KonvaRect
      x={x - 4}
      y={y - 4}
      width={8}
      height={8}
      fill="#dc2626"
      draggable
      onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
        onDragEnd(e.target.x() + 4, e.target.y() + 4);
      }}
    />
  );
}

/** Picks the longest edge of a polygon, midpoint plus a small inset. */
function nearestEdge(polygon: Vec[]): [Vec, Vec] {
  let best = { i: 0, length: -1 };
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const length = Math.hypot(dx, dy);
    if (length > best.length) best = { i, length };
  }
  const a = polygon[best.i]!;
  const b = polygon[(best.i + 1) % polygon.length]!;
  const mid: Vec = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dirX = (b[0] - a[0]) / (best.length || 1);
  const dirY = (b[1] - a[1]) / (best.length || 1);
  const span = best.length * 0.15;
  return [
    [mid[0] - dirX * span, mid[1] - dirY * span],
    [mid[0] + dirX * span, mid[1] + dirY * span],
  ];
}
