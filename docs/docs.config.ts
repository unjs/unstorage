import { defineDocsConfig } from "unjs-docs/config";

export default defineDocsConfig({
  name: "Unstorage",
  description:
    "A simple, small, and fast key-value storage library for JavaScript.",
  github: "unjs/unstorage",
  redirects: {
    "/usage": "/getting-started/usage",
    "/utils": "/getting-started/utils",
    "/http-server": "/getting-started/http-server",
    "/custom-driver": "/getting-started/custom-driver",
  },
});
