import { useEffect, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { toast } from "sonner";
import { Toolbar } from "radix-ui";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pb, fileUrl, isPdf, isTiff, type Zumen } from "../lib/pb";
import { tiffToCanvas } from "../lib/preview"; // also configures the pdf.js worker
import { Thumb } from "./thumb";
import { SwipeToDelete } from "./swipe-to-delete";
import { Tip } from "./ui/tooltip";
import { useConfirm } from "../hooks/use-confirm";
import { useZumenUpload } from "../hooks/use-zumen-upload";
import { useEscapeKey } from "../hooks/use-escape-key";
import { Button, IconButton, Spinner, Stamp } from "../ui";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eraser,
  Menu,
  Move,
  Pen,
  Plus,
  Printer,
  Trash2,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// shared with the nested "attach" route (src/components/attach-part.tsx) via useOutletContext()
export type AttachContext = {
  rootId: string;
  token: string;
  onUpload: (files: FileList | null) => void;
  onAttach: (ids: string[]) => void;
};

type Stroke = { color: string; width: number; points: { x: number; y: number }[] };
const PRESETS = ["#d3381c", "#2750bb", "#16a34a", "#eab308", "#111827"];

type Props = {
  id: string; // an oya or a ko (never a copy — copies are opened from the right panel)
  onOpen: (id: string) => void;
  onHome: () => void;
  onReload: () => void; // refresh the sidebar tree
  onMenu: () => void; // open the left sidebar drawer (small screens)
};

export function Viewer({ id, onOpen, onHome, onReload, onMenu }: Props) {
  const [subject, setSubject] = useState<Zumen | null>(null); // the drawing being viewed (oya or ko)
  const [root, setRoot] = useState<Zumen | null>(null); // its oya (== subject when subject is an oya)
  const [parts, setParts] = useState<Zumen[]>([]); // ko (real parts) of root — shown in the right panel
  const [copies, setCopies] = useState<Zumen[]>([]); // markup snapshots of subject
  const [token, setToken] = useState(""); // for right-panel thumbnails
  const [activeId, setActiveId] = useState(id); // subject.id, or a copy id when viewing a copy
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [mode, setMode] = useState<"pan" | "pen">("pan"); // default pan so touch can scroll / pinch-zoom
  const [zoom, setZoom] = useState(1);
  const [color, setColor] = useState(PRESETS[0]);
  const [penWidth, setPenWidth] = useState(3);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null); // active sheet pixel size, for the HUD
  const [pageLoading, setPageLoading] = useState(false); // decoding the active page onto the base canvas
  const [busy, setBusy] = useState("");
  const [copiesOpen, setCopiesOpen] = useState(false); // right drawer on small screens
  const [editingName, setEditingName] = useState(false);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const pdfCache = useRef<{ id: string; pdf: PDFDocumentProxy } | null>(null);
  const { confirm, dialog: confirmDialog } = useConfirm();
  const { upload: uploadKo } = useZumenUpload(root?.id, onReload);
  useEscapeKey(() => setCopiesOpen(false), copiesOpen);

  const active = subject && (activeId === subject.id ? subject : copies.find((c) => c.id === activeId));

  async function loadCopies(subjId: string) {
    const cs = await pb.collection("zumen").getFullList<Zumen>({
      filter: pb.filter("source = {:id}", { id: subjId }),
      sort: "created",
    });
    setCopies(cs);
    return cs;
  }

  // real parts (ko) of the blueprint: oya = root, and not a markup copy (source = '')
  async function loadParts(rootId: string) {
    const ks = await pb.collection("zumen").getFullList<Zumen>({
      filter: pb.filter("oya = {:id} && source = ''", { id: rootId }),
      sort: "created",
    });
    setParts(ks);
    return ks;
  }

  useEffect(() => {
    (async () => {
      const subj = await pb.collection("zumen").getOne<Zumen>(id);
      const rt = subj.oya ? await pb.collection("zumen").getOne<Zumen>(subj.oya) : subj;
      setSubject(subj);
      setRoot(rt);
      setToken(await pb.files.getToken());
      setActiveId(subj.id);
      setPage(1);
      await Promise.all([loadCopies(subj.id), loadParts(rt.id)]);
    })().catch((e) => toast.error(String(e)));
  }, [id]);

  // render the active file onto the base canvas
  useEffect(() => {
    if (!active) return;
    let dead = false;
    setPageLoading(true);
    (async () => {
      const base = baseRef.current!;
      if (isPdf(active)) {
        if (pdfCache.current?.id !== active.id) {
          const t = await pb.files.getToken();
          const pdf = await pdfjs.getDocument({ url: fileUrl(active, t) }).promise;
          if (dead) return;
          pdfCache.current = { id: active.id, pdf };
          setNumPages(pdf.numPages);
        }
        const p = await pdfCache.current.pdf.getPage(Math.min(page, pdfCache.current.pdf.numPages));
        // render ~1600px wide so pen strokes stay crisp
        const scale = Math.min(Math.max(1600 / p.getViewport({ scale: 1 }).width, 0.5), 3);
        const vp = p.getViewport({ scale });
        base.width = vp.width;
        base.height = vp.height;
        if (dead) return;
        await p.render({ canvas: base, viewport: vp }).promise;
      } else if (isTiff(active)) {
        const t = await pb.files.getToken();
        const c = await tiffToCanvas(fileUrl(active, t));
        if (dead) return;
        base.width = c.width;
        base.height = c.height;
        base.getContext("2d")!.drawImage(c, 0, 0);
        setNumPages(1);
      } else {
        const t = await pb.files.getToken();
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = fileUrl(active, t);
        });
        if (dead) return;
        base.width = img.naturalWidth;
        base.height = img.naturalHeight;
        base.getContext("2d")!.drawImage(img, 0, 0);
        setNumPages(1);
      }
      const draw = drawRef.current!;
      draw.width = base.width;
      draw.height = base.height;
      setDims({ w: base.width, h: base.height });
      setStrokes([]);
      current.current = null;
    })()
      .catch((e) => !dead && toast.error(String(e)))
      .finally(() => !dead && setPageLoading(false));
    return () => {
      dead = true;
    };
  }, [active?.id, active?.file, page]);

  function paintStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.points.length === 1) {
      ctx.beginPath();
      ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(s.points[0].x, s.points[0].y);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  // full redraw of the overlay whenever strokes change (undo / clear / stroke end)
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    const ctx = draw.getContext("2d")!;
    ctx.clearRect(0, 0, draw.width, draw.height);
    for (const s of strokes) paintStroke(ctx, s);
  }, [strokes]);

  function pos(e: React.PointerEvent) {
    const c = drawRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  }

  function down(e: React.PointerEvent) {
    if (mode !== "pen") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const c = drawRef.current!;
    const cssScale = c.width / c.getBoundingClientRect().width;
    current.current = { color, width: penWidth * cssScale, points: [pos(e)] };
  }

  function move(e: React.PointerEvent) {
    const s = current.current;
    if (!s) return;
    const p = pos(e);
    const prev = s.points[s.points.length - 1];
    s.points.push(p);
    const ctx = drawRef.current!.getContext("2d")!;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(prev.x, prev.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }

  function up() {
    if (!current.current) return;
    const s = current.current;
    current.current = null;
    setStrokes((prev) => [...prev, s]);
  }

  const confirmDiscard = () => (!strokes.length ? Promise.resolve(true) : confirm("Discard unsaved marks?"));

  // base sheet + overlay flattened onto one white canvas (used by save + print)
  function flatten(): HTMLCanvasElement {
    const base = baseRef.current!;
    const merged = document.createElement("canvas");
    merged.width = base.width;
    merged.height = base.height;
    const ctx = merged.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, merged.width, merged.height);
    ctx.drawImage(base, 0, 0);
    ctx.drawImage(drawRef.current!, 0, 0);
    return merged;
  }

  // Save the flattened view. overwrite=true replaces the copy currently open
  // (only copies can be overwritten — the original always saves as a new copy).
  async function save(overwrite: boolean) {
    if (!subject) return;
    setBusy(overwrite ? "Saving…" : "Copying…");
    try {
      // ponytail: a copy is a flattened PNG of the current view (current PDF page only)
      const blob = await new Promise<Blob>((res, rej) =>
        flatten().toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png")
      );
      const file = new File([blob], "copy.png", { type: "image/png" });
      if (overwrite) {
        const fd = new FormData();
        fd.set("file", file);
        await pb.collection("zumen").update<Zumen>(activeId, fd);
        await loadCopies(subject.id); // new file url → render effect reruns, marks now baked in
      } else {
        const fd = new FormData();
        fd.set("name", `${subject.name} (copy ${copies.length + 1})`);
        fd.set("file", file);
        fd.set("source", subject.id); // a copy of the original — not a part of it
        fd.set("uploaded_by", pb.authStore.record!.id);
        const rec = await pb.collection("zumen").create<Zumen>(fd);
        await loadCopies(subject.id);
        setActiveId(rec.id);
        setPage(1);
      }
    } catch (e) {
      toast.error(`Save failed: ${e}`);
    } finally {
      setBusy("");
    }
  }

  function printSheet() {
    if (!subject || !baseRef.current) return;
    const data = flatten().toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return toast.error("Allow pop-ups to print.");
    w.document.write(
      `<!doctype html><title>${subject.name}</title>` +
        `<style>@page{margin:10mm}html,body{margin:0}img{display:block;width:100%}</style>` +
        `<img src="${data}" onload="window.focus();window.print()">`
    );
    w.document.close();
  }

  function downloadSheet() {
    if (!active || !baseRef.current) return;
    const a = document.createElement("a");
    a.href = flatten().toDataURL("image/png");
    a.download = `${active.name}.png`;
    a.click();
  }

  // rename the original drawing (oya or ko); copies keep their auto "(copy N)" name
  async function rename(next: string) {
    setEditingName(false);
    const name = next.trim();
    if (!subject || !name || name === subject.name) return;
    try {
      await pb.collection("zumen").update(subject.id, { name });
      setSubject({ ...subject, name });
      if (root && subject.id === root.id) setRoot({ ...root, name });
      onReload(); // sidebar picks up the new name
    } catch (e) {
      toast.error(`Rename failed: ${e}`);
    }
  }

  // upload new file(s) as real parts (ko) of the blueprint; onReload (new part in the
  // sidebar tree) fires from useZumenUpload itself once the batch settles
  async function addKo(files: FileList | null) {
    setBusy("Attaching…");
    await uploadKo(files);
    if (root) await loadParts(root.id); // reflect the new parts in the panel without a remount
    setBusy("");
  }

  // re-home existing blueprints as parts (ko) of this one — each stops being an oya
  async function attachExisting(oyaIds: string[]) {
    if (!root || !oyaIds.length) return;
    setBusy("Attaching…");
    try {
      for (const oid of oyaIds) await pb.collection("zumen").update(oid, { oya: root.id });
      await loadParts(root.id);
      onReload();
    } catch (e) {
      toast.error(`Attach failed: ${e}`);
    } finally {
      setBusy("");
    }
  }

  // open a part (ko) from the panel. Same sheet already open → return to its original view
  // (from a copy); otherwise navigate, guarding any unsaved marks first.
  async function openPart(pid: string) {
    if (pid === subject?.id) {
      if (viewingCopy) view(subject.id);
      return;
    }
    if (await confirmDiscard()) onOpen(pid);
  }

  async function delSubject() {
    if (!subject || !root) return;
    const isOya = subject.id === root.id;
    const msg = isOya
      ? `Delete "${subject.name}" and all its parts and copies?`
      : `Delete part "${subject.name}" and its copies?`;
    if (!(await confirm(msg, { danger: true }))) return;
    try {
      await pb.collection("zumen").delete(subject.id);
      onReload();
      if (isOya) onHome();
      else onOpen(root.id);
    } catch (e) {
      toast.error(`Delete failed: ${e}`);
    }
  }

  async function delCopy(cid: string) {
    if (!subject || !(await confirm("Delete this copy?", { danger: true }))) return;
    try {
      await pb.collection("zumen").delete(cid);
      await loadCopies(subject.id);
      if (activeId === cid) setActiveId(subject.id);
    } catch (e) {
      toast.error(`Delete failed: ${e}`);
    }
  }

  async function view(zid: string) {
    if (zid === activeId || !(await confirmDiscard())) return;
    setActiveId(zid);
    setPage(1);
    setCopiesOpen(false);
  }

  const zoomBy = (f: number) => setZoom((z) => Math.min(4, Math.max(0.5, +(z * f).toFixed(2))));

  if (!subject || !root)
    return (
      <div className="workspace grid h-full place-items-center">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-ink-300">
          <Spinner /> Loading sheet…
        </div>
      </div>
    );

  const viewingCopy = activeId !== subject.id;
  const oyaActive = !viewingCopy && subject.id === root.id; // the parent blueprint is the active sheet
  // segmented pan/pen toggle inside the dark instrument tray. Pen glows viridian when
  // engaged — the one "live" accent — while pan stays cyanotype blue.
  const seg = (on: boolean, live = false) =>
    `grid h-9 w-10 place-items-center rounded-md transition-all active:scale-[0.96] ${
      on
        ? live
          ? "bg-virid-500 text-char-950 shadow-sm shadow-virid-600/40"
          : "bg-print-600 text-white shadow-sm shadow-print-800/50"
        : "text-ink-300 hover:text-white"
    }`;
  const tbtn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-md text-ink-300 transition-all hover:bg-white/10 hover:text-white active:scale-[0.96] disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="flex h-full">
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* title bar */}
        <header className="flex h-14 shrink-0 items-center gap-1.5 border-b border-paper-300 bg-paper-50 px-2 sm:gap-2 sm:px-4">
          <IconButton label="Menu" onClick={onMenu} className="lg:hidden">
            <Menu className="h-5 w-5" />
          </IconButton>
          <div className="flex min-w-0 items-center gap-1.5 text-sm">
            {subject.id !== root.id && (
              <>
                <button
                  onClick={async () => (await confirmDiscard()) && onOpen(root.id)}
                  className="hidden max-w-48 truncate text-ink-500 transition hover:text-print-600 sm:block"
                  title={root.name}
                >
                  {root.name}
                </button>
                <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-paper-400 sm:block" />
              </>
            )}
            {editingName ? (
              <input
                autoFocus
                defaultValue={subject.name}
                onBlur={(e) => rename(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  else if (e.key === "Escape") {
                    e.currentTarget.value = subject.name; // no-op on rename
                    e.currentTarget.blur();
                  }
                }}
                className="max-w-36 rounded border border-print-300 bg-white px-1.5 py-0.5 text-sm font-semibold text-ink-900 focus:border-print-500 sm:max-w-[20rem]"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                title="Click to rename"
                className="max-w-36 truncate font-semibold text-ink-900 transition hover:text-print-600 sm:max-w-[20rem]"
              >
                {subject.name}
              </button>
            )}
            {viewingCopy && <Stamp>写 copy</Stamp>}
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
            <IconButton label="Download" onClick={downloadSheet}>
              <Download className="h-5 w-5" />
            </IconButton>
            <IconButton label="Print" onClick={printSheet}>
              <Printer className="h-5 w-5" />
            </IconButton>
            <Button variant="outline" asChild className="h-9 px-2.5 sm:px-3">
              <Link to="attach">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{busy || "Attach part"}</span>
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setCopiesOpen(true)} className="h-9 px-2.5 xl:hidden" title="Copies">
              <Copy className="h-4 w-4" />
              <span className="font-mono text-xs tabular-nums">{copies.length}</span>
            </Button>
            <IconButton
              danger
              label={subject.id === root.id ? "Delete blueprint" : "Delete part"}
              onClick={delSubject}
            >
              <Trash2 className="h-5 w-5" />
            </IconButton>
          </div>
        </header>

        {/* parts (ko) filmstrip — the oya (親) preview is pinned at the very left so returning to
            the parent blueprint is always one tap away, then its sub-drawings scroll to the right.
            The active sheet is highlighted; hidden when the blueprint has no parts. */}
        {parts.length > 0 && (
          <div className="shrink-0 border-b border-paper-300 bg-paper-100/80">
            <div className="flex items-stretch gap-2 overflow-x-auto px-2 py-2 sm:px-4">
              {/* oya (parent) — sticky at the very left, masks the parts scrolling behind it */}
              <div className="sticky left-0 z-10 flex shrink-0 items-center gap-1.5 bg-paper-100/80 pr-1">
                <button
                  onClick={() => openPart(root.id)}
                  title={`Back to ${root.name}`}
                  aria-current={oyaActive}
                  className={`group relative w-24 shrink-0 overflow-hidden rounded-md border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                    oyaActive ? "border-print-500 ring-1 ring-print-500" : "border-paper-300 hover:border-print-400"
                  }`}
                >
                  <div className="grid aspect-4/3 place-items-center overflow-hidden border-b border-paper-200 bg-paper-100">
                    <Thumb z={root} token={token} width={200} />
                  </div>
                  <div className="flex items-center gap-1 px-1.5 py-1">
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-sm border border-print-200 bg-print-50 text-[9px] font-semibold text-print-700 select-none">
                      親
                    </span>
                    <span className={`truncate text-[11px] ${oyaActive ? "font-semibold text-print-800" : "text-ink-700"}`}>
                      {root.name}
                    </span>
                  </div>
                </button>
                <ChevronRight className="h-4 w-4 shrink-0 text-paper-400" />
              </div>
              {parts.map((p) => {
                const on = !viewingCopy && p.id === subject.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => openPart(p.id)}
                    title={p.name}
                    aria-current={on}
                    className={`group relative w-24 shrink-0 overflow-hidden rounded-md border bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      on ? "border-print-500 ring-1 ring-print-500" : "border-paper-300 hover:border-print-400"
                    }`}
                  >
                    <div className="grid aspect-4/3 place-items-center overflow-hidden border-b border-paper-200 bg-paper-100">
                      <Thumb z={p} token={token} width={200} />
                    </div>
                    <div
                      className={`truncate px-1.5 py-1 text-[11px] ${on ? "font-semibold text-print-800" : "text-ink-700"}`}
                    >
                      {p.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* stage + HUD in a relative box so the readout pins to the stage's own top-left and
            never collides with the parts filmstrip above it */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          {/* the stage — a charcoal table the sheet floats on, lit from above */}
          <main className="workspace min-h-0 flex-1 overflow-auto p-6 pb-28 sm:p-10">
            <div
              className="crop-marks relative mx-auto bg-white text-white/30 shadow-2xl shadow-black/70 ring-1 ring-white/10"
              style={{ width: `${zoom * 100}%`, maxWidth: 1600 * zoom }}
            >
              <canvas ref={baseRef} className="block h-auto w-full" />
              <canvas
                ref={drawRef}
                className={`absolute inset-0 h-full w-full ${mode === "pen" ? "cursor-crosshair" : "pointer-events-none"}`}
                style={{ touchAction: mode === "pen" ? "none" : "auto" }}
                onPointerDown={down}
                onPointerMove={move}
                onPointerUp={up}
                onPointerCancel={up}
              />
              {pageLoading && (
                <div className="absolute inset-0 grid place-items-center bg-white/70">
                  <Spinner />
                </div>
              )}
            </div>
          </main>

          {/* viewport HUD — pinned to the stage top-left, technical readout of the active sheet */}
          <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-wrap items-center gap-1.5 sm:left-6">
            <span
              className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ring-1 backdrop-blur ${
                mode === "pen"
                  ? "bg-virid-500/10 text-virid-300 ring-virid-500/30"
                  : "bg-char-900/70 text-ink-200 ring-white/10"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${mode === "pen" ? "animate-live bg-virid-400" : "bg-ink-400"}`}
              />
              {mode === "pen" ? "Marking" : "View"}
            </span>
            <span className="rounded-md bg-char-900/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ink-300 ring-1 ring-white/10 backdrop-blur">
              {dims ? `${dims.w}×${dims.h}` : "—"}
            </span>
            <span className="rounded-md bg-char-900/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-ink-300 ring-1 ring-white/10 backdrop-blur">
              {active && isPdf(active) ? "PDF" : active && isTiff(active) ? "TIFF" : "IMG"}
              {numPages > 1 ? ` · p${page}/${numPages}` : ""}
            </span>
          </div>
        </div>

        {/* instrument tray — Radix Toolbar, dark glass, docked bottom-centre */}
        <div className="fixed bottom-4 left-1/2 z-20 max-w-[94vw] -translate-x-1/2 sm:bottom-6">
          <Toolbar.Root className="flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-char-800/85 px-2 py-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur-md sm:gap-2 sm:px-3 sm:py-2">
            <Toolbar.ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => v && setMode(v as "pan" | "pen")}
              className="flex shrink-0 items-center rounded-lg bg-char-950/70 p-0.5 ring-1 ring-white/5"
            >
              <Tip label="Pan / zoom">
                <Toolbar.ToggleItem value="pan" aria-label="Pan / zoom" className={seg(mode === "pan")}>
                  <Move className="h-5 w-5" />
                </Toolbar.ToggleItem>
              </Tip>
              <Tip label="Draw">
                <Toolbar.ToggleItem value="pen" aria-label="Draw" className={seg(mode === "pen", true)}>
                  <Pen className="h-5 w-5" />
                </Toolbar.ToggleItem>
              </Tip>
            </Toolbar.ToggleGroup>

            <Toolbar.Separator className="h-6 w-px shrink-0 bg-white/10" />
            <Tip label="Zoom out">
              <Toolbar.Button onClick={() => zoomBy(0.8)} className={tbtn}>
                <ZoomOut className="h-5 w-5" />
              </Toolbar.Button>
            </Tip>
            <Tip label="Reset zoom">
              <Toolbar.Button
                onClick={() => setZoom(1)}
                className="w-12 shrink-0 rounded-md py-2 text-center font-mono text-[11px] tabular-nums text-ink-200 transition hover:bg-white/10 hover:text-white"
              >
                {Math.round(zoom * 100)}%
              </Toolbar.Button>
            </Tip>
            <Tip label="Zoom in">
              <Toolbar.Button onClick={() => zoomBy(1.25)} className={tbtn}>
                <ZoomIn className="h-5 w-5" />
              </Toolbar.Button>
            </Tip>

            {mode === "pen" && (
              <>
                <Toolbar.Separator className="h-6 w-px shrink-0 bg-white/10" />
                <div className="flex shrink-0 items-center gap-1.5">
                  {PRESETS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      style={{ background: c }}
                      aria-label={`Pen colour ${c}`}
                      className={`h-7 w-7 rounded-full transition-all ${
                        color === c
                          ? "ring-2 ring-white ring-offset-2 ring-offset-char-800"
                          : "ring-1 ring-white/15 hover:scale-110"
                      }`}
                    />
                  ))}
                  <label
                    className="relative grid h-7 w-7 cursor-pointer place-items-center overflow-hidden rounded-full ring-1 ring-white/20"
                    title="Custom colour"
                  >
                    <Pen className="h-3.5 w-3.5 text-ink-200" />
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </label>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={penWidth}
                  onChange={(e) => setPenWidth(+e.target.value)}
                  className="w-20 shrink-0 accent-virid-500"
                  title={`Pen width ${penWidth}px`}
                />
                <Tip label="Undo">
                  <Toolbar.Button onClick={() => setStrokes((s) => s.slice(0, -1))} className={tbtn}>
                    <Undo2 className="h-5 w-5" />
                  </Toolbar.Button>
                </Tip>
                <Tip label="Clear marks">
                  <Toolbar.Button onClick={() => setStrokes([])} className={tbtn}>
                    <Eraser className="h-5 w-5" />
                  </Toolbar.Button>
                </Tip>
              </>
            )}

            {numPages > 1 && (
              <>
                <Toolbar.Separator className="h-6 w-px shrink-0 bg-white/10" />
                <div className="flex shrink-0 items-center gap-1">
                  <Tip label="Previous page">
                    <Toolbar.Button
                      onClick={async () => (await confirmDiscard()) && setPage((p) => Math.max(1, p - 1))}
                      className={tbtn}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Toolbar.Button>
                  </Tip>
                  <span className="w-10 text-center font-mono text-xs tabular-nums text-ink-200">
                    {page}/{numPages}
                  </span>
                  <Tip label="Next page">
                    <Toolbar.Button
                      onClick={async () => (await confirmDiscard()) && setPage((p) => Math.min(numPages, p + 1))}
                      className={tbtn}
                      disabled={page >= numPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Toolbar.Button>
                  </Tip>
                </div>
              </>
            )}
          </Toolbar.Root>
        </div>
      </div>

      {/* right panel: copies of the current drawing — drawer below xl, static on xl */}
      {copiesOpen && (
        <div className="animate-fade fixed inset-0 z-30 bg-ink-950/60 backdrop-blur-[2px] xl:hidden" onClick={() => setCopiesOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 right-0 z-40 flex w-72 shrink-0 transform flex-col border-l border-paper-300 bg-paper-50 transition-transform xl:static xl:w-64 xl:translate-x-0 ${
          copiesOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center gap-2.5 border-b border-paper-200 bg-white px-3.5 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-print-200 bg-print-50 text-sm font-semibold text-print-700 select-none">
            写
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold leading-tight text-ink-900">Copies</div>
            <div className="font-mono text-[9px] uppercase tracking-widest text-ink-400">{copies.length} saved</div>
          </div>
          <IconButton label="Close copies" onClick={() => setCopiesOpen(false)} className="h-8 w-8 xl:hidden">
            <X className="h-4 w-4" />
          </IconButton>
        </header>

        <div className="flex flex-1 flex-col gap-2 overflow-auto p-2.5">
          <ThumbRow z={subject} token={token} label="Original" active={!viewingCopy} onClick={() => view(subject.id)} />
          {copies.map((c, i) => (
            <SwipeToDelete key={c.id} onDelete={() => delCopy(c.id)}>
              <ThumbRow
                z={c}
                token={token}
                label={`Copy ${i + 1}`}
                sub={new Date(c.created).toLocaleDateString()}
                active={activeId === c.id}
                onClick={() => view(c.id)}
                onDelete={() => delCopy(c.id)}
              />
            </SwipeToDelete>
          ))}
          {copies.length === 0 && (
            <div className="mx-1 mt-1 rounded-md border border-dashed border-paper-300 px-3 py-6 text-center text-xs leading-relaxed text-ink-400">
              No copies yet.
              <br />
              Switch to the pen, mark up the sheet, then save a copy below.
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-paper-200 bg-white p-3">
          {viewingCopy && (
            <Button onClick={() => save(true)} disabled={!!busy} className="w-full">
              {busy ? <Spinner /> : <Pen className="h-4 w-4" />}
              {busy || "Save"}
            </Button>
          )}
          <Button
            variant={viewingCopy ? "outline" : "primary"}
            onClick={() => save(false)}
            disabled={!!busy}
            className="w-full"
          >
            {busy && !viewingCopy ? <Spinner /> : <Copy className="h-4 w-4" />}
            {viewingCopy ? "Save as new copy" : busy || "Save marked-up copy"}
          </Button>
        </div>
      </aside>

      <Outlet context={{ rootId: root.id, token, onUpload: addKo, onAttach: attachExisting } satisfies AttachContext} />
      {confirmDialog}
    </div>
  );
}

function ThumbRow({
  z,
  token,
  label,
  sub,
  active,
  onClick,
  onDelete,
}: {
  z: Zumen;
  token: string;
  label: string;
  sub?: string;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-2.5 rounded-md border p-1.5 text-left transition ${
          active
            ? "border-print-500 bg-print-50 shadow-sm shadow-print-900/10"
            : "border-paper-300 bg-white hover:border-print-300"
        }`}
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-sm border border-paper-200 bg-paper-100">
          <Thumb z={z} token={token} width={120} />
        </div>
        <div className="min-w-0">
          <div className={`truncate text-sm ${active ? "font-semibold text-print-800" : "font-medium text-ink-800"}`}>
            {label}
          </div>
          {sub && <div className="font-mono text-[10px] uppercase tracking-wider text-ink-400">{sub}</div>}
        </div>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete copy"
          className="absolute right-1 top-1 grid h-7 w-7 place-items-center rounded-md bg-white/90 text-ink-300 opacity-0 shadow-sm transition hover:text-verm-600 group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
