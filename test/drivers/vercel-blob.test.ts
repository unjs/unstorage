import { beforeAll, describe, vi } from "vitest";
import { testDriver } from "./utils";
import { BlobNotFoundError } from "@vercel/blob";

const hasEnv = process.env.BLOB_READ_WRITE_TOKEN;

if (hasEnv) {
  describe("drivers: vercel-blob", async () => {
    const driver = await import("../../src/drivers/vercel-blob").then(
      (r) => r.default
    );
    testDriver({
      driver: driver({}),
    });
    testDriver({
      driver: driver({
        base: "test",
      }),
    });
  });
} else {
  // TODO: vitest describe.skipIf has no effect!!
  const data = new Map();
  const metadata = new Map();

  beforeAll(() => {
    data.clear();
    metadata.clear();
  });

  vi.doMock("@vercel/blob", () => {
    const del = vi.fn((input, { token }) => {
      const urls = Array.isArray(input) ? input : [input];
      for (const u of urls) {
        const blobMetadata = [...metadata.values()].find((d) => d.url === u);
        if (blobMetadata) {
          data.delete(blobMetadata.pathname);
          metadata.delete(blobMetadata.pathname);
        }
      }
      return Promise.resolve();
    });

    const list = vi.fn(({ token, prefix, cursor }) => {
      return Promise.resolve({
        blobs: [...metadata.values()].filter((d) =>
          d.pathname.startsWith(prefix)
        ),
        cursor: null, // For simplicity, no pagination
      });
    });

    const head = vi.fn((url, { token }) => {
      const blobMetadata = [...metadata.values()].find((d) => d.url === url);
      if (blobMetadata) {
        return Promise.resolve(blobMetadata);
      }
      return Promise.reject(new BlobNotFoundError());
    });

    const put = vi.fn((key, value, { token, ...opts }) => {
      const url = `https://example.com/${key}`;
      const blobMetaData = {
        size: value.length,
        uploadedAt: new Date().toISOString(),
        pathname: key,
        contentType: opts.contentType || "text/plain",
        contentDisposition: opts.contentDisposition || "inline",
        url,
        downloadUrl: url,
        cacheControl: opts.cacheControl || "no-cache",
      };
      data.set(key, value);
      metadata.set(key, blobMetaData);

      return Promise.resolve({
        size: blobMetaData.size,
        uploadedAt: blobMetaData.uploadedAt,
        pathname: blobMetaData.pathname,
        url: blobMetaData.url,
        downloadUrl: blobMetaData.downloadUrl,
      });
    });

    return {
      del,
      list,
      head,
      put,
    };
  });

  vi.doMock("node-fetch-native", () => ({
    default: vi.fn((input) => {
      const url = input instanceof Request ? input.url : input.toString();
      return Promise.resolve(
        new Response(data.get(url.replace("https://example.com/", "")))
      );
    }),
  }));

  describe("drivers: vercel-blob", async () => {
    const driver = await import("../../src/drivers/vercel-blob").then(
      (r) => r.default
    );
    testDriver({
      driver: driver({}),
    });
    testDriver({
      driver: driver({
        base: "test",
      }),
    });
  });
}
