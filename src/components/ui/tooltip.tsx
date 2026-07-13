import * as React from "react";
import { Tooltip as T } from "radix-ui";
import { cn } from "@/lib/utils";

// Thin wrapper over radix-ui's Tooltip. TooltipProvider is mounted once (see main.tsx);
// individual tooltips just use <Tip label="…">{trigger}</Tip> for the common case.
export const TooltipProvider = T.Provider;
export const Tooltip = T.Root;
export const TooltipTrigger = T.Trigger;

export function TooltipContent({
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof T.Content>) {
  return (
    <T.Portal>
      <T.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 select-none rounded-md bg-ink-900 px-2.5 py-1.5 font-mono text-[11px] font-medium tracking-wide text-paper-50 shadow-xl shadow-black/40 ring-1 ring-white/10",
          "data-[state=delayed-open]:animate-fade data-[state=instant-open]:animate-fade",
          className,
        )}
        {...props}
      >
        {props.children}
        <T.Arrow className="fill-ink-900" />
      </T.Content>
    </T.Portal>
  );
}

// Convenience: a labelled tooltip around a single trigger element.
export function Tip({
  label,
  side = "top",
  children,
  asChild = true,
}: {
  label: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
  asChild?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}
