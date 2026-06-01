"use client";

import { useState } from "react";
import { BillingTab } from "./billing-tab";

const TABS = [
  { key: "agency", label: "Agency" },
  { key: "branding", label: "Branding" },
  { key: "team", label: "Team" },
  { key: "billing", label: "Billing" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SettingsTabs() {
  const [tab, setTab] = useState<TabKey>("billing");

  return (
    <div className="space-y-4">
      <nav className="flex gap-4 border-b border-slate-200 text-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-1 py-2 ${
              tab === t.key
                ? "border-[color:var(--brand-primary)] font-medium text-slate-900"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div>
        {tab === "billing" ? <BillingTab /> : null}
        {tab === "agency" ? (
          <Placeholder>Agency profile lands in feature prompt 9.</Placeholder>
        ) : null}
        {tab === "branding" ? (
          <Placeholder>Branding controls land in feature prompt 9.</Placeholder>
        ) : null}
        {tab === "team" ? (
          <Placeholder>Team management lands in feature prompt 9.</Placeholder>
        ) : null}
      </div>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
      {children}
    </div>
  );
}
