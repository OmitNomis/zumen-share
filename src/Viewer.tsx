import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { pb, fileUrl, isPdf, isTiff, baseName, type Zumen } from "./lib/pb";
import { tiffToCanvas } from "./lib/preview"; // also configures the pdf.js worker
import Thumb from "./Thumb";
import SwipeToDelete from "./SwipeToDelete";
import * as Icon from "./icons";

type Stroke = { color: string; width: number; points: { x: number; y: number }[] };
const PRESETS = ["#e11d1d", "#2563eb", "#16a34a", "#eab308", "#111827"];

type Props = {
  id: string; // an oya or a ko (never a copy — copies are opened from the right panel)
  onOpen: (id: string) => void;
  onHome: () => void;
  onReload: () => void; // refresh the sidebar tree
  onMenu: () => void; // open the left sidebar drawer (small screens)
};

export default function Viewer({ id, onOpen, onHome, onReload, onMenu }: Props) {
  const [subject, setSubject] = useState<Zumen | null>(null); // the drawing being viewed (oya or ko)
  const [root, setRoot] = useState<Zumen | null>(null); // its oya (== subject when subject is an oya)
  const [copies, setCopies] = useState<Zumen[]>([]); // markup snapshots of subject
  const [token, setToken] = useState(""); // for right-panel thumbnails
  const [activeId, setActiveId] = useState(id); // subject.id, or a copy id when viewing a copy
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [mode, setMode] = useState<"pan" | "pen">("pan"); // default pan so touch can scroll / pinch-zoom
  const [zoom, setZoom] = useState(1);
  const [color, setColor] = useState("#e11d1d");
  const [penWidth, setPenWidth] = useState(3);
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(1);
  const [busy, setBusy] = useState("");
  const [copiesOpen, setCopiesOpen] = useState(false); // right drawer on small screens
  const [editingName, setEditingName] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const baseRef = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Stroke | null>(null);
  const pdfCache = useRef<{ id: string; pdf: PDFDocumentProxy } | null>(null);

  const active = subject && (activeId === subject.id ? subject : copies.find((c) => c.id === activeId));

  async function loadCopies(subjId: string) {
    const cs = await pb.collection("zumen").getFullList<Zumen>({
      filter: pb.filter("source = {:id}", { id: subjId }),
      sort: "created",
    });
    setCopies(cs);
    return cs;
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
      await loadCopies(subj.id);
    })().catch((e) => alert(e));
  }, [id]);

  // render the active file onto the base canvas
  useEffect(() => {
    if (!active) return;
    let dead = false;
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
      setStrokes([]);
      current.current = null;
    })().catch((e) => !dead && alert(e));
    return () => {
      dead = true;
    };
  }, [active?.id, active?.file, page]);

  // full redraw of the overlay whenever strokes change (undo / clear / stroke end)
  useEffect(() => {
    const draw = drawRef.current;
    if (!draw) return;
    const ctx = draw.getContext("2d")!;
    ctx.clearRect(0, 0, draw.width, draw.height);
    for (const s of strokes) paintStroke(ctx, s);
  }, [strokes]);

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

  const confirmDiscard = () => !strokes.length || confirm("Discard unsaved marks?");

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
      alert(`Save failed: ${e}`);
    } finally {
      setBusy("");
    }
  }

  function printSheet() {
    if (!subject || !baseRef.current) return;
    const data = flatten().toDataURL("image/png");
    const w = window.open("", "_blank");
    if (!w) return alert("Allow pop-ups to print.");
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
      alert(`Rename failed: ${e}`);
    }
  }

  // upload new file(s) as real parts (ko) of the blueprint
  async function addKo(files: FileList | null) {
    if (!files?.length || !root) return;
    setBusy("Attaching…");
    setAttachOpen(false);
    try {
      for (const f of [...files]) {
        const fd = new FormData();
        fd.set("name", baseName(f.name));
        fd.set("file", f);
        fd.set("oya", root.id);
        fd.set("uploaded_by", pb.authStore.record!.id);
        await pb.collection("zumen").create(fd);
      }
      onReload(); // new part appears in the sidebar tree
    } catch (e) {
      alert(`Attach failed: ${e}`);
    } finally {
      setBusy("");
    }
  }

  // re-home an existing blueprint as a part (ko) of this one — it stops being an oya
  async function attachExisting(oyaId: string) {
    if (!root) return;
    setBusy("Attaching…");
    setAttachOpen(false);
    try {
      await pb.collection("zumen").update(oyaId, { oya: root.id });
      onReload();
    } catch (e) {
      alert(`Attach failed: ${e}`);
    } finally {
      setBusy("");
    }
  }

  async function delSubject() {
    if (!subject || !root) return;
    const isOya = subject.id === root.id;
    const msg = isOya
      ? `Delete "${subject.name}" and all its parts and copies?`
      : `Delete part "${subject.name}" and its copies?`;
    if (!confirm(msg)) return;
    try {
      await pb.collection("zumen").delete(subject.id);
      onReload();
      if (isOya) onHome();
      else onOpen(root.id);
    } catch (e) {
      alert(`Delete failed: ${e}`);
    }
  }

  async function delCopy(cid: string) {
    if (!subject || !confirm("Delete this copy?")) return;
    try {
      await pb.collection("zumen").delete(cid);
      await loadCopies(subject.id);
      if (activeId === cid) setActiveId(subject.id);
    } catch (e) {
      alert(`Delete failed: ${e}`);
    }
  }

  function view(zid: string) {
    if (zid === activeId || !confirmDiscard()) return;
    setActiveId(zid);
    setPage(1);
    setCopiesOpen(false);
  }

  const zoomBy = (f: number) => setZoom((z) => Math.min(4, Math.max(0.5, +(z * f).toFixed(2))));

  if (!subject || !root) return <div className="h-full grid place-items-center text-slate-400">Loading…</div>;

  const viewingCopy = activeId !== subject.id;
  const seg = (on: boolean) =>
    `grid place-items-center w-10 h-9 rounded-md transition ${on ? "bg-white shadow text-indigo-600" : "text-slate-500"}`;
  const tbtn = "grid place-items-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-40 shrink-0";
  const iconBtn = "grid place-items-center w-10 h-10 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0";
  const outline = "flex items-center gap-1.5 text-sm border border-slate-300 rounded-lg px-3 h-10 hover:bg-slate-50 shrink-0";

  return (
    <div className="h-full flex">
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-14 shrink-0 bg-white border-b border-slate-200 flex items-center gap-2 sm:gap-3 px-3 sm:px-5">
          <button onClick={onMenu} className="lg:hidden grid place-items-center w-10 h-10 -ml-1 rounded-lg hover:bg-slate-100">
            <Icon.Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex items-center gap-1.5 text-sm">
            {subject.id !== root.id && (
              <>
                <button
                  onClick={() => confirmDiscard() && onOpen(root.id)}
                  className="hidden sm:block text-slate-500 hover:text-indigo-600 truncate max-w-[12rem]"
                  title={root.name}
                >
                  {root.name}
                </button>
                <Icon.Chevron className="hidden sm:block w-3.5 h-3.5 text-slate-300 shrink-0" />
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
                className="font-semibold text-sm border border-indigo-300 rounded px-1.5 py-0.5 outline-none focus:ring-2 focus:ring-indigo-500 max-w-[9rem] sm:max-w-[20rem]"
              />
            ) : (
              <button
                onClick={() => setEditingName(true)}
                title="Click to rename"
                className="font-semibold truncate max-w-[9rem] sm:max-w-[20rem] hover:text-indigo-600"
              >
                {subject.name}
              </button>
            )}
            {viewingCopy && (
              <span className="shrink-0 rounded-full bg-indigo-50 text-indigo-600 text-xs px-2 py-0.5">copy</span>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button onClick={downloadSheet} title="Download" className={iconBtn}>
              <Icon.Download className="w-5 h-5" />
            </button>
            <button onClick={printSheet} title="Print" className={iconBtn}>
              <Icon.Printer className="w-5 h-5" />
            </button>
            <button onClick={() => setAttachOpen(true)} disabled={!!busy} className={outline}>
              <Icon.Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{busy || "Attach part"}</span>
            </button>
            <button onClick={() => setCopiesOpen(true)} className={`xl:hidden ${outline}`} title="Copies">
              <Icon.Copies className="w-4 h-4" />
              {copies.length}
            </button>
            <button
              onClick={delSubject}
              title={subject.id === root.id ? "Delete blueprint" : "Delete part"}
              className="grid place-items-center w-10 h-10 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 shrink-0"
            >
              <Icon.Trash className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 relative overflow-auto blueprint-bg p-4 sm:p-6 pb-28">
          <div
            className="relative bg-white shadow-xl ring-1 ring-black/5 mx-auto"
            style={{ width: `${zoom * 100}%`, maxWidth: 1600 * zoom }}
          >
            <canvas ref={baseRef} className="block w-full h-auto" />
            <canvas
              ref={drawRef}
              className={`absolute inset-0 w-full h-full ${mode === "pen" ? "cursor-crosshair" : "pointer-events-none"}`}
              style={{ touchAction: mode === "pen" ? "none" : "auto" }}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
            />
          </div>

          {/* floating toolbar */}
          <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 max-w-[94vw] z-20">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200 px-2 sm:px-3 py-2 overflow-x-auto">
              <div className="flex items-center bg-slate-100 rounded-lg p-0.5 shrink-0">
                <button onClick={() => setMode("pan")} className={seg(mode === "pan")} title="Pan / zoom">
                  <Icon.Move className="w-5 h-5" />
                </button>
                <button onClick={() => setMode("pen")} className={seg(mode === "pen")} title="Draw">
                  <Icon.Pen className="w-5 h-5" />
                </button>
              </div>

              <div className="w-px h-6 bg-slate-200 shrink-0" />
              <button onClick={() => zoomBy(0.8)} className={tbtn} title="Zoom out">
                <Icon.ZoomOut className="w-5 h-5" />
              </button>
              <button onClick={() => setZoom(1)} className="text-xs tabular-nums w-11 text-center text-slate-600 shrink-0" title="Reset zoom">
                {Math.round(zoom * 100)}%
              </button>
              <button onClick={() => zoomBy(1.25)} className={tbtn} title="Zoom in">
                <Icon.ZoomIn className="w-5 h-5" />
              </button>

              {mode === "pen" && (
                <>
                  <div className="w-px h-6 bg-slate-200 shrink-0" />
                  <div className="flex items-center gap-1.5 shrink-0">
                    {PRESETS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        style={{ background: c }}
                        className={`w-7 h-7 rounded-full transition ${
                          color === c ? "ring-2 ring-offset-2 ring-slate-400" : ""
                        }`}
                      />
                    ))}
                    <label className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-slate-300 cursor-pointer grid place-items-center relative">
                      <Icon.Pen className="w-3.5 h-3.5 text-slate-500" />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={penWidth}
                    onChange={(e) => setPenWidth(+e.target.value)}
                    className="w-20 accent-indigo-600 shrink-0"
                    title={`Pen width ${penWidth}px`}
                  />
                  <button onClick={() => setStrokes((s) => s.slice(0, -1))} className={tbtn} title="Undo">
                    <Icon.Undo className="w-5 h-5" />
                  </button>
                  <button onClick={() => setStrokes([])} className={tbtn} title="Clear marks">
                    <Icon.Eraser className="w-5 h-5" />
                  </button>
                </>
              )}

              {numPages > 1 && (
                <>
                  <div className="w-px h-6 bg-slate-200 shrink-0" />
                  <div className="flex items-center gap-1 text-sm text-slate-600 shrink-0">
                    <button onClick={() => confirmDiscard() && setPage((p) => Math.max(1, p - 1))} className={tbtn} disabled={page <= 1}>
                      ‹
                    </button>
                    <span className="tabular-nums w-10 text-center">
                      {page}/{numPages}
                    </span>
                    <button
                      onClick={() => confirmDiscard() && setPage((p) => Math.min(numPages, p + 1))}
                      className={tbtn}
                      disabled={page >= numPages}
                    >
                      ›
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* right panel: copies of the current drawing — drawer below xl, static on xl */}
      {copiesOpen && <div className="fixed inset-0 bg-slate-900/50 z-30 xl:hidden" onClick={() => setCopiesOpen(false)} />}
      <aside
        className={`fixed xl:static inset-y-0 right-0 z-40 w-72 xl:w-64 shrink-0 bg-white border-l border-slate-200 flex flex-col transform transition-transform xl:translate-x-0 ${
          copiesOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="px-4 py-3.5 border-b border-slate-200 flex items-center gap-2">
          <Icon.Copies className="w-4 h-4 text-slate-500" />
          <span className="font-semibold text-sm">Copies</span>
          <span className="ml-auto text-xs text-slate-400">{copies.length}</span>
          <button onClick={() => setCopiesOpen(false)} className="xl:hidden grid place-items-center w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100">
            <Icon.X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-2.5 flex flex-col gap-2">
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
            <p className="text-xs text-slate-400 text-center px-3 py-6">
              No copies yet. Switch to the pen, mark up the sheet, then save a copy below.
            </p>
          )}
        </div>

        <div className="p-3 border-t border-slate-200 flex flex-col gap-2">
          {viewingCopy && (
            <button
              onClick={() => save(true)}
              disabled={!!busy}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition"
            >
              <Icon.Pen className="w-4 h-4" />
              {busy || "Save"}
            </button>
          )}
          <button
            onClick={() => save(false)}
            disabled={!!busy}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition ${
              viewingCopy
                ? "border border-slate-300 text-slate-600 hover:bg-slate-50"
                : "bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
            }`}
          >
            <Icon.Copies className="w-4 h-4" />
            {viewingCopy ? "Save as new copy" : busy || "Save marked-up copy"}
          </button>
        </div>
      </aside>

      {attachOpen && (
        <AttachPart
          rootId={root.id}
          token={token}
          onUpload={addKo}
          onAttach={attachExisting}
          onClose={() => setAttachOpen(false)}
        />
      )}
    </div>
  );
}

// Attach a part: either upload new file(s) or pick an already-uploaded blueprint
// (which gets re-homed as a part of the current one).
function AttachPart({
  rootId,
  token,
  onUpload,
  onAttach,
  onClose,
}: {
  rootId: string;
  token: string;
  onUpload: (files: FileList | null) => void;
  onAttach: (id: string) => void;
  onClose: () => void;
}) {
  const [candidates, setCandidates] = useState<Zumen[]>([]);

  useEffect(() => {
    pb.collection("zumen")
      .getFullList<Zumen>({ filter: "source = ''", sort: "-created" })
      .then((items) => {
        // candidates = top-level oya, excluding this one and any that already have parts
        // (the tree is only two levels deep, so moving a parent would orphan its parts)
        const parents = new Set(items.filter((z) => z.oya).map((z) => z.oya));
        setCandidates(items.filter((z) => !z.oya && z.id !== rootId && !parents.has(z.id)));
      })
      .catch(console.error);
  }, [rootId]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="font-bold text-lg">Attach a part</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">
            ×
          </button>
        </header>

        <div className="p-4 border-b border-slate-200">
          <label className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-white cursor-pointer bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 transition">
            <Icon.Upload className="w-4 h-4" />
            Upload new file(s)
            <input
              type="file"
              multiple
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => onUpload(e.target.files)}
            />
          </label>
        </div>

        <div className="px-4 py-2 text-xs font-medium text-slate-400">Or add an existing blueprint</div>
        <div className="flex-1 overflow-auto p-4 pt-0 grid gap-3 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
          {candidates.map((z) => (
            <button
              key={z.id}
              onClick={() => onAttach(z.id)}
              className="text-left rounded-xl bg-white ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-md transition overflow-hidden"
            >
              <div className="aspect-[4/3] bg-slate-100 grid place-items-center overflow-hidden">
                <Thumb z={z} token={token} width={280} />
              </div>
              <div className="p-2 text-sm truncate" title={z.name}>
                {z.name}
              </div>
            </button>
          ))}
          {candidates.length === 0 && (
            <p className="col-span-full text-center text-sm text-slate-400 py-8">
              No standalone blueprints to attach.
            </p>
          )}
        </div>
      </div>
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
    <div className="relative group">
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2.5 rounded-lg p-1.5 text-left ring-1 transition ${
          active ? "ring-indigo-500 bg-indigo-50" : "ring-slate-200 bg-white hover:ring-slate-300 hover:bg-slate-50"
        }`}
      >
        <div className="w-12 h-12 rounded-md bg-slate-100 grid place-items-center overflow-hidden shrink-0">
          <Thumb z={z} token={token} width={120} />
        </div>
        <div className="min-w-0">
          <div className={`text-sm truncate ${active ? "font-semibold text-indigo-700" : ""}`}>{label}</div>
          {sub && <div className="text-xs text-slate-400">{sub}</div>}
        </div>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          title="Delete copy"
          className="absolute top-1 right-1 grid place-items-center w-7 h-7 rounded-md bg-white/90 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition"
        >
          <Icon.Trash className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
