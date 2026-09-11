import { createError, createRequiredError, type DriverFactory } from "./utils/index.ts";
import { FetchError, fetchRequest } from "./utils/fetch.ts";
import { withTrailingSlash, joinURL } from "./utils/path.ts";

export interface GithubOptions {
  /**
   * The name of the repository. (e.g. `username/my-repo`)
   * Required
   */
  repo: string;
  /**
   * The target branch. (e.g. `dev`)
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
   * Github API token (required for writes)
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
    mode?: string;
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
  let pendingOperation = Promise.resolve();

  // Serialize mutations with tree refreshes so neither can overwrite the other's cache changes.
  const enqueue = (operation: () => Promise<void>) => {
    const result = pendingOperation.then(operation);
    pendingOperation = result.catch(() => undefined);
    return result;
  };

  const syncFiles = () =>
    enqueue(async () => {
      if (!opts.repo) {
        throw createRequiredError(DRIVER_NAME, "repo");
      }

      if (lastCheck + opts.ttl! * 1000 > Date.now()) {
        return;
      }

      const updatedFiles = await fetchFiles(opts);
      for (const [key, file] of Object.entries(updatedFiles)) {
        if (file.meta.sha === files[key]?.meta.sha) {
          file.body = files[key]?.body;
        }
      }
      files = updatedFiles;
      lastCheck = Date.now();
    });

  const writeFile = (key: string, value?: string) =>
    enqueue(async () => {
      if (!opts.repo || !opts.token) {
        throw createRequiredError(DRIVER_NAME, !opts.repo ? "repo" : "token");
      }

      const path = withTrailingSlash(opts.dir).replace(/^\//, "") + key.replace(/:/g, "/");
      const segments = path.split("/");
      if (segments.some((segment) => segment === "." || segment === "..")) {
        throw createError(DRIVER_NAME, "File paths must not contain dot segments");
      }
      const url = `/repos/${opts.repo}/contents/${segments.map(encodeURIComponent).join("/")}`;
      const requestOptions = {
        baseURL: opts.apiURL,
        headers: {
          "User-Agent": "unstorage",
          Authorization: `token ${opts.token}`,
          Accept: "application/vnd.github.object+json",
        },
      };
      let sha: string | undefined;
      try {
        const res = await fetchRequest(url, {
          ...requestOptions,
          query: { ref: opts.branch },
        });
        sha = ((await res.json()) as { sha: string }).sha;
      } catch (error) {
        if (!(error instanceof FetchError) || error.status !== 404) {
          throw error;
        }
      }

      if (value === undefined && !sha) {
        delete files[key];
        lastCheck = -Infinity;
        return;
      }

      const res = await fetchRequest(url, {
        ...requestOptions,
        method: value === undefined ? "DELETE" : "PUT",
        body: {
          branch: opts.branch,
          sha,
          message: `unstorage: ${value === undefined ? "remove" : "set"} ${path}`,
          content:
            value === undefined
              ? undefined
              : btoa(
                  Array.from(new TextEncoder().encode(value), (byte) =>
                    String.fromCodePoint(byte),
                  ).join(""),
                ),
        },
      });
      if (value === undefined) {
        delete files[key];
      } else {
        const { content } = (await res.json()) as { content: { sha: string; size: number } };
        files[key] = { body: value, meta: { sha: content.sha, size: content.size } };
      }
      // The contents API omits mode; refresh the tree before exposing metadata.
      lastCheck = -Infinity;
    });

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

      if (item.body === undefined) {
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
    setItem(key, value) {
      return writeFile(key, value);
    },
    removeItem(key) {
      return writeFile(key);
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
