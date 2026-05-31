export default function PropertiesListPage() {
  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Properties</h1>
        <button className="rounded-md bg-[color:var(--brand-primary)] px-3 py-2 text-sm font-medium text-white">
          New property
        </button>
      </header>
      <p className="text-slate-600">
        Placeholder list view. Implementation lands in feature prompt 2.
      </p>
    </section>
  );
}
