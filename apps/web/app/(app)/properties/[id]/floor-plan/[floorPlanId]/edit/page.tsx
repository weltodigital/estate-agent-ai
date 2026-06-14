import { FloorPlanEditor } from "@/components/floor-plan/editor";

export const metadata = { title: "Floor plan editor" };

export default function FloorPlanEditorPage({
  params,
}: {
  params: { id: string; floorPlanId: string };
}) {
  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Floor plan editor</h1>
        <a href={`/properties/${params.id}`} className="text-brand-walnut text-sm underline">
          ← Back to property
        </a>
      </header>
      <FloorPlanEditor floorPlanId={params.floorPlanId} />
    </section>
  );
}
