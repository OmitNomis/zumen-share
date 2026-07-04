import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { pb, type Zumen } from "../lib/pb";
import { Thumb } from "./thumb";
import { useFileDrop } from "../hooks/use-file-drop";
import { BTN, Modal } from "../ui";
import { Upload } from "lucide-react";
import type { AttachContext } from "./viewer";

// Nested route rendered at /z/:id/attach (inside Viewer's own <Outlet>): either upload
// new file(s) or pick an already-uploaded blueprint (which gets re-homed as a part of the current one).
export function AttachPart() {
  const { rootId, token, onUpload, onAttach } = useOutletContext<AttachContext>();
  const navigate = useNavigate();
  const close = () => navigate("..");
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

  function upload(files: FileList | null) {
    onUpload(files);
    close();
  }

  function attach(id: string) {
    onAttach(id);
    close();
  }

  const { isOver, dropProps } = useFileDrop(upload);

  return (
    <Modal title="Attach a part" kanji="部" sub="add a ko under this sheet" onClose={close}>
      <div className="border-b border-paper-200 bg-white p-4" {...dropProps}>
        <label
          className={`${BTN.primary} w-full cursor-pointer ${isOver ? "ring-2 ring-print-300 ring-offset-2" : ""}`}
        >
          <Upload className="h-4 w-4" />
          {isOver ? "Drop to upload" : "Upload new file(s)"}
          <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={(e) => upload(e.target.files)} />
        </label>
      </div>

      <div className="px-5 pb-2 pt-4 font-mono text-[10px] font-semibold uppercase tracking-widest text-ink-400">
        Or re-home an existing blueprint
      </div>
      <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 overflow-auto p-4 pt-0">
        {candidates.map((z) => (
          <button
            key={z.id}
            onClick={() => attach(z.id)}
            className="overflow-hidden rounded-lg border border-paper-300 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-print-400 hover:shadow-md"
          >
            <div className="grid aspect-4/3 place-items-center overflow-hidden border-b border-paper-200 bg-paper-100">
              <Thumb z={z} token={token} width={280} />
            </div>
            <div className="truncate p-2 text-sm text-ink-800" title={z.name}>
              {z.name}
            </div>
          </button>
        ))}
        {candidates.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-ink-400">No standalone blueprints to attach.</p>
        )}
      </div>
    </Modal>
  );
}
