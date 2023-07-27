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
}

export interface WebdavResource {
  body?: string;
  meta: {
    href: string;
    type?: string;
    size?: number;
    mtime?: Date;
    etag?: string;
  };
}

export default defineDriver<Partial<WebdavDriverOptions>>((configure) => {
  const options = Object.assign(
    defaultOptions,
    configure
  ) as WebdavDriverOptions;
  const client = createWebdavClient(options);
  client.isConnected().then((okay) => {
    if (!okay)
      throw errorMessage(`Failed to connect to source: '${options.source}'`);
  });

  let files: Record<string, WebdavResource> = {};
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

      const resource = files[key];
      if (!resource) return null;

      if (!resource.body) {
        const href = resource.meta.href;
        try {
          const [success, body] = await client.fetchFile(href);
          if (success) resource.body = body as string;
        } catch {
          console.error(errorMessage("Failed to fetch source."));
        }
      }
      return resource.body;
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
        headers,
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
      const files: Record<string, WebdavResource> = {};
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
            if (subdirectory !== url) {
              subdirectories.push(fetchDirectory(subdirectory));
            }
            continue;
          }

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontenttype
          const getContentType = () =>
            (properties[key("getcontenttype")] as string) || undefined;

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getlastmodified
          const getLastModified = () => {
            const date = new Date(properties[key("getlastmodified")]);
            return Boolean(date.getTime()) ? date : undefined;
          };

          // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontentlength
          const getContentLength = () =>
            (properties[key("getcontentlength")] as number) || undefined;

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

function errorMessage(message: string) {
  return new Error(`[unstorage] [${driverName}] ${message}`);
}
