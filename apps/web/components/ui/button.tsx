import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-on-brand hover-fine:bg-brand/90",
  secondary: "border border-hairline bg-surface-raised text-ink hover-fine:bg-brand-tint",
  ghost: "text-brand hover-fine:bg-brand-tint",
  danger: "border border-down/30 bg-surface-raised text-down hover-fine:bg-down/10",
  // The primary action on a brand-filled band, where a brand button would vanish.
  inverse: "bg-on-brand text-brand hover-fine:bg-on-brand/90",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[14px] leading-5",
  md: "h-10 px-4 text-[14px] leading-5",
  lg: "h-12 px-6 text-[15px] leading-5",
};

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(
    "ring-brand-focus inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-[transform,background-color,color] duration-120 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(({ variant, size, className, ...props }, ref) => (
  <button ref={ref} className={buttonClasses(variant, size, className)} {...props} />
));
Button.displayName = "Button";
