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
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  c.getContext("2d")!.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
  return c;
}

const THUMB_W = 480;

// A small JPEG preview for a pdf/tiff upload, saved with the record so previews load
// instantly instead of decoding the whole file in every browser. Returns null for native
// images (PocketBase thumbnails those on the fly) or if generation fails — the caller then
// uploads without a thumb and Thumb falls back to decoding.
export async function makeThumb(file: File): Promise<Blob | null> {
  const name = file.name.toLowerCase();
  const url = URL.createObjectURL(file);
  try {
    let src: HTMLCanvasElement;
    if (name.endsWith(".pdf")) src = await pdfPageToCanvas(url, 1, THUMB_W);
    else if (/\.tiff?$/.test(name)) src = await tiffToCanvas(url);
    else return null;
    const scale = Math.min(1, THUMB_W / src.width);
    const c = document.createElement("canvas");
    c.width = Math.round(src.width * scale);
    c.height = Math.round(src.height * scale);
    c.getContext("2d")!.drawImage(src, 0, 0, c.width, c.height);
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
