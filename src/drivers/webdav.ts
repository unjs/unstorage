import { defineDriver } from "./utils";
import { joinURL } from "ufo";
import { XMLParser } from "fast-xml-parser";

const driverName = "webdav";

export interface WebdavDriverOptions {
  source: string;
  username?: string;
  password?: string;
  headers?: { [key: string]: string };
  ttl?: number;
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

export default defineDriver<WebdavDriverOptions>((options) => {
  const source = (() => {
    try {
      return new URL(
        options.source.endsWith("/") ? options.source : options.source + "/"
      );
    } catch {
      throw errorMessage("'source' must be a valid URL.");
    }
  })();

  const headers = { ...(options.headers || {}) } as { [key: string]: string };
  if (options.username && options.password) {
    headers.Authorization = `Basic ${encodeBase64(
      `${options.username}:${options.password}`
    )}`;
  }

  const checkConnection = async () => {
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

  checkConnection().then((ok) => {
    if (!ok)
      throw errorMessage(`Failed to connect to source: '${options.source}'`);
  });

  const xmlParser = new XMLParser();
  const fetchXML = async (
    uri: string
  ): Promise<{
    ok: boolean;
    data?: any;
    atime?: number;
  }> => {
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
        ? {
            ok: true,
            data: xmlParser.parse(await response.text()),
            atime: validDate(response.headers.get("Date"))?.getTime(),
          }
        : {
            ok: false,
          };
    } catch (error) {
      console.error(error);
      return {
        ok: false,
      };
    }
  };

  const latest = {
    etag: "",
    atime: 0,
  };

  const files: Record<string, WebdavFile> = {};
  const fetchFiles = async () => {
    const fetchDirectory = async (uri: string) => {
      const { ok, data: xml, atime } = await fetchXML(uri);
      if (!ok) return;
      latest.atime = atime || Date.now();

      const prop = (() => {
        const prefix = Object.keys(xml)
          .find((key) => key.endsWith("multistatus"))
          ?.split(":")[0];
        return (prop: string) => (prefix ? `${prefix}:${prop}` : prop);
      })();

      const dirents = xml[prop("multistatus")]?.[prop("response")] || [];
      const subdirectories: Array<Promise<any>> = [];
      for (const dirent of dirents) {
        // http://www.webdav.org/specs/rfc4918.html#ELEMENT_href
        const href = (dirent[prop("href")] as string) || undefined;
        if (!href) continue;

        // http://www.webdav.org/specs/rfc4918.html#ELEMENT_status
        const getStatus = (propstat: any) => {
          const status = (
            propstat[prop("status")] as string | undefined
          )?.split(" ");
          if (status) {
            const [protocol, code, message] = status;
            return validInteger(code);
          }
        };

        // http://www.webdav.org/specs/rfc4918.html#ELEMENT_propstat
        const properties = (() => {
          const p = dirent[prop("propstat")];
          const propstats = Array.isArray(p) ? p : [p];
          const propstat = propstats.find((propstat) =>
            Boolean(getStatus(propstat) === 200)
          );
          if (propstat) return propstat[prop("prop")];
        })();
        if (!properties) continue;

        // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getetag
        const etag = formatEtag(properties[prop("getetag")]);
        if (!etag) continue;

        if (href === source.pathname) {
          if (etag === latest.etag) return;
          else latest.etag = etag;
        }

        // http://www.webdav.org/specs/rfc4918.html#PROPERTY_resourcetype
        const isCollection = Boolean(
          typeof properties[prop("resourcetype")] === "object" &&
            prop("collection") in properties[prop("resourcetype")]
        );

        if (isCollection) {
          const subdirectory = joinURL(source.origin, href);
          if (options.infinityDepthHeaderUnavailable && subdirectory !== uri) {
            subdirectories.push(fetchDirectory(subdirectory));
          }
          continue;
        }

        const key = decodeURI(href)
          .replace(source.pathname, "")
          .replace(/\//g, ":");

        if (key in files) {
          if (files[key].meta.etag === etag) continue;
          delete files[key].body;
        }

        // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontenttype
        const type = formatMediaType(properties[prop("getcontenttype")]);

        // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getcontentlength
        const size = validInteger(properties[prop("getcontentlength")]);

        // http://www.webdav.org/specs/rfc4918.html#PROPERTY_getlastmodified
        const mtime = validDate(properties[prop("getlastmodified")]);

        files[key] = {
          meta: {
            href,
            etag,
            type,
            size,
            mtime,
          },
        };
      }
      if (options.infinityDepthHeaderUnavailable)
        await Promise.all(subdirectories);
    };

    await fetchDirectory(source.href);
  };

  const parseResponseHeaders = (headers: Headers) => {
    const getHeader = (key: string) => {
      const value = headers.get(key);
      if (value) return value;
    };

    return {
      etag: formatEtag(getHeader("etag")),
      type: formatMediaType(getHeader("Content-Type")),
      size: validInteger(getHeader("Content-Length")),
      atime: validDate(getHeader("Date")),
      mtime: validDate(getHeader("Last-Modified")),
    } as Partial<WebdavFile["meta"]>;
  };

  const fetchFile = async (key: string) => {
    const { href } = files[key].meta;
    const uri = joinURL(source.origin, href);
    try {
      const response = await fetch(uri, { headers });
      if (response.status !== 200) return;

      files[key] = {
        body: await response.text(),
        meta: {
          href,
          ...parseResponseHeaders(response.headers),
        },
      } as WebdavFile;
    } catch {
      return;
    }
  };

  const makeDirectory = async (key: string) => {
    let uri = joinURL(source.href, encodeURI(key.replace(/\:/g, "/")));
    const response = await fetch(uri, {
      method: "MKCOL",
      headers,
    });
    const ok = Boolean(response.status === 201);
    if (!ok) console.error(`Failed to make directory: ${uri}`);
    return ok;
  };

  const ensureParentDirectory = async (key: string) => {
    const path = key.split(":");
    if (path.length === 1) return;

    const findNonexistent = () => {
      let keys = Object.keys(files);
      for (let d = 1; d < path.length; d++) {
        let dir = [...path.slice(0, d), ""].join(":");
        keys = keys.filter((k) => k.startsWith(dir));
        if (!keys.length) return d;
      }
    };
    const found = findNonexistent();
    if (!found) return;

    for (let p of path.keys()) {
      if (p < found) continue;
      await makeDirectory(path.slice(0, p).join(":"));
    }
  };

  const putFile = async (key: string, utf8: string) => {
    const uri = joinURL(source.href, encodeURI(key.replace(/\:/g, "/")));
    const response = await fetch(uri, {
      method: "PUT",
      headers,
      body: new Blob([Buffer.from(utf8, "utf8")]),
    });
    if (!response.ok) {
      console.error(`Failed to PUT file: ${uri}`);
      return false;
    }

    files[key] = {
      body: utf8,
      meta: {
        href: new URL(uri).pathname,
        ...parseResponseHeaders(response.headers),
      } as WebdavFile["meta"],
    };
    return true;
  };

  const deleteResource = async (key: string) => {
    const uri = joinURL(source.href, encodeURI(key.replace(/\:/g, "/")));
    const response = await fetch(uri, {
      method: "DELETE",
      headers,
    });
    if (response.status !== 204)
      console.error(`Failed to DELETE resource: ${uri}`);
  };

  let syncPromise: undefined | Promise<any>;
  const syncFiles = async (forceSync?: boolean) => {
    if (latest.atime && !forceSync) {
      if (!options.ttl) return;
      if (Date.now() < latest.atime + options.ttl! * 1000) return;
    }

    if (!syncPromise) syncPromise = fetchFiles();
    await syncPromise;
    syncPromise = undefined;
  };

  return {
    name: driverName,
    options,
    async hasItem(key) {
      await syncFiles();
      return key in files;
    },
    async getItem(key) {
      await syncFiles();
      if (!(key in files)) return null;

      if (files[key].body === undefined) await fetchFile(key);
      return files[key]?.body || null;
    },
    async getMeta(key) {
      await syncFiles();
      return files[key]?.meta || null;
    },
    async setItem(key, value, opts) {
      await syncFiles();
      await ensureParentDirectory(key);
      if (opts.type === "directory") {
        await makeDirectory(key);
      } else {
        await putFile(key, value);
      }
    },
    async removeItem(key) {
      await syncFiles();
      if (!(key in files)) return;
      await deleteResource(key);
    },
    async getKeys() {
      await syncFiles(true);
      return Object.keys(files);
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

function formatEtag(input?: string) {
  if (input) return input.match(/[^"]+/)?.shift();
}

function formatMediaType(input?: string) {
  if (input) return input.split(";").shift();
}

function errorMessage(message: string) {
  return new Error(`[unstorage] [${driverName}] ${message}`);
}
