import { defineDriver } from "./utils";
import { joinURL } from "ufo";
import { XMLParser } from "fast-xml-parser";

const driverName = "webdav";
const defaultOptions: WebdavDriverOptions = {
  source: "",
  headers: {},
  // interval: 0,
  ttl: 600,
};

export interface WebdavDriverOptions {
  source: string;
  username?: string;
  password?: string;
  headers: { [key: string]: string };
  //* To-do: Implement polling.
  // interval: number;
  ttl: number;

  infinityDepthHeaderUnavailable?: boolean;
}

export interface WebdavFile {
  body?: string;
  meta: {
    href: string;
    type?: string;
    size?: number;
    atime?: Date;
    mtime?: Date;
    etag?: string;
  };
}

export default defineDriver<Partial<WebdavDriverOptions>>((config) => {
  const options = Object.assign(defaultOptions, config) as WebdavDriverOptions;
  const client = createWebdavClient(options);
  client.isConnected().then((ok) => {
    if (!ok)
      throw errorMessage(`Failed to connect to source: '${options.source}'`);
  });

  let files: Record<string, WebdavFile> = {};
  let lastCheck = 0;
  let syncPromise: undefined | Promise<any>;

  const syncFiles = async () => {
    const fetchFiles = async () => {
      try {
        return await client.fetchFiles();
      } catch {
        console.error(errorMessage("Failed to fetch source."));
      }
    };

    if (lastCheck + options.ttl! * 1000 > Date.now()) {
      return;
    }

    if (!syncPromise) syncPromise = fetchFiles();
    files = await syncPromise;

    lastCheck = Date.now();
    syncPromise = undefined;
  };

  return {
    name: driverName,
    options,
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

      const file = files[key];
      if (!file) return null;

      if (!file.body) {
        // should re-validate against etag ("0"-Depth PROPFIND on file)?

        const href = file.meta.href;
        try {
          // receive 'etag' as well; update meta for version control.
          const [success, body] = await client.fetchFile(href);
          if (success) file.body = body as string;
        } catch {
          console.error(errorMessage("Failed to fetch source."));
        }
      }
      return file.body;
    },
    async getMeta(key) {
      await syncFiles();
      const resource = files[key]; //?  as keyof typeof files
      return resource ? resource.meta : null;
    },
  };
});

function createWebdavClient(options: {
  source: string;
  username?: string;
  password?: string;
  headers?: { [key: string]: string };

  infinityDepthHeaderUnavailable?: boolean;
}) {
  const source = (() => {
    try {
      return new URL(
        options.source.endsWith("/") ? options.source : options.source + "/"
      );
    } catch {
      throw errorMessage("'source' must be a valid URL.");
    }
  })();

  const headers = { ...options.headers } as { [key: string]: string };
  if (options.username && options.password) {
    headers.Authorization = `Basic ${encodeBase64(
      `${options.username}:${options.password}`
    )}`;
  }

  const xmlParser = new XMLParser();
  const fetchXML = async (source: string) => {
    const body = `<?xml version="1.0"?>
            <d:propfind  xmlns:d="DAV:">
            <d:prop>
                <d:resourcetype />
                <d:getcontenttype />
                <d:getlastmodified />
                <d:getcontentlength />
                <d:getetag />
            </d:prop>
            </d:propfind>`;

    try {
      const response = await fetch(source, {
        method: "PROPFIND",
        headers: {
          ...headers,
          Depth: options.infinityDepthHeaderUnavailable ? "1" : "infinity",
        },
        body,
      });

      return response.status === 207
        ? xmlParser.parse(await response.text())
        : {};
    } catch {
      return {};
    }
  };

  return {
    async isConnected() {
      try {
        const response = await fetch(options.source, {
          method: "PROPFIND",
          headers: {
            ...headers,
            Depth: "0",
          },
        });
        return Boolean(response.status === 207);
      } catch {
        return false;
      }
    },

    async fetchFiles() {
      const files: Record<string, WebdavFile> = {};
      const fetchDirectory = async (url: string) => {
        const xml = await fetchXML(url);
        const key = (() => {
          const keyPrefix = Object.keys(xml)
            .find((key) => key.endsWith("multistatus"))
            ?.split(":")[0];
          return (key: string) => (keyPrefix ? `${keyPrefix}:${key}` : key);
        })();

        const dirents = xml[key("multistatus")]?.[key("response")] || [];
        const subdirectories: Array<Promise<any>> = [];
        for (const dirent of dirents) {
          // http://www.webdav.org/specs/rfc4918.html#ELEMENT_status
          const getStatus = (propstat: any) => {
            const status = (
              propstat[key("status")] as string | undefined
            )?.split(" ");
            if (status) {
              const [protocol, code, message] = status;
              return code ? parseInt(code) : undefined;
            }
          };

          // http://www.webdav.org/specs/rfc4918.html#ELEMENT_propstat
          const getProperties = () => {
            const p = dirent[key("propstat")];
            const propstats = Array.isArray(p) ? p : [p];
            const propstat = propstats.find((propstat) =>
              Boolean(getStatus(propstat) === 200)
            );
            if (propstat) return propstat[key("prop")];
          };

          const properties = getProperties();
          if (!properties) continue;

          // http://www.webdav.org/specs/rfc4918.html#ELEMENT_href
          const href = (dirent[key("href")] as string) || undefined;
          if (!href) continue;

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_resourcetype
          const isCollection = () => {
            if (typeof properties[key("resourcetype")] !== "object")
              return false;
            return Boolean(
              key("collection") in properties[key("resourcetype")]
            );
          };
          if (isCollection()) {
            const subdirectory = joinURL(source.origin, href);
            if (
              options.infinityDepthHeaderUnavailable &&
              subdirectory !== url
            ) {
              subdirectories.push(fetchDirectory(subdirectory));
            }
            continue;
          }

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontenttype
          const getContentType = () =>
            (properties[key("getcontenttype")] as string) || undefined;

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getlastmodified
          const getLastModified = () =>
            validDate(properties[key("getlastmodified")]);

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontentlength
          const getContentLength = () =>
            validInteger(properties[key("getcontentlength")]);

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getetag
          const getETag = () =>
            (properties[key("getetag")] as string)?.match(/[^"]+/)?.shift();

          const record = decodeURI(href)
            .replace(source.pathname, "")
            .replace(/\//g, ":");

          files[record] = {
            meta: {
              href,
              type: getContentType(),
              size: getContentLength(),
              mtime: getLastModified(),
              etag: getETag(),
            },
          };
        }
        if (options.infinityDepthHeaderUnavailable)
          await Promise.all(subdirectories);
      };

      await fetchDirectory(options.source);
      return files;
    },

    async fetchFile(href: string) {
      const url = joinURL(source.origin, href);
      try {
        const response = await fetch(url, { headers });
        return [true, await response.text()];
      } catch {
        return [false, ""];
      }
    },
  };
}

function encodeBase64(string: string) {
  return Buffer.from(string, "utf8").toString("base64");
}

function validInteger(input: unknown) {
  if (input === undefined) return;
  if (Number.isInteger(input)) return input as number;
  const integer = parseInt(input as string);
  if (Number.isInteger(integer)) return integer;
}

function validDate(input: unknown) {
  if (input === undefined) return;
  const date = new Date(input as any);
  return Boolean(date.getTime()) ? date : undefined;
}

function errorMessage(message: string) {
  return new Error(`[unstorage] [${driverName}] ${message}`);
}
