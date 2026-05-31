const TABS = ["Photos", "Description", "Floor Plan", "EPC", "Activity"] as const;

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Property {params.id}</h1>
        <p className="text-sm text-slate-500">Property detail placeholder.</p>
      </header>
      <nav className="flex gap-4 border-b border-slate-200 pb-2 text-sm">
        {TABS.map((tab) => (
          <span key={tab} className="cursor-pointer text-slate-600 hover:text-slate-900">
            {tab}
          </span>
        ))}
      </nav>
    </section>
  );
}
