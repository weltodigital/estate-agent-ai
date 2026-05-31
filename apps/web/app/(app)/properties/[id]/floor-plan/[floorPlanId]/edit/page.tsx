export default function FloorPlanEditorPage({
  params,
}: {
  params: { id: string; floorPlanId: string };
}) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Floor plan editor</h1>
      <p className="text-sm text-slate-500">
        Property: {params.id} · Floor plan: {params.floorPlanId}
      </p>
      <div className="aspect-video w-full rounded-md border border-dashed border-slate-300 bg-white text-center text-slate-400">
        <div className="flex h-full items-center justify-center">
          Konva canvas placeholder — implementation lands in feature prompt 7.
        </div>
      </div>
    </section>
  );
}
