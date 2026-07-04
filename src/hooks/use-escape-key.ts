import { useEffect } from "react";

// closes on Escape when enabled — shared by the Sidebar and Copies mobile drawers
export function useEscapeKey(onEscape: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEscape is a fresh inline closure each render; re-subscribing every render is harmless
  }, [enabled]);
}
