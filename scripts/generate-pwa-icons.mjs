// Generates the PWA / home-screen icons from the app's brand mark — the white
// stacked-layers logo (src/components/logo.tsx) on a cyanotype-blue tile, the
// same tile shown in the sidebar and on the login screen.
//
// SVG is rasterised to PNG with headless Chrome/Edge so there's no native image
// dependency (no sharp / ImageMagick). Re-run after changing the mark or colors:
//
//   node scripts/generate-pwa-icons.mjs
//
// Set CHROME_PATH if the browser isn't auto-found.

import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PRINT_600 = "#2750bb"; // --color-print-600, the brand-tile fill
const PRINT_500 = "#3a67d3"; // --color-print-500, top of the tile gradient

const pub = fileURLToPath(new URL("../public", import.meta.url));

// the stacked-layers mark, matching src/components/logo.tsx (24×24 viewBox)
const MARK = `<g fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 3 3 7.5 12 12l9-4.5L12 3Z"/>
    <path d="m3 12 9 4.5L21 12"/>
    <path d="m3 16.5 9 4.5 9-4.5"/>
  </g>`;

// maskable=false → rounded tile with a hairline ring (used on transparent bg).
// maskable=true  → full-bleed, mark pulled into the safe zone so OS masks (circle
// / squircle) never clip it. viewBox is always 512; width/height set per raster.
function iconSvg({ maskable }) {
  const s = maskable ? 13 : 15; // mark scale — smaller when maskable
  const t = 256 - 12 * s; // translate to centre the 24-unit mark
  const bg = maskable
    ? `<rect width="512" height="512" fill="url(#g)"/>`
    : `<rect width="512" height="512" rx="112" fill="url(#g)"/>
  <rect x="4" y="4" width="504" height="504" rx="108" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="3"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${PRINT_500}"/><stop offset="1" stop-color="${PRINT_600}"/>
  </linearGradient></defs>
  ${bg}
  <g transform="translate(${t} ${t}) scale(${s})">${MARK}</g>
</svg>`;
}

function findBrowser() {
  const cands = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  const hit = cands.find((p) => existsSync(p));
  if (!hit) throw new Error("No Chrome/Edge found — set CHROME_PATH to a Chromium binary.");
  return hit;
}

const browser = findBrowser();
const tmp = mkdtempSync(join(tmpdir(), "pwa-icons-"));

function raster(svg, size, out) {
  const svgPath = join(tmp, out + ".svg");
  writeFileSync(svgPath, svg.replace('width="512" height="512"', `width="${size}" height="${size}"`));
  execFileSync(
    browser,
    [
      "--headless",
      "--disable-gpu",
      "--force-device-scale-factor=1",
      "--default-background-color=00000000", // transparent where the SVG doesn't paint
      `--window-size=${size},${size}`,
      `--screenshot=${join(pub, out)}`,
      "file:///" + svgPath.replace(/\\/g, "/"),
    ],
    { stdio: "ignore" },
  );
  console.log("wrote public/" + out);
}

const tile = iconSvg({ maskable: false });
const mask = iconSvg({ maskable: true });

// vector source, referenced by the manifest for crisp desktop rendering
writeFileSync(join(pub, "pwa-icon.svg"), tile);
console.log("wrote public/pwa-icon.svg");

raster(tile, 192, "pwa-192x192.png");
raster(tile, 512, "pwa-512x512.png");
raster(mask, 512, "maskable-icon-512x512.png"); // opaque, full-bleed for OS masks
raster(mask, 180, "apple-touch-icon.png"); // iOS home screen (masks to a squircle)
