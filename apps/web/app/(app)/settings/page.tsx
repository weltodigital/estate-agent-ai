import { SettingsTabs } from "@/components/settings/settings-tabs";

export const metadata = { title: "Settings — Estate Agent AI" };

export default function SettingsPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <SettingsTabs />
    </section>
  );
}
