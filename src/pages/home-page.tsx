import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Thumb } from "../components/thumb";
import { ZumenMenu } from "../components/zumen-menu";
import { DropOverlay } from "../components/drop-overlay";
import { BTN, IconButton, Spinner, Stamp, microCls } from "../ui";
import { useZumenUpload } from "../hooks/use-zumen-upload";
import { useZumenPage } from "../hooks/use-zumen-page";
import { useFileDrop } from "../hooks/use-file-drop";
import { useConfirm } from "../hooks/use-confirm";
import { useEscapeKey } from "../hooks/use-escape-key";
import { Check, CheckSquare, Download, Menu, Search, Trash2, Upload, X } from "lucide-react";
import type { ShellContext } from "../components/app-shell";
import { pb, fileUrl, type Zumen } from "../lib/pb";

// names only resolve for accounts the viewer may see (admins: everyone; a user: themselves)
const uploaderName = (o: Zumen) => o.expand?.uploaded_by?.name || "";

const selectCls =
  "rounded-md border border-paper-300 bg-white px-2.5 py-2 text-sm text-ink-700 transition focus:border-print-500";

export function HomePage() {
  const { token, reloadKey, onMenu, reload } = useOutletContext<ShellContext>();
  const { upload } = useZumenUpload(undefined, reload);
  const { isOver, dropProps } = useFileDrop(upload);

  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState(""); // what actually drives the query
  const [date, setDate] = useState("all");
  const [uploader, setUploader] = useState("all");
  const [sort, setSort] = useState("new");

  // debounce search so typing doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  // server-paginated blueprint list; grows as you scroll (see the sentinel below)
  const { nodes, total, loading, hasMore, loadMore } = useZumenPage(
    { q: qDebounced, date, uploader, sort },
    reloadKey,
  );

  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { confirm, dialog } = useConfirm();
  const exitSelect = () => {
    setSelecting(false);
    setSelected(new Set());
  };
  useEscapeKey(exitSelect, selecting);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // deleting an oya cascades to its parts & copies (DB rule) — same as the viewer's single delete
  async function bulkDelete() {
    const n = selected.size;
    if (!(await confirm(`Delete ${n} blueprint${n > 1 ? "s" : ""} and all their parts and copies?`, { danger: true }))) return;
    try {
      await Promise.all([...selected].map((id) => pb.collection("zumen").delete(id)));
      exitSelect();
      reload();
    } catch (e) {
      toast.error(`Delete failed: ${e}`);
    }
  }

  // one <a download> per file, staggered so the browser doesn't drop rapid-fire downloads.
  // ponytail: sequential anchors (one "allow multiple downloads" consent) instead of a zip dep.
  async function bulkDownload() {
    for (const { oya } of nodes) {
      if (!selected.has(oya.id)) continue;
      const dot = oya.file.lastIndexOf(".");
      const ext = dot < 0 ? "" : oya.file.slice(dot);
      const a = document.createElement("a");
      a.href = fileUrl(oya, token) + "&download=1";
      a.download = oya.name.endsWith(ext) ? oya.name : oya.name + ext;
      document.body.appendChild(a);
      a.click();
      a.remove();
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  // built from loaded pages, so it grows as you scroll rather than listing every uploader up
  // front. ponytail: a complete list would need a separate distinct-uploaders query — add it
  // if the incremental dropdown proves annoying.
  const uploaders = useMemo(() => {
    const m = new Map<string, string>();
    for (const { oya } of nodes) {
      const name = uploaderName(oya);
      if (oya.uploaded_by && name) m.set(oya.uploaded_by, name);
    }
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [nodes]);

  const filtered = qDebounced.trim() !== "" || date !== "all" || uploader !== "all";
  const parts = nodes.reduce((n, t) => n + t.ko.length, 0);
  // "select all" acts on what's visible (i.e. current filters), computed at render so the
  // handler closes over a plain array rather than the impure `nodes` memo (compiler-safe)
  const visibleIds = nodes.map(({ oya }) => oya.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  // infinite scroll: load the next page when the sentinel scrolls into view
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && loadMore(), {
      root: scrollRef.current,
      rootMargin: "400px", // start fetching before the user hits the bottom
    });
    io.observe(sentinel);
    return () => io.disconnect();
  }, [loadMore]);

  return (
    <div ref={scrollRef} className="field-paper relative h-full overflow-auto" {...dropProps}>
      <DropOverlay show={isOver} />
      <header className="sticky top-0 z-100 border-b border-paper-300/70 bg-paper-100/85 px-4 py-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <IconButton label="Menu" onClick={onMenu} className="-ml-2 lg:hidden">
            <Menu className="h-5 w-5" />
          </IconButton>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Blueprints</h1>
            <span className="hidden select-none text-lg font-semibold text-print-300 sm:block">図面</span>
          </div>
          <p className="ml-auto text-right font-mono text-[10px] uppercase tracking-widest text-ink-400 sm:text-[11px]">
            {total} sheets · {parts} parts loaded
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search blueprints…"
              className="w-full rounded-md border border-paper-300 bg-white py-2 pl-9 pr-3 text-sm text-ink-900 placeholder:text-ink-400 transition focus:border-print-500"
            />
          </div>
          <select value={date} onChange={(e) => setDate(e.target.value)} className={selectCls} aria-label="Filter by date">
            <option value="all">Any time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
          {uploaders.length > 0 && (
            <select
              value={uploader}
              onChange={(e) => setUploader(e.target.value)}
              className={selectCls}
              aria-label="Filter by uploader"
            >
              <option value="all">All uploaders</option>
              {uploaders.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={selectCls} aria-label="Sort">
            <option value="new">Newest</option>
            <option value="old">Oldest</option>
            <option value="az">Name A–Z</option>
            <option value="za">Name Z–A</option>
          </select>
          {!selecting && nodes.length > 0 && (
            <button type="button" onClick={() => setSelecting(true)} className={BTN.outline}>
              <CheckSquare className="h-4 w-4" /> Select
            </button>
          )}
        </div>
      </header>

      {loading && nodes.length === 0 ? (
        <div className="grid place-items-center px-4 py-24">
          <Spinner className="h-8 w-8 text-print-400" />
        </div>
      ) : nodes.length === 0 ? (
        filtered ? (
          <div className="grid place-items-center px-4 py-24">
            <p className="text-sm text-ink-500">No blueprints match your filters.</p>
          </div>
        ) : (
          <div className="grid place-items-center px-4 py-24">
            <label className="crop-marks group relative flex w-full max-w-md cursor-pointer flex-col items-center gap-4 rounded-xl border border-print-200 bg-white/70 px-10 py-16 text-center text-print-400 transition-all hover:border-print-400 hover:bg-white active:scale-[0.99]">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-print-50 text-print-500 ring-1 ring-print-200 transition group-hover:bg-print-600 group-hover:text-white group-hover:ring-print-600">
                <Upload className="h-7 w-7" />
              </span>
              <div>
                <p className="text-base font-bold text-ink-900">No blueprints yet</p>
                <p className="mt-1 text-sm text-ink-500">Drop a file here, or click to browse.</p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-print-400">
                図面 · pdf / png / jpg / tiff
              </p>
              <input
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => upload(e.target.files)}
              />
            </label>
          </div>
        )
      ) : (
        <>
        <main
          className={
            "grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 p-4 sm:p-8" + (selecting ? " pb-24" : "")
          }
        >
          {nodes.map(({ oya, ko }) => {
            const sel = selected.has(oya.id);
            const inner = (
              <>
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
              </>
            );
            const base =
              "group flex flex-col overflow-hidden rounded-lg border bg-white text-left shadow-sm transition";
            if (selecting)
              return (
                <button
                  key={oya.id}
                  type="button"
                  onClick={() => toggle(oya.id)}
                  aria-pressed={sel}
                  className={`${base} relative ${sel ? "border-print-500 ring-2 ring-print-500" : "border-paper-300 hover:border-print-400"}`}
                >
                  <span
                    className={`absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md border ${sel ? "border-print-500 bg-print-600 text-white" : "border-paper-300 bg-white/90"}`}
                  >
                    {sel && <Check className="h-4 w-4" />}
                  </span>
                  {inner}
                </button>
              );
            // menu sits as a sibling of the Link (not nested in the <a>) so its clicks don't
            // navigate; group-hover keeps the card lifted while the pointer is on the menu
            return (
              <div key={oya.id} className="group relative">
                <Link
                  to={`/z/${oya.id}`}
                  draggable={false}
                  className={`${base} h-full border-paper-300 group-hover:-translate-y-1 group-hover:border-print-400 group-hover:shadow-xl group-hover:shadow-print-900/10`}
                >
                  {inner}
                </Link>
                <ZumenMenu z={oya} token={token} confirm={confirm} onDeleted={reload} />
              </div>
            );
          })}
        </main>
        {hasMore && (
          <div ref={sentinelRef} className="grid place-items-center py-8">
            {loading && <Spinner className="h-6 w-6 text-print-400" />}
          </div>
        )}
        </>
      )}

      {selecting && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center justify-center gap-3 border-t border-paper-300 bg-white/95 px-4 py-3 backdrop-blur">
          <span className={microCls}>{selected.size} selected</span>
          <button
            type="button"
            className={BTN.ghost}
            onClick={() => setSelected(allSelected ? new Set() : new Set(visibleIds))}
          >
            {allSelected ? "Clear all" : "Select all"}
          </button>
          <button type="button" className={BTN.outline} disabled={!selected.size} onClick={bulkDownload}>
            <Download className="h-4 w-4" /> Download
          </button>
          <button type="button" className={BTN.danger} disabled={!selected.size} onClick={bulkDelete}>
            <Trash2 className="h-4 w-4" /> Delete
          </button>
          <button type="button" className={BTN.ghost} onClick={exitSelect}>
            <X className="h-4 w-4" /> Cancel
          </button>
        </div>
      )}
      {dialog}
    </div>
  );
}
