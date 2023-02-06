import { resolve } from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { createStorage } from "../src";
import { createStorageServer } from "../src/server";
import fsdriver from "../src/drivers/fs";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "node-fetch": "node-fetch/browser",
    },
  },
  plugins: [
    vue(),
    {
      name: "app",
      configureServer(server) {
        const storage = createStorage();
        const storageServer = createStorageServer(storage);
        // eslint-disable-next-line unicorn/prefer-module
        storage.mount("/src", fsdriver({ base: resolve(__dirname, "..") }));
        server.middlewares.use("/storage", storageServer.handle);
      },
    },
  ],
});
