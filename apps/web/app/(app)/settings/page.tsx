import { SettingsTabs, type SettingsTabKey } from "@/components/settings/settings-tabs";

export const metadata = { title: "Settings" };

const TAB_KEYS: SettingsTabKey[] = ["agency", "branding", "team", "billing"];

export default function SettingsPage({
  searchParams,
}: {
  searchParams: { tab?: string; billing?: string };
}) {
  // Deep-links: ?tab=billing from the dashboard, and ?billing=success|cancelled
  // from the Stripe checkout redirect both land on the Billing tab.
  const requested = searchParams.billing ? "billing" : searchParams.tab;
  const initialTab = TAB_KEYS.find((t) => t === requested) ?? "agency";

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsTabs initialTab={initialTab} />
    </section>
  );
}
