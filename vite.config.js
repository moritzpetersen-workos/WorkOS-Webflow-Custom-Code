import { defineConfig } from "vite";
import { resolve } from "path";
import { glob } from "glob";

// Find all page scripts
const pageScripts = glob
  .sync("src/js/pages/**/*.js")
  .reduce((entries, path) => {
    const entryName = path.replace("src/js/pages/", "").replace(".js", "");
    return { ...entries, [entryName]: resolve(__dirname, path) };
  }, {});

// Find all CSS files
const cssFiles = glob.sync("src/css/**/*.css").reduce((entries, path) => {
  const entryName = path.replace("src/css/", "").replace(".css", "");
  return { ...entries, [entryName]: resolve(__dirname, path) };
}, {});

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@components": resolve(__dirname, "./src/js/components"),
    },
  },

  build: {
    sourcemap: process.env.NODE_ENV !== "production",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === "production",
        drop_debugger: process.env.NODE_ENV === "production",
      },
    },

    rollupOptions: {
      input: {
        // JavaScript entries
        global: resolve(__dirname, "src/js/global/global.js"),
        ...Object.keys(pageScripts).reduce(
          (acc, key) => ({
            ...acc,
            [key]: pageScripts[key],
          }),
          {}
        ),

        // CSS entries
        "global-styles": resolve(__dirname, "src/css/global.css"),
        ...Object.keys(cssFiles).reduce(
          (acc, key) => ({
            ...acc,
            [`${key}-styles`]: cssFiles[key],
          }),
          {}
        ),
      },
      output: {
        entryFileNames: "js/[name].js",
        chunkFileNames: "js/chunks/[name].js",
        assetFileNames: (assetInfo) => {
          const extType = assetInfo.name.split(".").at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(extType)) {
            return "assets/images/[name][extname]";
          }
          if (/css/i.test(extType)) {
            return "css/[name][extname]";
          }
          return "assets/[name][extname]";
        },
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Extract the package name from the path
            const packageName = id.match(/node_modules\/([^/]+)/)?.[1];
            return `vendor-${packageName}`;
          }
        },
      },

      treeshake: {
        moduleSideEffects: "no-external",
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
    },

    outDir: "dist",
    emptyOutDir: true,
  },

  server: {
    port: 3000,
    open: false,
    cors: true,
    https: {
      key: "./localhost-key.pem",
      cert: "./localhost.pem",
    },
  },
});
