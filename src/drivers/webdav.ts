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
    etag: string;
    type?: string;
    size?: number;
    atime?: Date;
    mtime?: Date;
  };
}

export default defineDriver<Partial<WebdavDriverOptions>>((config) => {
  const options = Object.assign(defaultOptions, config) as WebdavDriverOptions;

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

  const isConnected = async () => {
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
  };
  isConnected().then((ok) => {
    if (!ok)
      throw errorMessage(`Failed to connect to source: '${options.source}'`);
  });

  const xmlParser = new XMLParser();
  const fetchXML = async (uri: string) => {
    try {
      const response = await fetch(uri, {
        method: "PROPFIND",
        headers: {
          ...headers,
          Depth: options.infinityDepthHeaderUnavailable ? "1" : "infinity",
        },
        body: `<?xml version="1.0"?>
          <d:propfind  xmlns:d="DAV:">
          <d:prop>
              <d:resourcetype />
              <d:getcontenttype />
              <d:getlastmodified />
              <d:getcontentlength />
              <d:getetag />
          </d:prop>
          </d:propfind>`,
      });

      return response.status === 207
        ? xmlParser.parse(await response.text())
        : {};
    } catch {
      return {};
    }
  };

  const latest = {
    etag: "",
    atime: 0,
  };

  const files: Record<string, WebdavFile> = {};
  const fetchFiles = async () => {
    const fetchDirectory = async (uri: string) => {
      const xml = await fetchXML(uri);
      const key = (() => {
        const keyPrefix = Object.keys(xml)
          .find((key) => key.endsWith("multistatus"))
          ?.split(":")[0];
        return (key: string) => (keyPrefix ? `${keyPrefix}:${key}` : key);
      })();

      const dirents = xml[key("multistatus")]?.[key("response")] || [];
      const subdirectories: Array<Promise<any>> = [];
      for (const dirent of dirents) {
        // http://www.webdav.org/specs/rfc4918.html#ELEMENT_href
        const href = (dirent[key("href")] as string) || undefined;
        if (!href) continue;

        // http://www.webdav.org/specs/rfc4918.html#ELEMENT_status
        const getStatus = (propstat: any) => {
          const status = (propstat[key("status")] as string | undefined)?.split(
            " "
          );
          if (status) {
            const [protocol, code, message] = status;
            return validInteger(code);
          }
        };

        // http://www.webdav.org/specs/rfc4918.html#ELEMENT_propstat
        const properties = (() => {
          const p = dirent[key("propstat")];
          const propstats = Array.isArray(p) ? p : [p];
          const propstat = propstats.find((propstat) =>
            Boolean(getStatus(propstat) === 200)
          );
          if (propstat) return propstat[key("prop")];
        })();
        if (!properties) continue;

        // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getetag
        const etag = (properties[key("getetag")] as string)
          ?.match(/[^"]+/)
          ?.shift();
        if (!etag) continue;

        if (href === source.pathname) {
          if (etag === latest.etag) return;
          else latest.etag = etag;
        }

        // http://www.webdav.org/specs/rfc4918.html#PROPERTY_resourcetype
        const isCollection = Boolean(
          typeof properties[key("resourcetype")] === "object" &&
            key("collection") in properties[key("resourcetype")]
        );

        if (isCollection) {
          const subdirectory = joinURL(source.origin, href);
          if (options.infinityDepthHeaderUnavailable && subdirectory !== uri) {
            subdirectories.push(fetchDirectory(subdirectory));
          }
          continue;
        }

        const record = decodeURI(href)
          .replace(source.pathname, "")
          .replace(/\//g, ":");

        if (record in files) {
          if (files[record].meta.etag === etag) continue;
          files[record].body = undefined;
        }

        files[record] = {
          meta: {
            href,
            etag,

            // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontenttype
            type: (properties[key("getcontenttype")] as string) || undefined,

            // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontentlength
            size: validInteger(properties[key("getcontentlength")]),

            // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getlastmodified
            mtime: validDate(properties[key("getlastmodified")]),
          },
        };
      }
      if (options.infinityDepthHeaderUnavailable)
        await Promise.all(subdirectories);
    };

    await fetchDirectory(source.href);
    latest.atime = Date.now();
  };

  const fetchFile = async (href: string) => {
    const uri = joinURL(source.origin, href);
    try {
      const response = await fetch(uri, { headers });
      const getHeader = (key: string) => {
        const value = response.headers.get(key);
        if (value) return value;
      };

      return {
        body: await response.text(),
        meta: {
          href,
          etag: getHeader("etag"),
          type: getHeader("Content-Type"),
          size: validInteger(getHeader("Content-Length")),
          atime: validDate(getHeader("Date")),
          mtime: validDate(getHeader("Last-Modified")),
        },
      } as WebdavFile;
    } catch {
      return;
    }
  };

  let syncPromise: undefined | Promise<any>;
  const syncFiles = async () => {
    if (options.ttl && Date.now() < latest.atime + options.ttl * 1000) return;

    if (!syncPromise) syncPromise = fetchFiles();
    await syncPromise;
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
      if (!(key in files)) return null;

      if (!files[key]?.body) {
        const href = files[key].meta.href;
        const file = await fetchFile(href);
        if (file) files[key] = file;
      }
      return files[key].body;
    },
    async getMeta(key) {
      await syncFiles();
      return key in files ? files[key].meta : null;
    },
  };
});

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
