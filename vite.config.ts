import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    outDir: "pb_public",
    emptyOutDir: true,
  },
  server: {
    proxy: { "/api": "http://127.0.0.1:8090" },
  },
  // pocketbase's CollectionService has a method literally named `import`; Vite 8's dev-time
  // dependency pre-bundler mis-transforms `import(` there and throws a runtime SyntaxError.
  // pocketbase ships pure ESM already, so excluding it from pre-bundling sidesteps the bug.
  optimizeDeps: {
    exclude: ["pocketbase"],
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): never reload out from under someone mid-markup —
      // a new build shows a "Reload" toast (src/pwa.ts) they dismiss or accept.
      registerType: "prompt",
      injectRegister: null, // we register manually in src/pwa.ts to drive the toasts
      // PocketBase serves pb_public via Windows' mime table, which lacks .webmanifest;
      // .json is a builtin type, so the manifest is always sent as application/json.
      manifestFilename: "manifest.json",
      includeAssets: ["favicon.svg", "pwa-icon.svg", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Zumen Share",
        short_name: "Zumen",
        description: "In-office zumen (blueprint) sharing — upload, mark up, and save drawings.",
        lang: "en",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0b1626", // ink-950: the dark surface the app boots on
        theme_color: "#0b1626",
        categories: ["productivity", "business"],
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "pwa-icon.svg", sizes: "any", type: "image/svg+xml" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,mjs,css,html,svg,png,ico,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // pdf.worker (~1.2MB) + main bundle
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // SPA fallback for client routes, but never shadow the live API or admin UI —
        // those must always hit the network, never resolve to the cached index.html.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/_\//],
        // No runtime caching of /api: records are live and files are auth-scoped with
        // rotating ?token= URLs, so caching them would be stale, wasteful, and unsafe.
      },
      devOptions: {
        enabled: false, // avoid a dev service worker caching stale assets; test via build + preview
      },
    }),
  ],
});
