import { defineDriver } from "./utils";
import { $fetch } from "ofetch";
import { withTrailingSlash, joinURL } from "ufo";

export interface GithubOptions {
  /**
   * The name of the repository. (e.g. `username/my-repo`)
   * Required
   */
  repo: string;
  /**
   * The branch to fetch. (e.g. `dev`)
   * @default "main"
   */
  branch?: string;
  /**
   * @default "main"
   */
  dir?: string;
  /**
   * @default 600
   */
  ttl?: number;
  /**
   * Github API token (recommended)
   */
  token?: string;
  /**
   * @default "https://api.github.com"
   */
  apiURL?: string;
  /**
   * @default "https://raw.githubusercontent.com"
   */
  cdnURL?: string;
}

const defaultOptions: GithubOptions = {
  repo: null,
  branch: "main",
  ttl: 600,
  dir: "",
  apiURL: "https://api.github.com",
  cdnURL: "https://raw.githubusercontent.com",
};

export default defineDriver((_opts: GithubOptions) => {
  const opts = { ...defaultOptions, ..._opts };
  const rawUrl = joinURL(opts.cdnURL, opts.repo, opts.branch, opts.dir);

  let files = {};
  let lastCheck = 0;
  let syncPromise: Promise<any>;

  if (!opts.repo) {
    throw new Error('[unstorage] [github] Missing required option "repo"');
  }

  const syncFiles = async () => {
    if (lastCheck + opts.ttl * 1000 > Date.now()) {
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
    name: "github",
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
          item.body = await $fetch(key.replace(/:/g, "/"), {
            baseURL: rawUrl,
            headers: {
              Authorization: opts.token ? `token ${opts.token}` : undefined,
            },
          });
        } catch (err) {
          throw new Error(`[unstorage] [github] Failed to fetch "${key}"`, {
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

async function fetchFiles(opts: GithubOptions) {
  const prefix = withTrailingSlash(opts.dir).replace(/^\//, "");
  const files = {};
  try {
    const trees = await $fetch(
      `/repos/${opts.repo}/git/trees/${opts.branch}?recursive=1`,
      {
        baseURL: opts.apiURL,
        headers: {
          Authorization: opts.token ? `token ${opts.token}` : undefined,
        },
      }
    );

    for (const node of trees.tree) {
      if (node.type !== "blob" || !node.path.startsWith(prefix)) {
        continue;
      }
      const key = node.path.substring(prefix.length).replace(/\//g, ":");
      files[key] = {
        meta: {
          sha: node.sha,
          mode: node.mode,
          size: node.size,
        },
      };
    }
  } catch (err) {
    throw new Error(`[unstorage] [github] Failed to fetch git tree`, {
      cause: err,
    });
  }
  return files;
}
