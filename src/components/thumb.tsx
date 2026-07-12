import { useEffect, useState } from "react";
import { pb, fileUrl, isPdf, isNativeImage, type Zumen } from "../lib/pb";
import { pdfPageToCanvas, tiffToCanvas } from "../lib/preview";
import { FileText, Image as ImageIcon } from "lucide-react";

// id -> decoded pdf/tiff preview data URL. Kept across mounts so grids/panels
// don't re-decode as you navigate. ponytail: unbounded; fine for an office-sized library.
const cache = new Map<string, string>();

// A raster preview for any zumen. Fills its (sized, overflow-hidden) parent.
// Native images -> server thumbnail. PDF/TIFF -> decoded in-browser to a white-flattened
// PNG data URL (pdfPageToCanvas/tiffToCanvas both render onto opaque white, so no
// transparent-pixel-turns-black surprises), cached above.
export function Thumb({ z, token, width = 400 }: { z: Zumen; token: string; width?: number }) {
  const native = isNativeImage(z);
  // pdf/tiff with a stored preview → serve it; only decode the full file for legacy records
  // uploaded before thumbs were generated (see makeThumbBlob).
  const needsDecode = !native && !z.thumb;
  const cached = needsDecode ? cache.get(z.id) : undefined;
  const [decoded, setDecoded] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (!token || !needsDecode || cache.has(z.id)) return;
    let dead = false;
    (async () => {
      const canvas = isPdf(z)
        ? await pdfPageToCanvas(fileUrl(z, token), 1, width)
        : await tiffToCanvas(fileUrl(z, token));
      const data = canvas.toDataURL("image/png"); // PNG: keeps alpha, never blackens transparency
      cache.set(z.id, data);
      if (!dead) setDecoded(data);
    })().catch(() => {}); // leaves the fallback icon showing
    return () => {
      dead = true;
    };
  }, [z.id, z.file, token, needsDecode, width]);

  const src = !token
    ? null
    : native
      ? fileUrl(z, token, `${width}x${Math.round(width * 0.75)}`)
      : z.thumb
        ? pb.files.getURL(z, z.thumb, { token })
        : (cached ?? decoded);

  if (!src) {
    const Glyph = isPdf(z) ? FileText : ImageIcon;
    return <Glyph className="w-1/3 h-1/3 text-paper-400/70" />;
  }
  return <img src={src} alt="" className="w-full h-full object-cover" />;
}
