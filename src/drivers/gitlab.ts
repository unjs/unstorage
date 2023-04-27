import { $fetch } from "ofetch";
import { withTrailingSlash, withoutLeadingSlash } from "ufo";
import { defineDriver } from "./utils";

export interface GitlabOptions {
  /**
   * The name of the repository. (e.g. `username/my-repo`)
   * Required
   */
  repo: string | null;
  /**
   * The branch to fetch. (e.g. `dev`)
   * @default "main"
   */
  branch?: string;
  /**
   * @default ""
   */
  base?: string;
  /**
   * @default 600
   */
  ttl?: number;
  /**
   * Request headers. Here you can add Gitlab API token (recommended)
   *
   * {'PRIVATE-TOKEN'?: string } // Direct authentication with private token. Ex: `glpat-Hxq...`
   * { Authorization?: string } // Authentication through apps OAuth pkce. Ex: `Bearer jwt...`
   */
  headers?: HeadersInit;
  /**
   * @default "https://gitlab.com"
   */
  apiURL?: string;
}

const defaultOptions: GitlabOptions = {
  repo: null,
  branch: "",
  base: "",
  ttl: 600,
  apiURL: "https://gitlab.com",
};

export default defineDriver((_opts: GitlabOptions) => {
  const opts = { ...defaultOptions, ..._opts };

  let files = {} as any;
  let lastCheck = 0;
  let syncPromise: Promise<any> | undefined;

  if (!opts.repo) {
    throw new Error('[unstorage] [gitlab] Missing required option "repo"');
  }

  const syncFiles = async () => {
    if (lastCheck + opts.ttl! * 1000 > Date.now()) {
      return;
    }

    if (!syncPromise) {
      syncPromise = fetchFiles(opts);
    }

    files = await syncPromise;
    lastCheck = Date.now();
    syncPromise = undefined;
  };

  return {
    name: "gitlab",
    options: opts,
    async getKeys() {
      await syncFiles();
      return Object.keys(files);
    },
    async hasItem(key) {
      await syncFiles();
      return key in files;
    },
    async getItem(key) {
      await syncFiles();

      const item = files[key];

      if (!item) {
        return null;
      }

      if (!item.body) {
        try {
          const path = (
            opts.base
              ? withoutLeadingSlash(withTrailingSlash(opts.base)) + key
              : key
          ).replace(/:/g, "/");

          const query = opts.branch ? { ref: opts.branch } : undefined;

          item.body = await $fetch(
            `/api/v4/projects/${encodeURIComponent(
              opts.repo!
            )}/repository/files/${encodeURIComponent(path)}/raw`,
            {
              baseURL: opts.apiURL,
              query,
            }
          );
        } catch (err) {
          throw new Error(`[unstorage] [gitlab] Failed to fetch "${key}"`, {
            cause: err,
          });
        }
      }
      return item.body;
    },
    async getMeta(key) {
      await syncFiles();
      const item = files[key];
      return item ? item.meta : null;
    },
  };
});

async function fetchFiles(opts: GitlabOptions) {
  const prefix = withTrailingSlash(opts.base).replace(/^\//, "");
  const files = {};
  try {
    const trees = await $fetch(
      `/api/v4/projects/${encodeURIComponent(opts.repo!)}/repository/tree`,
      {
        baseURL: opts.apiURL,
        headers: opts.headers,
        query: {
          recursive: true,
          ref: opts.branch,
          path: opts.base,
        },
      }
    );

    for (const node of trees) {
      if (node.type !== "blob" || !node.path.startsWith(prefix)) {
        continue;
      }
      const key = node.path.substring(prefix.length).replace(/\//g, ":");
      files[key] = {
        meta: {
          id: node.id,
          name: node.name,
          mode: node.mode,
        },
      };
    }
  } catch (err) {
    throw new Error("[unstorage] [gitlab] Failed to fetch git tree", {
      cause: err,
    });
  }
  return files;
}
