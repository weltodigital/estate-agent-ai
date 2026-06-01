"use client";

import { useState } from "react";
import { AgencyTab } from "./agency-tab";
import { BillingTab } from "./billing-tab";
import { BrandingTab } from "./branding-tab";
import { TeamTab } from "./team-tab";

const TABS = [
  { key: "agency", label: "Agency" },
  { key: "branding", label: "Branding" },
  { key: "team", label: "Team" },
  { key: "billing", label: "Billing" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SettingsTabs() {
  const [tab, setTab] = useState<TabKey>("agency");

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
        {tab === "agency" ? <AgencyTab /> : null}
        {tab === "branding" ? <BrandingTab /> : null}
        {tab === "team" ? <TeamTab /> : null}
        {tab === "billing" ? <BillingTab /> : null}
      </div>
    </div>
  );
}
