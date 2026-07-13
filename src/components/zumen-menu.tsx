import { DropdownMenu } from "radix-ui";
import { Download, EllipsisVertical, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { pb, fileUrl, isPdf, isTiff, type Zumen } from "../lib/pb";
import { tiffToCanvas } from "../lib/preview";

type Props = {
  z: Zumen; // always an oya (grid only shows top-level blueprints)
  token: string;
  confirm: (msg: string, opts?: { danger?: boolean }) => Promise<boolean>;
  onDeleted: () => void;
};

// Per-card "⋮" menu on the blueprint grid: download / print / delete the original file.
// Download/delete mirror the multi-select bulk actions in home-page.tsx for a single item.
export function ZumenMenu({ z, token, confirm, onDeleted }: Props) {
  function download() {
    const dot = z.file.lastIndexOf(".");
    const ext = dot < 0 ? "" : z.file.slice(dot);
    const a = document.createElement("a");
    a.href = fileUrl(z, token) + "&download=1";
    a.download = z.name.endsWith(ext) ? z.name : z.name + ext;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // PDFs print (all pages) in the browser's native viewer; raster images auto-print in a popup.
  // ponytail: TIFF isn't browser-renderable, so decode it first. PDFs open a tab and need one
  // print click — auto-printing a browser PDF viewer is unreliable; use the in-app viewer for that.
  async function print() {
    const url = fileUrl(z, token);
    if (isPdf(z)) {
      if (!window.open(url, "_blank")) toast.error("Allow pop-ups to print.");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) return toast.error("Allow pop-ups to print.");
    const src = isTiff(z) ? (await tiffToCanvas(url)).toDataURL("image/png") : url;
    const title = z.name.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"));
    w.document.write(
      `<!doctype html><title>${title}</title>` +
        `<style>@page{margin:10mm}html,body{margin:0}img{display:block;width:100%}</style>` +
        `<img src="${src}" onload="window.focus();window.print()">`,
    );
    w.document.close();
  }

  async function del() {
    if (!(await confirm(`Delete "${z.name}" and all its parts and copies?`, { danger: true }))) return;
    try {
      await pb.collection("zumen").delete(z.id);
      onDeleted();
    } catch (e) {
      toast.error(`Delete failed: ${e}`);
    }
  }

  const item =
    "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-700 outline-none transition select-none data-highlighted:bg-paper-100 data-highlighted:text-ink-900";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label="More actions"
        className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-md border border-paper-200 bg-white/85 text-ink-400 shadow-sm backdrop-blur transition hover:text-ink-800 data-[state=open]:text-ink-900"
      >
        <EllipsisVertical className="h-4 w-4" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[10rem] rounded-lg border border-paper-200 bg-white p-1 shadow-xl shadow-ink-900/10 ring-1 ring-ink-900/5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item className={item} onSelect={download}>
            <Download className="h-4 w-4 text-ink-400" /> Download
          </DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={print}>
            <Printer className="h-4 w-4 text-ink-400" /> Print
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={`${item} text-verm-600 data-highlighted:bg-verm-50 data-highlighted:text-verm-700`}
            onSelect={del}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
