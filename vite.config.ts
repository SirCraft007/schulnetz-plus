import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { writeFileSync, readFileSync, mkdirSync } from "fs";
import type { Plugin } from "vite";

/**
 * Single vite config that builds both content.ts and popup.tsx.
 *
 * Rollup doesn't support multiple IIFE outputs from a single build,
 * so we build normally (es format) then wrap each output in an IIFE
 * via a tiny post-build plugin. This lets us run ONE `vite build --watch`.
 */

function wrapIIFE(): Plugin {
  return {
    name: "wrap-iife",
    writeBundle(options, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (chunk.type === "chunk" && fileName.endsWith(".js")) {
          const filePath = resolve(options.dir!, fileName);
          const code = readFileSync(filePath, "utf-8");
          writeFileSync(filePath, `(function(){${code}})();\n`);
        }
      }
    },
  };
}

function copyPublic(): Plugin {
  return {
    name: "copy-public",
    closeBundle() {
      // Vite copies public/ by default in non-lib mode — nothing extra needed
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [react(), wrapIIFE()],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        content: resolve(__dirname, "src/content.ts"),
        popup: resolve(__dirname, "src/popup.tsx"),
      },
      output: {
        format: "es", // we wrap to IIFE in post-build plugin
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
  css: {
    postcss: "./postcss.config.js",
  },
});
