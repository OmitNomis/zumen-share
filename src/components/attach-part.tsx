import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Thumb } from "./thumb";
import { useZumenPage } from "../hooks/use-zumen-page";
import { useFileDrop } from "../hooks/use-file-drop";
import { useEscapeKey } from "../hooks/use-escape-key";
import { Button, IconButton, Spinner, microCls } from "../ui";
import { Input } from "./ui/input";
import { ArrowLeft, Check, Plus, Search, Upload } from "lucide-react";
import type { AttachContext } from "./viewer";

// Full-screen route rendered at /z/:id/attach (inside Viewer's own <Outlet>): either upload
// new file(s) — drop anywhere on the screen — or pick one or more already-uploaded blueprints,
// which get re-homed as parts of the current one. Covers the still-mounted Viewer underneath.
export function AttachPart() {
  const { rootId, token, onUpload, onAttach } = useOutletContext<AttachContext>();
  const navigate = useNavigate();
  const close = () => navigate("..");
  useEscapeKey(close, true);
  const [query, setQuery] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // debounce search so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // same paginated oya + ko-count fetch as the home grid; candidates = the top-level oya it
  // returns, minus this sheet and any that already have parts (a page can yield fewer than
  // PER_PAGE candidates — the scroll sentinel just keeps pulling pages until it finds more).
  const { nodes, loading, hasMore, loadMore } = useZumenPage(
    { q: qDebounced, date: "all", uploader: "all", sort: "new" },
    0,
  );
  const shown = useMemo(
    () => nodes.filter((n) => n.oya.id !== rootId && n.ko.length === 0).map((n) => n.oya),
    [nodes, rootId],
  );

  // infinite scroll: pull the next page when the sentinel scrolls into view
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), {
      root: scrollRef.current,
      rootMargin: "400px",
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore]);

  function upload(files: FileList | null) {
    onUpload(files);
    close();
  }

  function toggle(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function attach() {
    if (!picked.size) return;
    onAttach([...picked]);
    close();
  }

  const { isOver, dropProps } = useFileDrop(upload);

  return (
    <div className="animate-fade grid-paper fixed inset-0 z-50 flex flex-col bg-paper-100" {...dropProps}>
      {isOver && (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center border-4 border-dashed border-print-500 bg-print-500/10 backdrop-blur-[1px]">
          <div className="flex items-center gap-2.5 rounded-lg bg-white px-6 py-4 text-lg font-semibold text-print-700 shadow-2xl">
            <Upload className="h-5 w-5" /> Drop to upload
          </div>
        </div>
      )}

      <header className="flex shrink-0 items-center gap-3 border-b border-paper-300/70 bg-paper-100/85 px-4 py-4 backdrop-blur sm:px-8">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-print-200 bg-print-50 text-base font-semibold text-print-700 select-none">
          部
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold leading-tight text-ink-900">Attach parts</h1>
          <p className={`${microCls} truncate`}>add ko under this sheet</p>
        </div>
        <IconButton label="Back" onClick={close} className="ml-auto">
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto">
        <section className="border-b border-paper-200 p-4 sm:p-6">
          <Button
            asChild
            className={`w-full cursor-pointer ${isOver ? "ring-2 ring-print-300 ring-offset-2" : ""}`}
          >
            <label>
              <Upload className="h-4 w-4" />
              Upload new file(s)
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => upload(e.target.files)}
              />
            </label>
          </Button>
          <p className="mt-2 text-center text-xs text-ink-400">or drag files anywhere onto this screen</p>
        </section>

        <section className="p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className={microCls}>Or re-home existing blueprints</div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-300" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search blueprints…"
                className="h-9 pl-8"
              />
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {shown.map((z) => {
              const on = picked.has(z.id);
              return (
                <button
                  key={z.id}
                  onClick={() => toggle(z.id)}
                  aria-pressed={on}
                  className={`relative overflow-hidden rounded-lg border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    on ? "border-print-500 ring-2 ring-print-500" : "border-paper-300 hover:border-print-400"
                  }`}
                >
                  {on && (
                    <span className="absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-print-600 text-white shadow">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                  <div className="grid aspect-4/3 place-items-center overflow-hidden border-b border-paper-200 bg-paper-100">
                    <Thumb z={z} token={token} width={280} />
                  </div>
                  <div className="truncate p-2 text-sm text-ink-800" title={z.name}>
                    {z.name}
                  </div>
                </button>
              );
            })}
          </div>
          {shown.length === 0 && !loading && !hasMore && (
            <p className="py-12 text-center text-sm text-ink-400">
              {qDebounced.trim() ? "No blueprints match your search." : "No standalone blueprints to attach."}
            </p>
          )}
          {hasMore && (
            <div ref={sentinelRef} className="grid place-items-center py-8">
              {loading && <Spinner className="h-6 w-6 text-print-400" />}
            </div>
          )}
        </section>
      </div>

      {picked.size > 0 && (
        <footer className="flex shrink-0 items-center gap-3 border-t border-paper-300 bg-paper-50 px-4 py-3 sm:px-6">
          <span className="text-sm text-ink-600">
            <span className="font-semibold text-ink-900">{picked.size}</span> selected
          </span>
          <Button variant="ghost" onClick={() => setPicked(new Set())} className="ml-auto">
            Clear
          </Button>
          <Button onClick={attach}>
            <Plus className="h-4 w-4" />
            Attach {picked.size} part{picked.size > 1 ? "s" : ""}
          </Button>
        </footer>
      )}
    </div>
  );
}
