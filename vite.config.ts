import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: mode !== "popup",
    lib: {
      entry: resolve(
        __dirname,
        mode === "popup" ? "src/popup.tsx" : "src/content.ts"
      ),
      formats: ["iife"],
      name: mode === "popup" ? "popup" : "content",
      fileName: () => (mode === "popup" ? "popup.js" : "content.js"),
    },
  },
}));
