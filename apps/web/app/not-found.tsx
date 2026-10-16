import Link from "next/link";
import { StandalonePage } from "@/components/platform/standalone-page";
import { buttonClasses } from "@/components/ui/button";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <StandalonePage
      title="We can't find that page"
      actions={
        <>
          <Link href="/dashboard" className={buttonClasses("primary")}>
            Go to your dashboard
          </Link>
          <Link href="/" className={buttonClasses("secondary")}>
            Privett home
          </Link>
        </>
      }
    >
      <p>The link may be out of date, or the branch may have been removed. If you followed a link from us, let us know at ed@useprivett.com.</p>
    </StandalonePage>
  );
}
