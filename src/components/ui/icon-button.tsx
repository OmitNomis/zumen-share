import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function IconButton({
  label,
  danger = false,
  dark = false,
  className,
  children,
  ...rest
}: React.ComponentProps<"button"> & { label: string; danger?: boolean; dark?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      title={label}
      aria-label={label}
      className={cn(
        dark
          ? "text-ink-300 hover:bg-white/10 hover:text-white"
          : danger
            ? "text-ink-400 hover:bg-verm-50 hover:text-verm-600"
            : "text-ink-500 hover:bg-paper-200/70 hover:text-ink-800",
        "disabled:opacity-40",
        className
      )}
      {...rest}
    >
      {children}
    </Button>
  );
}
