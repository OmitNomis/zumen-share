import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { pb, isAdmin, type Zumen } from "../lib/pb";
import { useZumenUpload } from "../hooks/use-zumen-upload";
import { BTN, IconButton, Spinner } from "../ui";
import { Logo } from "./logo";
import { List, LogOut, Upload, Users, X } from "lucide-react";

export type OyaNode = { oya: Zumen; ko: Zumen[] };

type Props = {
  open: boolean; // drawer visible on small screens
  onClose: () => void;
  onReload: () => void;
};

export function Sidebar({ open, onClose, onReload }: Props) {
  const navigate = useNavigate();
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

      <div className="p-3">
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

      <div className="flex-1" />

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
