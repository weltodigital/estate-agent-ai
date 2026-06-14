import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "../lib/cn";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Optional label rendered to the right of the box. */
  label?: React.ReactNode;
}

/**
 * Custom checkbox replacing the browser default: 18px square, Cream/Walnut when
 * unchecked, Hedge Green with a Cream check when checked. See design pass.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => (
    <label className="text-brand-ink inline-flex cursor-pointer items-center gap-2.5 text-sm">
      <span className="relative inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">
        <input
          ref={ref}
          type="checkbox"
          className={cn(
            "ring-brand-focus border-brand-walnut bg-brand-cream peer h-[18px] w-[18px] cursor-pointer appearance-none rounded-[4px] border-[0.5px] transition-colors",
            "hover:border-brand-hedge checked:border-brand-hedge checked:bg-brand-hedge",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          {...props}
        />
        <Check
          className="text-brand-cream pointer-events-none absolute hidden h-3.5 w-3.5 peer-checked:block"
          strokeWidth={2}
          aria-hidden
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  ),
);
Checkbox.displayName = "Checkbox";
