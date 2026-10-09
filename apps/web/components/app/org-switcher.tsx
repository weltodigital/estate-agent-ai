import { switchOrganisation } from "@/app/(app)/actions";

export function OrgSwitcher({
  current,
  memberships,
}: {
  current: string;
  memberships: { org_id: string; name: string }[];
}) {
  if (memberships.length < 2) {
    return <p className="px-5 text-sm font-medium text-ink-muted">{memberships[0]?.name}</p>;
  }
  return (
    <form action={switchOrganisation} className="px-5">
      <select
        name="org_id"
        defaultValue={current}
        className="w-full rounded-md border border-hairline bg-surface-raised px-2 py-1.5 text-sm"
        aria-label="Organisation"
      >
        {memberships.map((m) => (
          <option key={m.org_id} value={m.org_id}>
            {m.name}
          </option>
        ))}
      </select>
      <button className="mt-1 text-small text-ink-muted underline">Switch</button>
    </form>
  );
}
