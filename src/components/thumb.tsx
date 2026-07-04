import { useEffect, useState } from "react";
import { fileUrl, isPdf, isNativeImage, type Zumen } from "../lib/pb";
import { pdfPageToCanvas, tiffToCanvas } from "../lib/preview";
import { FileText, Image as ImageIcon } from "lucide-react";

// id -> generated preview data URL (pdf/tiff only). Kept across mounts so grids/panels
// don't re-decode as you navigate. ponytail: unbounded; fine for an office-sized library.
const cache = new Map<string, string>();

// A raster preview for any zumen. Fills its (sized, overflow-hidden) parent.
export function Thumb({ z, token, width = 400 }: { z: Zumen; token: string; width?: number }) {
  const native = isNativeImage(z);
  const cached = !native ? cache.get(z.id) : undefined;
  const [decoded, setDecoded] = useState<string | null>(cached ?? null);

  useEffect(() => {
    if (!token || native || cache.has(z.id)) return;
    let dead = false;
    (async () => {
      const canvas = isPdf(z)
        ? await pdfPageToCanvas(fileUrl(z, token), 1, width)
        : await tiffToCanvas(fileUrl(z, token));
      const data = canvas.toDataURL("image/jpeg", 0.8);
      cache.set(z.id, data);
      if (!dead) setDecoded(data);
    })().catch(() => {}); // leaves the fallback icon showing
    return () => {
      dead = true;
    };
  }, [z.id, z.file, token, native, width]);

  const src = native ? (token ? fileUrl(z, token, `${width}x${Math.round(width * 0.75)}`) : null) : (cached ?? decoded);

  if (!src) {
    const Glyph = isPdf(z) ? FileText : ImageIcon;
    return <Glyph className="w-1/3 h-1/3 text-paper-400/70" />;
  }
  return <img src={src} alt="" className="w-full h-full object-cover" />;
}
