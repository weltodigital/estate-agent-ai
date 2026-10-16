import Link from "next/link";
import { BookOpen, Building2, CircleUser, CreditCard, LayoutGrid, Shield, Users } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { NavLink } from "@/components/app/nav-link";
import { OrgSwitcher } from "@/components/app/org-switcher";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import type { OrgContext } from "@/lib/auth";

export function Sidebar({ ctx, branches }: { ctx: OrgContext; branches: { id: string; name: string; town: string }[] }) {
  const icon = { size: 16, strokeWidth: 1.5, className: "shrink-0", "aria-hidden": true } as const;
  const nav = (
    <>
      <OrgSwitcher current={ctx.org.id} memberships={ctx.memberships} />
      <nav className="flex-1 space-y-6 px-3 py-4 text-sm">
        <div>
          <p className="px-2 pb-1 text-label uppercase text-ink-muted">Branches</p>
          <ul className="space-y-0.5">
            {branches.map((b) => (
              <li key={b.id}>
                <NavLink href={`/branches/${b.id}`}>
                  <Building2 {...icon} />
                  <span className="truncate" title={b.name}>{b.name}</span>
                  <span className="ml-auto truncate text-small opacity-80">{b.town}</span>
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink href="/branches/new" exact>
                <LayoutGrid {...icon} />
                Add a branch
              </NavLink>
            </li>
          </ul>
        </div>
        <div>
          <p className="px-2 pb-1 text-label uppercase text-ink-muted">Organisation</p>
          <ul className="space-y-0.5">
            <li>
              <NavLink href="/settings/billing">
                <CreditCard {...icon} /> Plan and billing
              </NavLink>
            </li>
            <li>
              <NavLink href="/settings/team">
                <Users {...icon} /> Team
              </NavLink>
            </li>
            <li>
              <NavLink href="/settings/account">
                <CircleUser {...icon} /> Account
              </NavLink>
            </li>
            <li>
              <NavLink href="/how-it-works" newTab>
                <BookOpen {...icon} /> How Privett works
              </NavLink>
            </li>
            {ctx.isAdmin ? (
              <li>
                <NavLink href="/admin/league-tables">
                  <Shield {...icon} /> League tables
                </NavLink>
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
    </>
  );
  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-hairline bg-surface-sunken md:min-h-screen md:w-60 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-5 py-4 md:py-5">
        <Link href="/dashboard" aria-label="Privett home">
          <Logo size={22} />
        </Link>
        <ThemeToggle />
      </div>
      {/* Phones: the navigation folds into a menu so content comes first. */}
      <details className="group border-t border-hairline md:hidden">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 text-sm text-ink">
          <span className="truncate">{ctx.org.name}</span>
          <span className="text-small text-ink-muted group-open:hidden">Menu</span>
          <span className="hidden text-small text-ink-muted group-open:inline">Close</span>
        </summary>
        <div className="flex flex-col">{nav}</div>
      </details>
      <div className="hidden flex-1 flex-col md:flex">{nav}</div>
    </aside>
  );
}
