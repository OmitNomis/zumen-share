import { useRef, useState } from "react";
import * as Icon from "./icons";

const W = 84; // px of red revealed on a full swipe

// Swipe a row left to reveal a Delete button (touch-friendly). Vertical scrolling
// stays native via touch-action: pan-y; we only take over on a horizontal drag.
export default function SwipeToDelete({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const [dx, setDx] = useState(0);
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  function down(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
  }
  function move(e: React.PointerEvent) {
    if (!start.current) return;
    const mx = e.clientX - start.current.x;
    const my = e.clientY - start.current.y;
    if (!drag) {
      if (Math.abs(my) > 10 && Math.abs(my) > Math.abs(mx)) return (start.current = null); // let it scroll
      if (Math.abs(mx) < 8) return;
      setDrag(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setDx(Math.max(-W, Math.min(0, (open ? -W : 0) + mx)));
  }
  function end() {
    if (drag) {
      const willOpen = dx < -W / 2;
      setOpen(willOpen);
      setDx(willOpen ? -W : 0);
    }
    setDrag(false);
    start.current = null;
  }

  return (
    <div className="relative overflow-hidden rounded-lg">
      <button
        onClick={onDelete}
        title="Delete copy"
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white active:bg-red-600"
        style={{ width: W }}
      >
        <Icon.Trash className="w-5 h-5" />
      </button>
      <div
        style={{ transform: `translateX(${dx}px)`, transition: drag ? "none" : "transform .2s ease", touchAction: "pan-y" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {children}
      </div>
      {open && (
        // tap the shifted row to close instead of activating it
        <button
          className="absolute left-0 top-0 bottom-0 z-10"
          style={{ right: W }}
          onClick={() => {
            setOpen(false);
            setDx(0);
          }}
        />
      )}
    </div>
  );
}
