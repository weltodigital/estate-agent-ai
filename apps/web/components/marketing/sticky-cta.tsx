"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Phones only: a slim "Run free scan" bar once the hero form has scrolled out of view. */
export function StickyCta({ targetId }: { targetId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setShow(!e!.isIntersecting && e!.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface-raised/95 px-4 py-2 backdrop-blur transition-[opacity,transform] duration-240 ease-out md:hidden",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <Link href="/free-scan" tabIndex={show ? 0 : -1} className={buttonClasses("primary", "lg", "h-12 w-full")}>
        Run free scan
      </Link>
    </div>
  );
}
