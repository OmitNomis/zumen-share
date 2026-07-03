import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/* inspection-stamp badge: bordered, mono, uppercase — no shadcn Badge equivalent
   has these 5 drafting-room tones, so this stays a bespoke primitive. */
const stampVariants = cva(
  "inline-flex shrink-0 items-center rounded-[3px] border px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-wider",
  {
    variants: {
      tone: {
        print: "border-print-200 bg-print-50 text-print-700",
        verm: "border-verm-200 bg-verm-50 text-verm-600",
        leaf: "border-emerald-200 bg-emerald-50 text-emerald-700",
        amber: "border-amber-200 bg-amber-50 text-amber-700",
        ink: "border-paper-300 bg-paper-100 text-ink-500",
      },
    },
    defaultVariants: { tone: "print" },
  }
);

export function Stamp({
  tone,
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof stampVariants>) {
  return <span className={cn(stampVariants({ tone }), className)} {...props} />;
}
