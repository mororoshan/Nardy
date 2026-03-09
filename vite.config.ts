import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages serves at https://<user>.github.io/<repo>/
const base =
  process.env.NODE_ENV === "production" ? "/web_rtc_nardi/" : "/";

const certPath = path.resolve(__dirname, "localhost+1.pem");
const keyPath = path.resolve(__dirname, "localhost+1-key.pem");
const hasHttps =
  fs.existsSync(certPath) && fs.existsSync(keyPath);

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
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
