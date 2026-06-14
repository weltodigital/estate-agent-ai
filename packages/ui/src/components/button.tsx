import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

const buttonVariants = cva(
  "ring-brand-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary — one per view. Hedge Green on Cream, lightens on hover.
        default:
          "bg-[color:var(--brand-primary,#2E3B36)] text-brand-cream hover:bg-brand-hedge-hover disabled:bg-brand-slate",
        // Secondary — Walnut-bordered, transparent. Multiple per view.
        secondary:
          "border border-brand-walnut/60 bg-transparent text-brand-ink hover:bg-brand-stone/40",
        // Alias kept for existing call sites; same as secondary.
        outline:
          "border border-brand-walnut/60 bg-transparent text-brand-ink hover:bg-brand-stone/40",
        // Tertiary / ghost — lowest emphasis (tables, lists, panels).
        ghost: "bg-transparent text-brand-walnut hover:bg-brand-stone/25 hover:text-brand-ink",
        // Destructive — Terracotta-adjacent red, used sparingly.
        destructive: "bg-red-700 text-brand-cream hover:bg-red-800",
        // Terracotta CTA — marketing primary, "Upgrade plan", "Start free trial".
        terracotta: "bg-brand-terracotta text-brand-terracotta-cream hover:opacity-90",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-5",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
