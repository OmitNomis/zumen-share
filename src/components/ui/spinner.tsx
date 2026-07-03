import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => (
  <Loader2 className={cn("animate-spin", className)} />
);
