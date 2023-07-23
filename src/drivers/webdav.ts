import { defineDriver } from "./utils";
import { createClient } from "webdav";
import { joinURL } from "ufo";

export interface WebdavOptions {
  /**
   * URL of host. (e.g. `https://nextcloud27.our-servers.de`)
   */
  serverURL: string;
  /**
   * pathPrefix (e.g. `/remote.php/dav/files/`)
   * Retrieves files at `${serverURL}/${pathPrefix}/${username}`
   */
  pathPrefix: string;
  username: string;
  password: string;
  directory: string;
  ttl: number;
}

export interface WebdavEntry {
  body?: string;
  meta: {
    type: string;
    size: number;
    mime?: string;
    etag?: string;
  };
}

// https://nextcloud27.our-servers.de/remote.php/dav/files/user
const defaultOptions: WebdavOptions = {
  serverURL: "",
  username: "",
  password: "",
  pathPrefix: "/remote.php/dav/files/",
  directory: "/",
  ttl: 600,
};

const DRIVER_NAME = "webdav";
const createError = (message: string, opts?: ErrorOptions) =>
  new Error(`[unstorage] [${DRIVER_NAME}] ${message}`, opts);

export default defineDriver<Partial<WebdavOptions>>(
  (_opts?: Partial<WebdavOptions>) => {
    const opts: WebdavOptions = { ...defaultOptions, ..._opts };

    if (!opts.serverURL) throw createError("Requires `serverURL` parameter.");
    const baseURL = joinURL(opts.serverURL, opts.pathPrefix, opts.username);

    const clientOptions = {} as {
      username?: string;
      password?: string;
    };
    if (opts.username) clientOptions.username = opts.username;
    if (opts.password) clientOptions.password = opts.password;

    const client = createClient(baseURL, clientOptions);

    let connected: boolean | undefined = undefined;
    const testConnection = async () => {
      try {
        await client.exists("/");
        connected = true;
      } catch {
        connected = false;
      }
      return connected;
    };

    let files: Record<string, WebdavEntry> = {};
    let lastCheck = 0;
    let syncPromise: undefined | Promise<any>;

    const fetchFiles = async () => {
      const files: Record<string, WebdavEntry> = {};

      try {
        const contents = await client.getDirectoryContents(opts.directory, {
          deep: true,
        });

        for (const [, content] of Object.entries(contents) as any) {
          if (content.type === "directory") {
            continue;
          }

          const key: string = content.filename
            .replace(/^\//, "")
            .replace(/\//g, ":");

          files[key] = {
            meta: {
              type: content.type,
              size: content.size,
              mime: content.mime,
              etag: content.etag,
            },
          };
        }
        return files;
      } catch (error) {
        throw createError("Failed to retrive content.");
      }
    };

    const syncFiles = async () => {
      if (!connected && !(await testConnection())) {
        throw createError(`Failed to connect to remote source: '${baseURL}'`);
      }

      if (lastCheck + opts.ttl! * 1000 > Date.now()) {
        return;
      }

      if (!syncPromise) syncPromise = fetchFiles();
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

        const content = files[key];
        if (!content) return null;

        if (!content.body) {
          try {
            const source = `/${key.replace(/\:/g, "/")}`;
            content.body = (await client.getFileContents(source, {
              format: "text",
            })) as string;
          } catch (error) {
            throw createError(`Failed to fetch ${JSON.stringify(key)}`);
          }
        }
        return content.body;
      },
      async getMeta(key) {
        await syncFiles();
        const item = files[key as keyof typeof files];
        return item ? item.meta : null;
      },
    };
  }
);
