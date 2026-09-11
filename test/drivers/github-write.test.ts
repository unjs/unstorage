import { Buffer } from "node:buffer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import driver, { type GithubOptions } from "../../src/drivers/github.ts";
import { createStorage } from "../../src/index.ts";

describe("drivers: github writes", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const apiURL = "https://api.example.test";
  const contentsURL = `${apiURL}/repos/owner/repo/contents/content`;

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error("Unexpected fetch"));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const storageFor = (options: Partial<GithubOptions> = {}) =>
    createStorage({
      driver: driver({
        repo: "owner/repo",
        branch: "drafts",
        dir: "/content",
        token: "test-token",
        apiURL,
        ...options,
      }),
    });
  const reply = (data: unknown, status = 200) =>
    fetchMock.mockResolvedValueOnce(Response.json(data, { status }));
  const blob = (path: string, sha: string, size = 0, mode = "100644") => ({
    type: "blob",
    path: `content/${path}`,
    sha,
    size,
    mode,
  });
  const body = (index: number) => JSON.parse(fetchMock.mock.calls[index]![1]!.body as string);

  it("creates UTF-8 content under the configured branch and directory", async () => {
    const storage = storageFor();
    const value = "é🌍".repeat(30_000);
    const size = Buffer.byteLength(value);
    reply({}, 404);
    reply({ content: { sha: "created", size } }, 201);
    reply({ tree: [blob("dir/a#b.txt", "created", size)] });

    await storage.setItem("dir/a#b.txt", value);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${contentsURL}/dir/a%23b.txt?ref=drafts`,
      expect.objectContaining({
        headers: {
          authorization: "token test-token",
          "user-agent": "unstorage",
          accept: "application/vnd.github.object+json",
        },
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${contentsURL}/dir/a%23b.txt`,
      expect.objectContaining({ method: "PUT" }),
    );
    expect(body(1)).toEqual({
      branch: "drafts",
      message: "unstorage: set content/dir/a#b.txt",
      content: Buffer.from(value).toString("base64"),
    });
    expect(await storage.getItem("dir/a#b.txt")).toBe(value);
    expect(await storage.hasItem("dir/a#b.txt")).toBe(true);
    expect(await storage.getKeys()).toEqual(["dir:a#b.txt"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("updates with a fresh SHA and retains empty content across tree refreshes", async () => {
    const storage = storageFor({ ttl: 0 });
    reply({ tree: [blob("config.txt", "cached", 3, "100755")] });
    fetchMock.mockResolvedValueOnce(new Response("old"));
    expect(await storage.getItem("config.txt")).toBe("old");
    reply({ sha: "external-update" });
    reply({ content: { sha: "empty", size: 0 } });
    for (let i = 0; i < 3; i++) {
      reply({ tree: [blob("config.txt", "empty", 0, "100755")] });
    }

    await storage.setItem("config.txt", "");

    expect(body(3)).toMatchObject({ sha: "external-update", content: "" });
    expect(await storage.getItem("config.txt")).toBe("");
    expect(await storage.getItem("config.txt")).toBe("");
    expect(await storage.getMeta("config.txt", { nativeOnly: true })).toEqual({
      sha: "empty",
      size: 0,
      mode: "100755",
    });
    reply({ tree: [blob("config.txt", "changed-again", 5, "100755")] });
    fetchMock.mockResolvedValueOnce(new Response("other"));
    expect(await storage.getItem("config.txt")).toBe("other");
    expect(fetchMock).toHaveBeenCalledTimes(9);
  });

  it("deletes using the current SHA and ignores an already missing file", async () => {
    const storage = storageFor();
    reply({ tree: [blob("a", "cached"), blob("b", "kept")] });
    await storage.getKeys();
    reply({ sha: "current" });
    reply({});
    reply({ tree: [blob("b", "kept")] });
    reply({}, 404);

    await storage.removeItem("a");

    expect(body(2)).toEqual({
      branch: "drafts",
      sha: "current",
      message: "unstorage: remove content/a",
    });
    expect(await storage.hasItem("a")).toBe(false);
    expect(await storage.getItem("a")).toBeNull();
    expect(await storage.getKeys()).toEqual(["b"]);
    await storage.removeItem("a");
    expect(fetchMock.mock.calls.map(([, init]) => init?.method || "GET").join(" ")).toBe(
      "GET GET DELETE GET GET",
    );
  });

  it.each([403, 409])(
    "propagates %s without changing cached data or poisoning later writes",
    async (status) => {
      const storage = storageFor();
      reply({ tree: [blob("a", "old", 3)] });
      fetchMock.mockResolvedValueOnce(new Response("old"));
      expect(await storage.getItem("a")).toBe("old");
      if (status === 409) {
        reply({ sha: "old" });
      }
      reply({ message: "Request rejected" }, status);

      await expect(storage.setItem("a", "rejected")).rejects.toMatchObject({ status });
      expect(await storage.getItem("a")).toBe("old");

      reply({ sha: "old" });
      reply({ content: { sha: "new", size: 3 } });
      reply({ tree: [blob("a", "new", 3)] });
      await storage.setItem("a", "new");
      expect(await storage.getItem("a")).toBe("new");
    },
  );

  it.each(["repo", "token"] as const)("requires %s before writing", async (option) => {
    const storage = storageFor({ [option]: "" });
    await expect(storage.setItem("a", "value")).rejects.toThrow(
      `Missing required option \`${option}\``,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects dot segments instead of escaping the configured directory", async () => {
    const storage = storageFor();
    await expect(storage.setItem("../outside.txt", "value")).rejects.toThrow("dot segments");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
