import { Upload } from "lucide-react";

// Full-screen "drop to upload" feedback shared by the home grid and the attach screen.
// Reads like a print registration target: a scrim, a floating panel, and crop-mark
// corner brackets (the .crop-marks utility, tinted via currentColor).
export function DropOverlay({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="animate-fade pointer-events-none fixed inset-0 z-20 grid place-items-center bg-print-900/20 p-8 backdrop-blur-[2px]">
      <div className="crop-marks relative flex max-w-md flex-col items-center gap-3 rounded-xl border border-print-300/70 bg-white/95 px-10 py-9 text-center text-print-500 shadow-2xl shadow-print-950/30">
        <span className="grid h-12 w-12 place-items-center rounded-lg bg-print-600 text-white shadow-lg shadow-print-900/40">
          <Upload className="h-6 w-6" />
        </span>
        <div className="text-lg font-bold tracking-tight text-ink-900">Drop to upload</div>
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-print-500">
          release to register sheet
        </div>
      </div>
    </div>
  );
}
