import { useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { pb, isPdf, isAdmin, type Zumen } from "../lib/pb";
import { useZumenUpload } from "../hooks/use-zumen-upload";
import { BTN, IconButton, Spinner } from "../ui";
import { Logo } from "./logo";
import {
  ChevronRight,
  FileText,
  Image as ImageIcon,
  List,
  LogOut,
  Search,
  Upload,
  Users,
  X,
} from "lucide-react";

export type OyaNode = { oya: Zumen; ko: Zumen[] };

type Props = {
  tree: OyaNode[];
  open: boolean; // drawer visible on small screens
  onClose: () => void;
  onReload: () => void;
};

const Glyph = ({ z, className }: { z: Zumen; className?: string }) =>
  isPdf(z) ? <FileText className={className} /> : <ImageIcon className={className} />;

export function Sidebar({ tree, open, onClose, onReload }: Props) {
  const { id: openId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [meow, setMeow] = useState(false);
  const taps = useRef(0);
  const { upload, busy } = useZumenUpload(undefined, onReload);

  function logoTap() {
    taps.current++;
    if (taps.current % 5 === 0) {
      setMeow(true);
      setTimeout(() => setMeow(false), 1600);
    }
    navigate("/");
    onClose();
  }

  const ql = q.trim().toLowerCase();
  const nodes: OyaNode[] = ql
    ? tree.flatMap((n) => {
        if (n.oya.name.toLowerCase().includes(ql)) return [n];
        const ko = n.ko.filter((k) => k.name.toLowerCase().includes(ql));
        return ko.length ? [{ oya: n.oya, ko }] : [];
      })
    : tree;

  function toggle(id: string) {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const me = pb.authStore.record;
  const footBtn =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-300 transition hover:bg-white/5 hover:text-white";

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 transform flex-col border-r border-ink-800 bg-ink-950 text-ink-200 transition-transform lg:static lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* brand block */}
      <div className="relative flex h-16 items-center border-b border-ink-800/70 pr-2">
        <button onClick={logoTap} className="flex h-full flex-1 items-center gap-3 px-4 transition hover:bg-white/5">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-print-600 text-white shadow-lg shadow-print-900/50 ring-1 ring-white/20">
            <Logo className="h-5 w-5" />
          </div>
          <div className="min-w-0 text-left">
            <div className="truncate font-bold leading-tight text-white">Zumen Share</div>
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-400">図面共有</div>
          </div>
        </button>
        <IconButton dark label="Close menu" onClick={onClose} className="lg:hidden">
          <X className="h-5 w-5" />
        </IconButton>
        {meow && (
          <span className="absolute left-16 top-14 z-10 animate-bounce rounded-full bg-white px-2.5 py-1 text-xs text-ink-900 shadow-lg">
            =^･ω･^= meow!
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search oya & ko…"
            className="w-full rounded-md border border-ink-700 bg-ink-900 py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-ink-400 transition focus:border-print-400"
          />
        </div>
        <label className={`${BTN.primary} w-full ${busy ? "pointer-events-none opacity-70" : "cursor-pointer"}`}>
          {busy ? <Spinner /> : <Upload className="h-4 w-4" />}
          {busy ? "Uploading…" : "Upload blueprint"}
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            disabled={busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>

      <div className="flex items-baseline justify-between px-4 pb-1.5 pt-1">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-500">Index</span>
        <span className="font-mono text-[10px] tabular-nums text-ink-500">{nodes.length}</span>
      </div>

      <nav className="flex-1 overflow-auto px-2 pb-2">
        {nodes.length === 0 && (
          <p className="px-3 py-8 text-center text-sm text-ink-500">{ql ? "No matches." : "No blueprints yet."}</p>
        )}
        {nodes.map(({ oya, ko }) => {
          const hasKo = ko.length > 0;
          const isOpen = ql !== "" || expanded.has(oya.id) || openId === oya.id || ko.some((k) => k.id === openId);
          const activeOya = openId === oya.id;
          return (
            <div key={oya.id} className="mb-0.5">
              <div
                className={`group flex items-center rounded-md transition ${
                  activeOya ? "bg-print-600 text-white shadow-md shadow-print-900/40" : "text-ink-200 hover:bg-white/5"
                }`}
              >
                <button
                  onClick={() => hasKo && toggle(oya.id)}
                  className={`grid h-10 w-8 shrink-0 place-items-center ${hasKo ? "" : "invisible"} ${
                    activeOya ? "text-white/70" : "text-ink-400"
                  }`}
                  tabIndex={hasKo ? 0 : -1}
                  aria-label={isOpen ? "Collapse parts" : "Expand parts"}
                >
                  <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                <Link
                  to={`/z/${oya.id}`}
                  onClick={onClose}
                  title={oya.name}
                  className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-2 text-sm"
                >
                  <Glyph z={oya} className="h-4 w-4 shrink-0 opacity-60" />
                  <span className="flex-1 truncate text-left">{oya.name}</span>
                  {hasKo && (
                    <span
                      className={`shrink-0 rounded-sm border px-1 font-mono text-[10px] tabular-nums ${
                        activeOya ? "border-white/30 text-white/90" : "border-ink-700 text-ink-400"
                      }`}
                    >
                      {ko.length}
                    </span>
                  )}
                </Link>
              </div>

              {isOpen && hasKo && (
                <div className="ml-[1.35rem] mt-0.5 flex flex-col border-l border-ink-800 pl-2.5">
                  {ko.map((k) => (
                    <Link
                      key={k.id}
                      to={`/z/${k.id}`}
                      onClick={onClose}
                      title={k.name}
                      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm transition ${
                        openId === k.id
                          ? "bg-print-600 text-white shadow-md shadow-print-900/40"
                          : "text-ink-400 hover:bg-white/5 hover:text-ink-200"
                      }`}
                    >
                      <Glyph z={k} className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      <span className="truncate text-left">{k.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-ink-800 p-3">
        {isAdmin() && (
          <Link to="/admin" onClick={onClose} className={footBtn}>
            <Users className="h-4 w-4" /> Accounts
          </Link>
        )}
        <Link to="/logs" onClick={onClose} className={footBtn}>
          <List className="h-4 w-4" /> Audit log
        </Link>
        <div className="mt-1 flex items-center gap-2.5 rounded-md border border-ink-800 bg-ink-900/60 p-2">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-ink-700 font-mono text-xs font-semibold uppercase text-white ring-1 ring-ink-600">
            {(me?.name || me?.email)?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1" title={me?.email}>
            <div className="truncate text-sm text-white">{me?.name || me?.email}</div>
            <div className="truncate font-mono text-[10px] text-ink-400">
              {me?.name ? me?.email : isAdmin() ? "admin" : "user"}
            </div>
          </div>
          <IconButton dark label="Log out" onClick={() => pb.authStore.clear()} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </aside>
  );
}
