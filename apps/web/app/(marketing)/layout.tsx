import type { ReactNode } from "react";
import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-brand-bone text-brand-ink min-h-screen">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
