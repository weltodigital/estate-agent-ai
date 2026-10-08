import Link from "next/link";
import { Building2, CreditCard, LayoutGrid, Shield, Users } from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { OrgSwitcher } from "@/components/app/org-switcher";
import type { OrgContext } from "@/lib/auth";

export function Sidebar({ ctx, branches }: { ctx: OrgContext; branches: { id: string; name: string; town: string }[] }) {
  const icon = { size: 16, strokeWidth: 1.5, className: "text-brand-slate" };
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-brand-stone bg-brand-cream md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" aria-label="Privett home">
          <Wordmark size={22} />
        </Link>
      </div>
      <OrgSwitcher current={ctx.org.id} memberships={ctx.memberships} />
      <nav className="flex-1 space-y-6 px-3 py-4 text-sm">
        <div>
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-brand-slate">Branches</p>
          <ul className="space-y-0.5">
            {branches.map((b) => (
              <li key={b.id}>
                <Link href={`/branches/${b.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-brand-ink hover:bg-white">
                  <Building2 {...icon} />
                  <span className="truncate">{b.name}</span>
                  <span className="ml-auto truncate text-xs text-brand-slate">{b.town}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/branches/new" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-brand-walnut hover:bg-white">
                <LayoutGrid {...icon} />
                Add a branch
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="px-2 pb-1 text-xs font-medium uppercase tracking-wide text-brand-slate">Organisation</p>
          <ul className="space-y-0.5">
            <li>
              <Link href="/settings/billing" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-brand-ink hover:bg-white">
                <CreditCard {...icon} /> Plan and billing
              </Link>
            </li>
            <li>
              <Link href="/settings/team" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-brand-ink hover:bg-white">
                <Users {...icon} /> Team
              </Link>
            </li>
            {ctx.isAdmin ? (
              <li>
                <Link href="/admin/league-tables" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-brand-ink hover:bg-white">
                  <Shield {...icon} /> League tables
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </nav>
      <div className="border-t border-brand-stone px-5 py-4 text-xs text-brand-slate">
        <p className="truncate">{ctx.user.email}</p>
        <form action="/auth/signout" method="post">
          <button className="mt-1 text-brand-walnut underline-offset-2 hover:underline">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
