import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // replace any imports of `process` with the browser shim
      process: "process/browser",
      // replace imports of `buffer` with the npm buffer package
      buffer: "buffer",
    },
  },
  define: {
    // replace global references in your code / dependencies
    global: "window",
  },
  optimizeDeps: {
    include: ["amazon-cognito-identity-js", "buffer", "process"],
  },
});
