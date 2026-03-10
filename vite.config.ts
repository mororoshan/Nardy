import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
/// <reference types="vitest" />

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages serves at https://<user>.github.io/<repo>/ — base must match repo name.
// Set in CI via VITE_BASE_PATH; fallback for local prod build.
const base =
  process.env.VITE_BASE_PATH ??
  (process.env.NODE_ENV === "production" ? "/Nardy/" : "/");

const certPath = path.resolve(__dirname, "localhost+1.pem");
const keyPath = path.resolve(__dirname, "localhost+1-key.pem");
const hasHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
  },
  server: {
    host: true,
    ...(hasHttps && {
      https: {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      },
    }),
  },
});
