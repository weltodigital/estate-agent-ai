import * as React from "react";
import { cn } from "../lib/cn";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        className={cn(
          "border-brand-stone bg-brand-bone text-brand-ink flex h-10 w-full rounded-lg border px-3.5 text-[15px]",
          "placeholder:text-brand-slate",
          "focus:border-brand-hedge transition-shadow focus:shadow-[0_0_0_3px_rgba(46,59,54,0.15)] focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
