import { useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Thumb } from "../components/thumb";
import { IconButton, Stamp } from "../ui";
import { useZumenUpload } from "../hooks/use-zumen-upload";
import { useFileDrop } from "../hooks/use-file-drop";
import { Menu, Search, Upload } from "lucide-react";
import type { ShellContext } from "../components/app-shell";
import type { Zumen } from "../lib/pb";

const DAY = 86_400_000;
const DATE_WINDOWS: Record<string, number> = { "7d": 7 * DAY, "30d": 30 * DAY };

// names only resolve for accounts the viewer may see (admins: everyone; a user: themselves)
const uploaderName = (o: Zumen) => o.expand?.uploaded_by?.name || o.expand?.uploaded_by?.email || "";

const selectCls =
  "rounded-md border border-paper-300 bg-white px-2.5 py-2 text-sm text-ink-700 transition focus:border-print-500";

export function HomePage() {
  const { tree, token, onMenu, reload } = useOutletContext<ShellContext>();
  const { upload } = useZumenUpload(undefined, reload);
  const { isOver, dropProps } = useFileDrop(upload);

  const [q, setQ] = useState("");
  const [date, setDate] = useState("all");
  const [uploader, setUploader] = useState("all");
  const [sort, setSort] = useState("new");

  const uploaders = useMemo(() => {
    const m = new Map<string, string>();
    for (const { oya } of tree) {
      const name = uploaderName(oya);
      if (oya.uploaded_by && name) m.set(oya.uploaded_by, name);
    }
    return [...m].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [tree]);

  const nodes = useMemo(() => {
    const ql = q.trim().toLowerCase();
    // filters are time-relative, so reading the clock during render is intentional
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const dateOk = (created: string) => {
      if (date === "all") return true;
      if (date === "today") return new Date(created).toDateString() === new Date(now).toDateString();
      return new Date(created).getTime() >= now - DATE_WINDOWS[date];
    };
    const out = tree.filter(({ oya, ko }) => {
      if (ql && !oya.name.toLowerCase().includes(ql) && !ko.some((k) => k.name.toLowerCase().includes(ql))) return false;
      if (uploader !== "all" && oya.uploaded_by !== uploader) return false;
      return dateOk(oya.created);
    });
    out.sort((a, b) => {
      if (sort === "az") return a.oya.name.localeCompare(b.oya.name);
      if (sort === "za") return b.oya.name.localeCompare(a.oya.name);
      const cmp = a.oya.created < b.oya.created ? -1 : 1;
      return sort === "old" ? cmp : -cmp; // default: newest first
    });
    return out;
  }, [tree, q, date, uploader, sort]);

  const parts = nodes.reduce((n, t) => n + t.ko.length, 0);

  return (
    <div className="relative grid-paper h-full overflow-auto" {...dropProps}>
      {isOver && (
        <div className="pointer-events-none fixed inset-0 z-20 grid place-items-center border-4 border-dashed border-print-500 bg-print-500/10 backdrop-blur-[1px]">
          <div className="flex items-center gap-2.5 rounded-lg bg-white px-6 py-4 text-lg font-semibold text-print-700 shadow-2xl">
            <Upload className="h-5 w-5" /> Drop to upload
          </div>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-paper-300/70 bg-paper-100/85 px-4 py-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <IconButton label="Menu" onClick={onMenu} className="-ml-2 lg:hidden">
            <Menu className="h-5 w-5" />
          </IconButton>
          <div className="flex items-baseline gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Blueprints</h1>
            <span className="hidden select-none text-lg font-semibold text-print-300 sm:block">図面</span>
          </div>
          <p className="ml-auto text-right font-mono text-[10px] uppercase tracking-widest text-ink-400 sm:text-[11px]">
            {nodes.length} sheets · {parts} parts
          </p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search oya & ko…"
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
        </div>
      </header>

      {tree.length === 0 ? (
        <div className="grid place-items-center px-4 py-24">
          <div className="w-full max-w-md rounded-lg border-2 border-dashed border-print-200 bg-white/60 px-8 py-14 text-center">
            <div className="mb-4 animate-bounce text-6xl">😺</div>
            <p className="font-semibold text-ink-800">No blueprints yet</p>
            <p className="mt-1 text-sm text-ink-500">Drag a file here, or upload from the sidebar.</p>
          </div>
        </div>
      ) : nodes.length === 0 ? (
        <div className="grid place-items-center px-4 py-24">
          <p className="text-sm text-ink-500">No blueprints match your filters.</p>
        </div>
      ) : (
        <main className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-5 p-4 sm:p-8">
          {nodes.map(({ oya, ko }) => (
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
