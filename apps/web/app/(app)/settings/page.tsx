const TABS = ["Agency", "Branding", "Team", "Billing"] as const;

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <nav className="flex gap-4 border-b border-slate-200 pb-2 text-sm">
        {TABS.map((tab) => (
          <span key={tab} className="cursor-pointer text-slate-600 hover:text-slate-900">
            {tab}
          </span>
        ))}
      </nav>
      <p className="text-slate-600">Placeholder.</p>
    </section>
  );
}
