"use client";

import { Info } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const MARGIN = 12;

/**
 * Accessible hover/focus tooltip for metric formulas. It opens below the icon
 * and nudges itself sideways so it never runs off the screen, wherever the
 * icon sits (the right-hand metric card, a phone).
 */
export function InfoTip({ children, label = "How this is calculated" }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0);
  const tip = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open || !tip.current) return;
    const r = tip.current.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    // r includes the current shift; work out the unshifted position first.
    const left = r.left - shift;
    const right = r.right - shift;
    let next = 0;
    if (right > vw - MARGIN) next = vw - MARGIN - right;
    if (left + next < MARGIN) next = MARGIN - left;
    // Settles in one pass: the next run computes the same shift.
    if (next !== shift) setShift(next);
  }, [open, shift]);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="ring-brand-focus rounded text-ink-muted"
        onClick={(e) => {
          // Inside a card link: show the explanation, don't follow the link.
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <Info size={14} strokeWidth={1.5} />
      </button>
      {open ? (
        // Outer span positions (and shifts); inner span animates, so the two
        // transforms never fight.
        <span
          ref={tip}
          role="tooltip"
          style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
          className="pointer-events-none absolute left-1/2 top-6 z-30 block w-72 max-w-[calc(100vw-24px)]"
        >
          <span className="block rounded-md border border-hairline bg-surface-raised p-3 text-small font-normal normal-case leading-relaxed tracking-normal text-ink-muted shadow-pop animate-pop-in">
            {children}
          </span>
        </span>
      ) : null}
    </span>
  );
}
