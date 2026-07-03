import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
  plugins: [react(), tailwindcss()],
});
