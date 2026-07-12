import * as pdfjs from "pdfjs-dist";
import * as UTIF from "utif2";

// single place the pdf.js worker is configured — importing this module wires it up
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// TIFF is not renderable by the browser — decode the first image to an RGBA canvas.
// ponytail: decodes the full image into memory; a 100 MB tiff can blow up. Move to
// server-side conversion if huge scans become common.
export async function tiffToCanvas(url: string): Promise<HTMLCanvasElement> {
  const buf = await (await fetch(url)).arrayBuffer();
  const ifds = UTIF.decode(buf);
  if (!ifds.length) throw new Error("empty tiff");
  UTIF.decodeImage(buf, ifds[0]);
  const { width, height } = ifds[0];
  const rgba = UTIF.toRGBA8(ifds[0]);
  const raw = document.createElement("canvas");
  raw.width = width;
  raw.height = height;
  raw.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);

  // Some TIFF variants (CMYK, real alpha channels, photometric modes UTIF can't decode)
  // decode with transparent pixels — flatten onto white so those read as blank, not solid
  // black once exported to JPEG (no alpha channel) or laid over the viewer's dark background.
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(raw, 0, 0);
  return c;
}

// A small white-flattened JPEG preview for a pdf/tiff upload, stored in the `thumb` field so
// grids/panels serve a few-KB image instead of downloading + decoding the full file on every
// render, in every browser. Native images use PocketBase's server thumbnails → returns null.
export async function makeThumbBlob(file: File): Promise<Blob | null> {
  const n = file.name.toLowerCase();
  const pdf = n.endsWith(".pdf");
  const tiff = /\.tiff?$/.test(n);
  if (!pdf && !tiff) return null;
  const url = URL.createObjectURL(file);
  try {
    const raw = pdf ? await pdfPageToCanvas(url, 1, 400) : await tiffToCanvas(url);
    // downscale to <=400px wide; flatten onto white (jpeg has no alpha → transparency blackens)
    const scale = Math.min(1, 400 / raw.width);
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(raw.width * scale));
    c.height = Math.max(1, Math.round(raw.height * scale));
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(raw, 0, 0, c.width, c.height);
    return await new Promise((res) => c.toBlob((b) => res(b), "image/jpeg", 0.7));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Render one PDF page onto a fresh canvas at ~targetWidth CSS px (clamped for crispness).
export async function pdfPageToCanvas(url: string, pageNum: number, targetWidth: number): Promise<HTMLCanvasElement> {
  const pdf = await pdfjs.getDocument({ url }).promise;
  const p = await pdf.getPage(Math.min(pageNum, pdf.numPages));
  const scale = Math.min(Math.max(targetWidth / p.getViewport({ scale: 1 }).width, 0.2), 3);
  const vp = p.getViewport({ scale });
  const c = document.createElement("canvas");
  c.width = vp.width;
  c.height = vp.height;
  await p.render({ canvas: c, viewport: vp }).promise;
  return c;
}
