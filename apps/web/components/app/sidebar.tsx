import Link from "next/link";
import { Building2, CreditCard, LayoutGrid, Shield, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { OrgSwitcher } from "@/components/app/org-switcher";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import type { OrgContext } from "@/lib/auth";

export function Sidebar({ ctx, branches }: { ctx: OrgContext; branches: { id: string; name: string; town: string }[] }) {
  const icon = { size: 16, strokeWidth: 1.5, className: "text-ink-muted" };
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-hairline bg-surface-sunken md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-5 py-5">
        <Link href="/dashboard" aria-label="Privett home">
          <Logo size={22} />
        </Link>
        <ThemeToggle />
      </div>
      <OrgSwitcher current={ctx.org.id} memberships={ctx.memberships} />
      <nav className="flex-1 space-y-6 px-3 py-4 text-sm">
        <div>
          <p className="px-2 pb-1 text-small font-medium uppercase tracking-wide text-ink-muted">Branches</p>
          <ul className="space-y-0.5">
            {branches.map((b) => (
              <li key={b.id}>
                <Link href={`/branches/${b.id}`} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink hover:bg-brand-tint">
                  <Building2 {...icon} />
                  <span className="truncate">{b.name}</span>
                  <span className="ml-auto truncate text-small text-ink-muted">{b.town}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/branches/new" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink-muted hover:bg-brand-tint">
                <LayoutGrid {...icon} />
                Add a branch
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="px-2 pb-1 text-small font-medium uppercase tracking-wide text-ink-muted">Organisation</p>
          <ul className="space-y-0.5">
            <li>
              <Link href="/settings/billing" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink hover:bg-brand-tint">
                <CreditCard {...icon} /> Plan and billing
              </Link>
            </li>
            <li>
              <Link href="/settings/team" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink hover:bg-brand-tint">
                <Users {...icon} /> Team
              </Link>
            </li>
            {ctx.isAdmin ? (
              <li>
                <Link href="/admin/league-tables" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-ink hover:bg-brand-tint">
                  <Shield {...icon} /> League tables
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </nav>
      <div className="border-t border-hairline px-5 py-4 text-small text-ink-muted">
        <p className="truncate">{ctx.user.email}</p>
        <form action="/auth/signout" method="post">
          <button className="mt-1 text-ink-muted underline-offset-2 hover:underline">Sign out</button>
        </form>
      </div>
    </aside>
  );
}
