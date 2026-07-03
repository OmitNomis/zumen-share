/* eslint-disable react-refresh/only-export-components -- buttonVariants (cva config) lives beside the component that uses it, same convention as the old ui.tsx */
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      // primary/outline/ghost/danger are this app's canonical names (kept from the pre-shadcn
      // Button so every existing call site compiles unchanged). default/destructive are aliases
      // so shadcn-vendored components (e.g. AlertDialogAction/Cancel) that default to those
      // variant names still resolve to the same drafting-room styling.
      variant: {
        primary: "bg-print-600 text-white shadow-sm shadow-print-900/30 hover:bg-print-500 active:bg-print-700",
        default: "bg-print-600 text-white shadow-sm shadow-print-900/30 hover:bg-print-500 active:bg-print-700",
        outline:
          "border-paper-300 bg-white text-ink-700 hover:border-print-400 hover:text-print-700 aria-expanded:border-print-400 aria-expanded:text-print-700",
        secondary: "border-transparent bg-paper-200 text-ink-700 hover:bg-paper-300",
        ghost:
          "text-ink-500 hover:bg-paper-200/70 hover:text-ink-800 aria-expanded:bg-paper-200/70 aria-expanded:text-ink-800",
        danger: "bg-verm-600 text-white hover:bg-verm-500",
        destructive: "bg-verm-600 text-white hover:bg-verm-500",
        link: "border-transparent text-print-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 gap-2 px-3.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-10",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
