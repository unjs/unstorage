import { createError, createRequiredError, type DriverFactory } from "./utils/index.ts";
import { fetchRequest } from "./utils/fetch.ts";
import { withTrailingSlash, joinURL } from "./utils/path.ts";

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
   * @default ""
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

interface GithubFile {
  body?: string;
  meta: {
    sha: string;
    mode: string;
    size: number;
  };
}

const defaultOptions: GithubOptions = {
  repo: "",
  branch: "main",
  ttl: 600,
  dir: "",
  apiURL: "https://api.github.com",
  cdnURL: "https://raw.githubusercontent.com",
};

const DRIVER_NAME = "github";

const driver: DriverFactory<GithubOptions> = (_opts) => {
  const opts: GithubOptions = { ...defaultOptions, ..._opts };
  const rawUrl = joinURL(opts.cdnURL!, [opts.repo, opts.branch!, opts.dir!].join("/"));

  let files: Record<string, GithubFile> = {};
  let lastCheck = 0;
  let syncPromise: undefined | Promise<any>;

  const syncFiles = async () => {
    if (!opts.repo) {
      throw createRequiredError(DRIVER_NAME, "repo");
    }

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
    name: DRIVER_NAME,
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
          const res = await fetchRequest(key.replace(/:/g, "/"), {
            baseURL: rawUrl,
            headers: {
              Authorization: opts.token ? `token ${opts.token}` : undefined,
            },
          });
          item.body = await res.text();
        } catch (error) {
          throw createError("github", `Failed to fetch \`${JSON.stringify(key)}\``, {
            cause: error,
          });
        }
      }
      return item.body;
    },
    async getMeta(key) {
      await syncFiles();
      const item = files[key as keyof typeof files];
      return item ? item.meta : null;
    },
  };
};

async function fetchFiles(opts: GithubOptions) {
  const prefix = withTrailingSlash(opts.dir).replace(/^\//, "");
  const files: Record<string, GithubFile> = {};
  try {
    const res = await fetchRequest(`/repos/${opts.repo}/git/trees/${opts.branch}`, {
      baseURL: opts.apiURL,
      query: { recursive: 1 },
      headers: {
        "User-Agent": "unstorage",
        Authorization: opts.token ? `token ${opts.token}` : undefined,
      },
    });
    const trees = (await res.json()) as {
      tree: { type: string; path: string; sha: string; mode: string; size: number }[];
    };

    for (const node of trees.tree) {
      if (node.type !== "blob" || !node.path.startsWith(prefix)) {
        continue;
      }
      const key: string = node.path.slice(prefix.length).replace(/\//g, ":");
      files[key] = {
        meta: {
          sha: node.sha,
          mode: node.mode,
          size: node.size,
        },
      };
    }

    return files;
  } catch (error) {
    throw createError(DRIVER_NAME, "Failed to fetch git tree", {
      cause: error,
    });
  }
}

export default driver;
