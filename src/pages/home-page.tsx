import { Link, useOutletContext } from "react-router-dom";
import { Thumb } from "../components/thumb";
import { IconButton, Stamp } from "../ui";
import { useZumenUpload } from "../hooks/use-zumen-upload";
import { useFileDrop } from "../hooks/use-file-drop";
import { Menu, Upload } from "lucide-react";
import type { ShellContext } from "../components/app-shell";

export function HomePage() {
  const { tree, token, onMenu, reload } = useOutletContext<ShellContext>();
  const parts = tree.reduce((n, t) => n + t.ko.length, 0);
  const { upload } = useZumenUpload(undefined, reload);
  const { isOver, dropProps } = useFileDrop(upload);

  return (
    <div className="relative grid-paper h-full overflow-auto" {...dropProps}>
      {isOver && (
        <div className="pointer-events-none fixed inset-0 z-20 grid place-items-center border-4 border-dashed border-print-500 bg-print-500/10 backdrop-blur-[1px]">
          <div className="flex items-center gap-2.5 rounded-lg bg-white px-6 py-4 text-lg font-semibold text-print-700 shadow-2xl">
            <Upload className="h-5 w-5" /> Drop to upload
          </div>
        </div>
      )}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-paper-300/70 bg-paper-100/85 px-4 py-4 backdrop-blur sm:px-8">
        <IconButton label="Menu" onClick={onMenu} className="-ml-2 lg:hidden">
          <Menu className="h-5 w-5" />
        </IconButton>
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-ink-900">Blueprints</h1>
          <span className="hidden select-none text-lg font-semibold text-print-300 sm:block">図面</span>
        </div>
        <p className="ml-auto text-right font-mono text-[10px] uppercase tracking-widest text-ink-400 sm:text-[11px]">
          {tree.length} sheets · {parts} parts
        </p>
      </header>

      {tree.length === 0 ? (
        <div className="grid place-items-center px-4 py-24">
          <div className="w-full max-w-md rounded-lg border-2 border-dashed border-print-200 bg-white/60 px-8 py-14 text-center">
            <div className="mb-4 animate-bounce text-6xl">😺</div>
            <p className="font-semibold text-ink-800">No blueprints yet</p>
            <p className="mt-1 text-sm text-ink-500">Drag a file here, or upload from the sidebar.</p>
          </div>
        </div>
      ) : (
        <main className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 p-4 sm:p-8">
          {tree.map(({ oya, ko }) => (
            <Link
              key={oya.id}
              to={`/z/${oya.id}`}
              className="group flex flex-col overflow-hidden rounded-lg border border-paper-300 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-print-400 hover:shadow-xl hover:shadow-print-900/10"
            >
              <div className="p-2 pb-0">
                <div className="grid aspect-4/3 place-items-center overflow-hidden rounded-sm border border-paper-200 bg-paper-100">
                  <Thumb z={oya} token={token} width={400} />
                </div>
              </div>
              {/* title block, like the corner of a real drawing sheet */}
              <div className="mt-2 border-t border-paper-200 px-3 py-2.5">
                <div className="truncate text-sm font-semibold text-ink-900 group-hover:text-print-700" title={oya.name}>
                  {oya.name}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
                    {new Date(oya.created).toLocaleDateString()}
                  </span>
                  {ko.length > 0 && <Stamp>{ko.length} part{ko.length > 1 ? "s" : ""}</Stamp>}
                </div>
              </div>
            </Link>
          ))}
        </main>
      )}
    </div>
  );
}
