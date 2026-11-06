import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "light" | "whatsapp";
type Size = "md" | "lg" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition duration-200 disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-papel-700 text-white hover:bg-papel-800 shadow-[0_8px_20px_-10px_rgb(9_81_70/0.8)]",
  secondary: "bg-white text-papel-800 ring-1 ring-inset ring-papel-200 hover:ring-papel-400 hover:bg-papel-50",
  ghost: "text-papel-700 hover:bg-papel-50",
  light: "bg-white text-papel-900 hover:bg-anis-soft",
  whatsapp: "bg-[#1f9d55] text-white hover:bg-[#178347]",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[0.95rem]",
  lg: "h-12 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Button({ variant, size, className, ...props }: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}
