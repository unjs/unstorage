import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import s3Driver from "../../src/drivers/s3.ts";

const PAGE_SIZE = 2;

const objects = ["foo/a.json", "foo/b.json", "foo/nested/c.json", "foobar/d.json", "other/e.json"];

let requests: string[] = [];
let deleted: string[] = [];
let echoStaleToken = false;

function listResponse(keys: string[], nextToken?: string) {
  return /* xml */ `<?xml version="1.0" encoding="UTF-8"?>
<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
<Name>test-bucket</Name>
<IsTruncated>${nextToken ? "true" : "false"}</IsTruncated>
${nextToken || echoStaleToken ? `<NextContinuationToken>${nextToken || "0"}</NextContinuationToken>` : ""}
${keys.map((key) => `<Contents><Key>${key}</Key></Contents>`).join("\n")}
</ListBucketResult>`;
}

const driver = () =>
  s3Driver({
    accessKeyId: "test",
    secretAccessKey: "test",
    bucket: "test-bucket",
    endpoint: "https://s3.test",
    region: "auto",
  });

describe("drivers: s3 (listObjects)", () => {
  beforeEach(() => {
    requests = [];
    deleted = [];
    echoStaleToken = false;
    vi.stubGlobal("fetch", async (req: Request) => {
      const url = new URL(req.url);
      requests.push(`${req.method} ${url.pathname}${url.search}`);
      if (url.search === "?delete") {
        const body = await req.text();
        deleted.push(...[...body.matchAll(/<Key>(.+?)<\/Key>/g)].map((m) => m[1]!));
        return new Response("", { status: 200 });
      }
      const prefix = url.searchParams.get("prefix") || "";
      const matched = objects.filter((key) => key.startsWith(prefix));
      const offset = Number(url.searchParams.get("continuation-token") || 0);
      const page = matched.slice(offset, offset + PAGE_SIZE);
      const nextOffset = offset + PAGE_SIZE;
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
});
