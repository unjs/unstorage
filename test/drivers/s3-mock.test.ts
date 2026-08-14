import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createStorage } from "../../src/index.ts";
import s3Driver, { type S3DriverOptions } from "../../src/drivers/s3.ts";

const endpoint = "https://s3.example.com";
const bucket = "test-bucket";

const driverOptions: S3DriverOptions = {
  accessKeyId: "test-access-key",
  secretAccessKey: "test-secret-key",
  bucket,
  endpoint,
  region: "us-east-1",
};

/** Object keys currently in the fake bucket. */
let objects: Set<string>;
/** Every request the driver issued, as `<METHOD> <url>`. */
let requests: string[];
/** Overrides the list response for the next N list calls. A number is returned as a bare status. */
let listResponses: Array<string | number>;
/** Number of keys returned per list page. */
let pageSize = 1000;

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function listResponse(keys: string[], nextContinuationToken?: string) {
  return `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>${bucket}</Name><KeyCount>${keys.length}</KeyCount><IsTruncated>${!!nextContinuationToken}</IsTruncated>${
    nextContinuationToken
      ? `<NextContinuationToken>${xmlEscape(nextContinuationToken)}</NextContinuationToken>`
      : ""
  }${keys
    .map((key) => `<Contents><Key>${xmlEscape(key)}</Key><Size>1</Size></Contents>`)
    .join("")}</ListBucketResult>`;
}

function handleList(url: URL) {
  if (listResponses.length > 0) {
    const next = listResponses.shift()!;
    return typeof next === "number"
      ? new Response(null, { status: next })
      : new Response(next, { status: 200 });
  }
  const prefix = url.searchParams.get("prefix") || "";
  const matched = [...objects].filter((key) => key.startsWith(prefix)).sort();
  const offset = Number.parseInt(url.searchParams.get("continuation-token") || "0", 10);
  const page = matched.slice(offset, offset + pageSize);
  const nextOffset = offset + page.length;
  return new Response(
    listResponse(page, nextOffset < matched.length ? String(nextOffset) : undefined),
    { status: 200 },
  );
}

async function handleBulkDelete(request: Request) {
  const body = await request.text();
  const keys = [...body.matchAll(/<Key>([\s\S]*?)<\/Key>/g)].map((m) =>
    m[1]!.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
  );
  for (const key of keys) {
    objects.delete(key);
  }
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><DeleteResult>${keys
      .map((key) => `<Deleted><Key>${xmlEscape(key)}</Key></Deleted>`)
      .join("")}</DeleteResult>`,
    { status: 200 },
  );
}

const originalFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : new Request(input, init);
  const url = new URL(request.url);
  requests.push(`${request.method} ${request.url}`);

  if (!url.pathname.startsWith(`/${bucket}`)) {
    throw new Error(`unexpected request: ${request.url}`);
  }

  if (url.searchParams.has("list-type")) {
    return handleList(url);
  }
  if (url.search === "?delete") {
    return handleBulkDelete(request);
  }

  const key = decodeURIComponent(url.pathname.slice(`/${bucket}/`.length));
  switch (request.method) {
    case "PUT": {
      objects.add(key);
      return new Response("", { status: 200 });
    }
    case "DELETE": {
      objects.delete(key);
      return new Response(null, { status: 204 });
    }
    default: {
      return objects.has(key)
        ? new Response("value", { status: 200 })
        : new Response("", { status: 404 });
    }
  }
}) as typeof fetch;

afterAll(() => {
  globalThis.fetch = originalFetch;
});

const listRequests = () => requests.filter((r) => r.includes("list-type"));
const deleteRequests = () => requests.filter((r) => r.endsWith("?delete"));

describe("drivers: s3 (mocked)", () => {
  beforeEach(() => {
    objects = new Set();
    requests = [];
    listResponses = [];
    pageSize = 1000;
  });

  const createDriver = (opts?: Partial<S3DriverOptions>) =>
    s3Driver({ ...driverOptions, ...opts }) as ReturnType<typeof s3Driver> & {
      getKeys: (base?: string) => Promise<string[]>;
      clear: (base?: string) => Promise<void>;
    };

  describe("getKeys prefix", () => {
    it("translates the `:` separated base into a `/` separated S3 prefix", async () => {
      const storage = createStorage({ driver: s3Driver(driverOptions) });
      await storage.setItem("foo:bar:baz", "value");
      await storage.setItem("other:key", "value");

      expect(await storage.getKeys("foo")).toEqual(["foo:bar:baz"]);
      expect(listRequests().at(-1)).toContain("prefix=foo%2F");
    });

    it("keeps the prefix on a key boundary", async () => {
      objects.add("foo/a");
      objects.add("foobar/b");

      expect(await createDriver().getKeys("foo:")).toEqual(["foo/a"]);
    });

    it("lists the whole bucket without a base", async () => {
      objects.add("foo/a");
      objects.add("bar/b");

      expect(await createDriver().getKeys()).toEqual(["bar/b", "foo/a"]);
      expect(listRequests().at(-1)).not.toContain("prefix=");
    });

    it("percent-encodes spaces in the prefix rather than using `+`", async () => {
      objects.add("my folder/a");

      expect(await createDriver().getKeys("my folder")).toEqual(["my folder/a"]);
      expect(listRequests().at(-1)).toContain("prefix=my%20folder%2F");
    });

    it("returns an empty list when nothing matches", async () => {
      objects.add("other/a");

      expect(await createDriver().getKeys("foo")).toEqual([]);
    });
  });

  describe("pagination", () => {
    it("follows continuation tokens until the listing is complete", async () => {
      pageSize = 2;
      for (let i = 0; i < 5; i++) {
        objects.add(`k${i}`);
      }

      expect(await createDriver().getKeys()).toEqual(["k0", "k1", "k2", "k3", "k4"]);
      expect(listRequests()).toHaveLength(3);
      expect(listRequests()[1]).toContain("continuation-token=2");
    });

    it("percent-encodes continuation tokens containing base64 characters", async () => {
      listResponses = [listResponse(["a"], "tok/en+value=="), listResponse(["b"])];

      expect(await createDriver().getKeys()).toEqual(["a", "b"]);
      expect(listRequests()[1]).toContain("continuation-token=tok%2Fen%2Bvalue%3D%3D");
    });

    it("throws when truncated without a continuation token", async () => {
      listResponses = [
        '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><IsTruncated>true</IsTruncated><Contents><Key>a</Key></Contents></ListBucketResult>',
      ];

      await expect(createDriver().getKeys()).rejects.toThrow(/NextContinuationToken/);
    });

    it("throws when the continuation token does not advance", async () => {
      listResponses = [listResponse(["a"], "same"), listResponse(["b"], "same")];

      await expect(createDriver().getKeys()).rejects.toThrow(/not advancing/);
    });

    it("throws instead of silently truncating when a page 404s mid-pagination", async () => {
      listResponses = [listResponse(["a"], "next"), 404];

      await expect(createDriver().getKeys()).rejects.toThrow(/Missing page/);
    });

    it("returns an empty list when the first page 404s", async () => {
      listResponses = [404];

      expect(await createDriver().getKeys()).toEqual([]);
    });
  });

  describe("XML decoding", () => {
    it("decodes escaped entities in keys and round-trips them on delete", async () => {
      const key = "a&b<c>d/e";
      objects.add(key);

      expect(await createDriver().getKeys()).toEqual([key]);
      await createDriver().clear();
      expect([...objects]).toEqual([]);
    });
  });

  describe("clear", () => {
    it("chunks bulk deletes into batches of 1000", async () => {
      for (let i = 0; i < 2500; i++) {
        objects.add(`key-${i}`);
      }

      await createDriver().clear();

      expect(deleteRequests()).toHaveLength(3);
      expect(objects.size).toBe(0);
    });

    it("only deletes keys under the given base", async () => {
      objects.add("foo/a");
      objects.add("foobar/b");
      objects.add("other/c");

      await createDriver().clear("foo:");

      expect([...objects].sort()).toEqual(["foobar/b", "other/c"]);
    });

    it("deletes objects individually when bulkDelete is disabled", async () => {
      for (let i = 0; i < 25; i++) {
        objects.add(`key-${i}`);
      }

      await createDriver({ bulkDelete: false }).clear();

      expect(deleteRequests()).toHaveLength(0);
      expect(requests.filter((r) => r.startsWith("DELETE "))).toHaveLength(25);
      expect(objects.size).toBe(0);
    });

    it("is a no-op for an empty bucket", async () => {
      await createDriver().clear();

      expect(deleteRequests()).toHaveLength(0);
    });
  });
});
