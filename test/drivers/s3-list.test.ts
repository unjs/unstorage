import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import s3Driver, { type S3DriverOptions } from "../../src/drivers/s3.ts";

const DEFAULT_OBJECTS = [
  "foo/a.json",
  "foo/b.json",
  "foo/nested/c.json",
  "foobar/d.json",
  "other/e.json",
];

let pageSize = 2;
let objects: string[] = [];
let requests: string[] = [];
let deleted: string[] = [];
let echoStaleToken = false;
/** Canned list responses, consumed one per list request. A number is returned as a bare status. */
let listOverrides: Array<string | number> = [];

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function listResponse(keys: string[], nextToken?: string) {
  return /* xml */ `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<Name>test-bucket</Name>
<IsTruncated>${nextToken ? "true" : "false"}</IsTruncated>
${nextToken || echoStaleToken ? `<NextContinuationToken>${nextToken || "0"}</NextContinuationToken>` : ""}
${keys.map((key) => `<Contents><Key>${key}</Key></Contents>`).join("\n")}
</ListBucketResult>`;
}

const driver = (opts?: Partial<S3DriverOptions>) =>
  s3Driver({
    accessKeyId: "test",
    secretAccessKey: "test",
    bucket: "test-bucket",
    endpoint: "https://s3.test",
    region: "auto",
    ...opts,
  });

describe("drivers: s3 (listObjects)", () => {
  beforeEach(() => {
    pageSize = 2;
    objects = [...DEFAULT_OBJECTS];
    requests = [];
    deleted = [];
    echoStaleToken = false;
    listOverrides = [];
    vi.stubGlobal("fetch", async (req: Request) => {
      const url = new URL(req.url);
      requests.push(`${req.method} ${url.pathname}${url.search}`);
      if (url.search === "?delete") {
        const body = await req.text();
        deleted.push(...[...body.matchAll(/<Key>(.+?)<\/Key>/g)].map((m) => decodeXml(m[1]!)));
        return new Response("", { status: 200 });
      }
      if (req.method === "DELETE") {
        deleted.push(decodeURIComponent(url.pathname.slice("/test-bucket/".length)));
        return new Response(null, { status: 204 });
      }
      if (listOverrides.length > 0) {
        const next = listOverrides.shift()!;
        return typeof next === "number"
          ? new Response(null, { status: next })
          : new Response(next, { status: 200 });
      }
      const prefix = url.searchParams.get("prefix") || "";
      const matched = objects.filter((key) => key.startsWith(prefix));
      const offset = Number(url.searchParams.get("continuation-token") || 0);
      const page = matched.slice(offset, offset + pageSize);
      const nextOffset = offset + pageSize;
      return new Response(listResponse(page, nextOffset < matched.length ? `${nextOffset}` : ""), {
        status: 200,
      });
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("paginates over all pages", async () => {
    expect(await driver().getKeys!("", {})).toMatchObject(objects);
    expect(requests).toMatchObject([
      "GET /test-bucket?list-type=2",
      "GET /test-bucket?list-type=2&continuation-token=2",
      "GET /test-bucket?list-type=2&continuation-token=4",
    ]);
  });

  it("filters by prefix without matching sibling prefixes", async () => {
    expect(await driver().getKeys!("foo", {})).toMatchObject([
      "foo/a.json",
      "foo/b.json",
      "foo/nested/c.json",
    ]);
    expect(requests[0]).toBe("GET /test-bucket?list-type=2&prefix=foo%2F");
  });

  it("normalizes `:` separator in prefix", async () => {
    await driver().getKeys!("foo:nested", {});
    expect(requests[0]).toBe("GET /test-bucket?list-type=2&prefix=foo%2Fnested%2F");
  });

  it("does not loop when a stale continuation token is echoed back", async () => {
    echoStaleToken = true;
    expect(await driver().getKeys!("other", {})).toMatchObject(["other/e.json"]);
    expect(requests.length).toBe(1);
  });

  it("only clears keys under the given base", async () => {
    await driver().clear!("foo", {});
    expect(deleted).toMatchObject(["foo/a.json", "foo/b.json", "foo/nested/c.json"]);
  });

  it("returns an empty list for a missing bucket", async () => {
    vi.stubGlobal("fetch", async () => new Response("", { status: 404 }));
    expect(await driver().getKeys!("", {})).toMatchObject([]);
  });

  it("percent-encodes spaces in the prefix instead of using `+`", async () => {
    objects = ["my folder/a.json"];
    expect(await driver().getKeys!("my folder", {})).toMatchObject(["my folder/a.json"]);
    expect(requests[0]).toBe("GET /test-bucket?list-type=2&prefix=my%20folder%2F");
  });

  it("percent-encodes continuation tokens", async () => {
    listOverrides = [listResponse(["a.json"], "tok/en+value=="), listResponse(["b.json"])];
    expect(await driver().getKeys!("", {})).toMatchObject(["a.json", "b.json"]);
    expect(requests[1]).toBe(
      "GET /test-bucket?list-type=2&continuation-token=tok%2Fen%2Bvalue%3D%3D",
    );
  });

  it("decodes XML escaped keys", async () => {
    listOverrides = [listResponse(["a&amp;b&lt;c&gt;d/e.json"])];
    expect(await driver().getKeys!("", {})).toMatchObject(["a&b<c>d/e.json"]);
  });

  it("round-trips XML escaped keys when deleting", async () => {
    listOverrides = [listResponse(["a&amp;b&lt;c&gt;d/e.json"])];
    await driver().clear!("", {});
    expect(deleted).toMatchObject(["a&b<c>d/e.json"]);
  });

  it("chunks bulk deletes into batches of 1000", async () => {
    pageSize = 1000;
    objects = Array.from({ length: 2500 }, (_, i) => `bulk/key-${i}.json`);
    await driver().clear!("bulk", {});
    expect(requests.filter((r) => r.endsWith("?delete")).length).toBe(3);
    expect(deleted.length).toBe(2500);
  });

  it("deletes objects individually when bulkDelete is disabled", async () => {
    pageSize = 1000;
    objects = Array.from({ length: 25 }, (_, i) => `many/key-${i}.json`);
    await driver({ bulkDelete: false }).clear!("many", {});
    expect(requests.filter((r) => r.startsWith("DELETE ")).length).toBe(25);
    expect(requests.filter((r) => r.endsWith("?delete")).length).toBe(0);
    expect(deleted.length).toBe(25);
  });

  it("throws when truncated without a continuation token", async () => {
    listOverrides = [
      '<?xml version="1.0"?><ListBucketResult><IsTruncated>true</IsTruncated><Contents><Key>a.json</Key></Contents></ListBucketResult>',
    ];
    await expect(driver().getKeys!("", {})).rejects.toThrow(/continuation token/);
  });

  it("throws when the continuation token does not advance", async () => {
    listOverrides = [listResponse(["a.json"], "same"), listResponse(["b.json"], "same")];
    await expect(driver().getKeys!("", {})).rejects.toThrow(/continuation token/);
  });

  it("throws instead of truncating when a page 404s mid-pagination", async () => {
    listOverrides = [listResponse(["a.json"], "next"), 404];
    await expect(driver().getKeys!("", {})).rejects.toThrow(/Failed to list objects/);
  });
});
