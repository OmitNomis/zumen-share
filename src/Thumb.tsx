import { useEffect, useState } from "react";
import { fileUrl, isPdf, isNativeImage, type Zumen } from "./lib/pb";
import { pdfPageToCanvas, tiffToCanvas } from "./lib/preview";
import * as Icon from "./icons";

// id -> generated preview data URL (pdf/tiff only). Kept across mounts so grids/panels
// don't re-decode as you navigate. ponytail: unbounded; fine for an office-sized library.
const cache = new Map<string, string>();

// A raster preview for any zumen. Fills its (sized, overflow-hidden) parent.
export default function Thumb({ z, token, width = 400 }: { z: Zumen; token: string; width?: number }) {
  const native = isNativeImage(z);
  const [src, setSrc] = useState<string | null>(native ? null : cache.get(z.id) ?? null);

  useEffect(() => {
    if (!token) return;
    if (native) {
      // let PocketBase resize (falls back to the original for formats it can't thumb)
      setSrc(fileUrl(z, token, `${width}x${Math.round(width * 0.75)}`));
      return;
    }
    if (cache.has(z.id)) return setSrc(cache.get(z.id)!);
    let dead = false;
    (async () => {
      const canvas = isPdf(z)
        ? await pdfPageToCanvas(fileUrl(z, token), 1, width)
        : await tiffToCanvas(fileUrl(z, token));
      const data = canvas.toDataURL("image/jpeg", 0.8);
      cache.set(z.id, data);
      if (!dead) setSrc(data);
    })().catch(() => {}); // leaves the fallback icon showing
    return () => {
      dead = true;
    };
  }, [z.id, z.file, token, native, width]);

  if (!src) {
    const Glyph = isPdf(z) ? Icon.Pdf : Icon.Image;
    return <Glyph className="w-1/3 h-1/3 text-slate-300" />;
  }
  return <img src={src} alt="" className="w-full h-full object-cover" />;
}
