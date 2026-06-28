import { useRef, useState } from "react";
import { pb, isPdf, isAdmin, baseName, type Zumen } from "./lib/pb";
import * as Icon from "./icons";

export type OyaNode = { oya: Zumen; ko: Zumen[] };

type Props = {
  tree: OyaNode[];
  openId: string | null;
  open: boolean; // drawer visible on small screens
  onClose: () => void;
  onOpen: (id: string) => void;
  onHome: () => void;
  onReload: () => void;
  onLogs: () => void;
  onAdmin: () => void;
};

const Glyph = ({ z, className }: { z: Zumen; className?: string }) =>
  isPdf(z) ? <Icon.Pdf className={className} /> : <Icon.Image className={className} />;

export default function Sidebar({ tree, openId, open, onClose, onOpen, onHome, onReload, onLogs, onAdmin }: Props) {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState("");
  const [meow, setMeow] = useState(false);
  const taps = useRef(0);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const arr = [...files];
    try {
      for (let i = 0; i < arr.length; i++) {
        setBusy(`Uploading ${i + 1}/${arr.length}…`);
        const fd = new FormData();
        fd.set("name", baseName(arr[i].name)); // default name = filename without extension
        fd.set("file", arr[i]);
        fd.set("uploaded_by", pb.authStore.record!.id);
        await pb.collection("zumen").create(fd); // no oya / no source => a new oya
      }
    } catch (e) {
      alert(`Upload failed: ${e}`);
    } finally {
      setBusy("");
      onReload();
    }
  }

  function logoTap() {
    taps.current++;
    if (taps.current % 5 === 0) {
      setMeow(true);
      setTimeout(() => setMeow(false), 1600);
    }
    onHome();
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

  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-40 w-72 shrink-0 bg-slate-900 text-slate-300 flex flex-col transform transition-transform lg:translate-x-0 ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="relative flex items-center h-16 pr-2">
        <button onClick={logoTap} className="flex items-center gap-2.5 px-4 h-full flex-1 hover:bg-slate-800/60 transition">
          <div className="grid place-items-center w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white shrink-0 shadow-lg shadow-indigo-500/20">
            <Icon.Logo className="w-5 h-5" />
          </div>
          <span className="font-bold text-white text-lg">Zumen Share</span>
        </button>
        <button onClick={onClose} className="lg:hidden grid place-items-center w-10 h-10 rounded-lg text-slate-400 hover:bg-slate-800">
          <Icon.X className="w-5 h-5" />
        </button>
        {meow && (
          <span className="absolute left-16 top-14 z-10 text-xs bg-white text-slate-800 rounded-full px-2.5 py-1 shadow-lg animate-bounce">
            =^･ω･^= meow!
          </span>
        )}
      </div>

      <div className="px-3 pb-3 flex flex-col gap-2">
        <div className="relative">
          <Icon.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search oya & ko…"
            className="w-full bg-slate-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <label
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white cursor-pointer transition ${
            busy ? "bg-indigo-500/60" : "bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
          }`}
        >
          <Icon.Upload className="w-4 h-4" />
          {busy || "Upload blueprint"}
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            className="hidden"
            disabled={!!busy}
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>

      <nav className="flex-1 overflow-auto px-2 pb-2">
        {nodes.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">{ql ? "No matches." : "No blueprints yet."}</p>
        )}
        {nodes.map(({ oya, ko }) => {
          const hasKo = ko.length > 0;
          const isOpen = ql !== "" || expanded.has(oya.id) || openId === oya.id || ko.some((k) => k.id === openId);
          return (
            <div key={oya.id} className="mb-0.5">
              <div
                className={`group flex items-center rounded-lg ${
                  openId === oya.id ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-200"
                }`}
              >
                <button
                  onClick={() => hasKo && toggle(oya.id)}
                  className={`w-9 h-10 grid place-items-center shrink-0 ${hasKo ? "" : "invisible"}`}
                  tabIndex={hasKo ? 0 : -1}
                >
                  <Icon.Chevron className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
                <button
                  onClick={() => onOpen(oya.id)}
                  title={oya.name}
                  className="flex-1 min-w-0 flex items-center gap-2 pr-2 py-2 text-sm"
                >
                  <Glyph z={oya} className="w-4 h-4 shrink-0 opacity-70" />
                  <span className="truncate flex-1 text-left">{oya.name}</span>
                  {hasKo && (
                    <span
                      className={`text-xs rounded-full px-1.5 py-0.5 shrink-0 ${
                        openId === oya.id ? "bg-white/20" : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {ko.length}
                    </span>
                  )}
                </button>
              </div>

              {isOpen && hasKo && (
                <div className="ml-4 pl-3 border-l border-slate-700 mt-0.5 flex flex-col">
                  {ko.map((k) => (
                    <button
                      key={k.id}
                      onClick={() => onOpen(k.id)}
                      title={k.name}
                      className={`flex items-center gap-2 rounded-md px-2 py-2.5 text-sm ${
                        openId === k.id ? "bg-indigo-600 text-white" : "hover:bg-slate-800 text-slate-400"
                      }`}
                    >
                      <Glyph z={k} className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate text-left">{k.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3 flex flex-col gap-1">
        {isAdmin() && (
          <button
            onClick={onAdmin}
            className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
          >
            <Icon.Users className="w-4 h-4" /> Accounts
          </button>
        )}
        <button
          onClick={onLogs}
          className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
        >
          <Icon.List className="w-4 h-4" /> Audit log
        </button>
        <div className="flex items-center gap-2 px-2 pt-1">
          <div className="grid place-items-center w-7 h-7 rounded-full bg-slate-700 text-xs font-semibold text-white shrink-0 uppercase">
            {(pb.authStore.record?.name || pb.authStore.record?.email)?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1" title={pb.authStore.record?.email}>
            <div className="text-sm text-slate-200 truncate">
              {pb.authStore.record?.name || pb.authStore.record?.email}
            </div>
            {pb.authStore.record?.name && (
              <div className="text-xs text-slate-500 truncate">{pb.authStore.record?.email}</div>
            )}
          </div>
          <button
            onClick={() => pb.authStore.clear()}
            title="Log out"
            className="grid place-items-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <Icon.LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
