import * as React from "react";
import { cn } from "../lib/cn.js";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type ?? "text"}
        className={cn(
          "flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm",
          "placeholder:text-slate-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-primary,#0f172a)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
