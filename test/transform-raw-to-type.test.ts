import { describe, it, expect } from "vitest";
import { transformRawToType } from "../src/utils";

const isNode = typeof Buffer !== "undefined";
const hasBlob = typeof Blob !== "undefined";
const hasReadableStream = typeof ReadableStream !== "undefined";

describe("transformRawToType", () => {
  describe('"bytes"', () => {
    it("returns Uint8Array as-is", () => {
      const input = new Uint8Array([1, 2, 3]);
      const result = transformRawToType(input, "bytes");
      expect(result).toBe(input);
    });

    it("returns Buffer as-is", () => {
      if (!isNode) return;
      const input = Buffer.from([1, 2, 3]);
      const result = transformRawToType(input, "bytes");
      expect(result).toBe(input);
    });

    it("converts string to Uint8Array", () => {
      const input = "hello";
      const result = transformRawToType(input, "bytes");
      expect(
        result instanceof Uint8Array || (isNode && result instanceof Buffer)
      ).toBe(true);
      if (
        result instanceof Uint8Array ||
        (isNode && result instanceof Buffer)
      ) {
        expect(new TextDecoder().decode(result)).toBe("hello");
      }
    });

    it("converts ArrayBuffer to Uint8Array", () => {
      const input = new Uint8Array([1, 2, 3]).buffer;
      const result = transformRawToType(input, "bytes");
      expect(
        result instanceof Uint8Array || (isNode && result instanceof Buffer)
      ).toBe(true);
      if (
        result instanceof Uint8Array ||
        (isNode && result instanceof Buffer)
      ) {
        expect([...result]).toEqual([1, 2, 3]);
      }
    });

    it('throws when "bytes" input is invalid', () => {
      expect(() => transformRawToType(123, "bytes")).toThrow();
      expect(() => transformRawToType({}, "bytes")).toThrow();
      expect(() => transformRawToType(null, "bytes")).toThrow();
      expect(() => transformRawToType(undefined, "bytes")).toThrow();
    });

    it("throws on unsupported input", () => {
      expect(() => transformRawToType(123, "bytes")).toThrow();
      expect(() => transformRawToType({}, "bytes")).toThrow();
    });
  });

  describe('"blob"', () => {
    it("returns Blob as-is", () => {
      if (!hasBlob) return;
      const input = new Blob(["hello"]);
      const result = transformRawToType(input, "blob");
      expect(result).toBe(input);
    });

    it("converts Uint8Array to Blob", () => {
      if (!hasBlob) return;
      const input = new Uint8Array([1, 2, 3]);
      const result = transformRawToType(input, "blob");
      expect(result).toBeInstanceOf(Blob);
    });

    it("converts Buffer to Blob", () => {
      if (!hasBlob || !isNode) return;
      const input = Buffer.from([1, 2, 3]);
      const result = transformRawToType(input, "blob");
      expect(result).toBeInstanceOf(Blob);
    });

    it("converts string to Blob", () => {
      if (!hasBlob) return;
      const input = "hello";
      const result = transformRawToType(input, "blob");
      expect(result).toBeInstanceOf(Blob);
    });

    it('throws when "blob" input is invalid', () => {
      const originalBlob = globalThis.Blob;
      // Force Blob to be defined to enter error branches
      globalThis.Blob = class MockBlob {} as any;
      try {
        expect(() => transformRawToType(123, "blob")).toThrow();
        expect(() => transformRawToType({}, "blob")).toThrow();
        expect(() => transformRawToType(null, "blob")).toThrow();
        expect(() => transformRawToType(undefined, "blob")).toThrow();
      } finally {
        globalThis.Blob = originalBlob;
      }
    });

    it("converts ArrayBuffer to Blob", () => {
      if (!hasBlob) return;
      const input = new Uint8Array([1, 2, 3]).buffer;
      const result = transformRawToType(input, "blob");
      expect(result).toBeInstanceOf(Blob);
    });

    it("throws on unsupported input", () => {
      if (!hasBlob) return;
      expect(() => transformRawToType(123, "blob")).toThrow();
      expect(() => transformRawToType({}, "blob")).toThrow();
    });
  });

  describe('"stream"', () => {
    it("returns ReadableStream as-is", () => {
      if (!hasReadableStream) return;
      const input = new ReadableStream({});
      const result = transformRawToType(input, "stream");
      expect(result).toBe(input);
    });

    it("converts Uint8Array to ReadableStream", async () => {
      if (!hasReadableStream) return;
      const input = new Uint8Array([1, 2, 3]);
      const stream = transformRawToType(input, "stream");
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it("converts Buffer to ReadableStream", async () => {
      if (!hasReadableStream || !isNode) return;
      const input = Buffer.from([1, 2, 3]);
      const stream = transformRawToType(input, "stream");
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it('throws when "stream" input is invalid', () => {
      const originalStream = globalThis.ReadableStream;
      // Force ReadableStream to be defined to enter error branches
      globalThis.ReadableStream = class MockStream {} as any;
      try {
        expect(() => transformRawToType(123, "stream")).toThrow();
        expect(() => transformRawToType({}, "stream")).toThrow();
        expect(() => transformRawToType(null, "stream")).toThrow();
        expect(() => transformRawToType(undefined, "stream")).toThrow();
      } finally {
        globalThis.ReadableStream = originalStream;
      }
    });

    it("converts string to ReadableStream", async () => {
      if (!hasReadableStream) return;
      const input = "hello";
      const stream = transformRawToType(input, "stream");
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it("converts ArrayBuffer to ReadableStream", async () => {
      if (!hasReadableStream) return;
      const input = new Uint8Array([1, 2, 3]).buffer;
      const stream = transformRawToType(input, "stream");
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    it("throws on unsupported input", () => {
      if (!hasReadableStream) return;
      expect(() => transformRawToType(123, "stream")).toThrow();
      expect(() => transformRawToType({}, "stream")).toThrow();
    });
  });

  describe("unknown type", () => {
    it("throws on unknown type", () => {
      expect(() => transformRawToType("hello", "unknown" as any)).toThrow();
    });
  });
});
