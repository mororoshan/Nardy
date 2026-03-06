import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    https: {
      key: fs.readFileSync(path.resolve(__dirname, "localhost+1-key.pem")),
      cert: fs.readFileSync(path.resolve(__dirname, "localhost+1.pem")),
    },
  },
});
