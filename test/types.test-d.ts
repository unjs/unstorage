import { expectTypeOf, test } from "vitest";

import type { WithSafeName } from "../src/types";

test("WithSafeName utility type produces correct safe names", () => {
  // Test: 'deno-kv' => 'deno-kv' | 'denoKV'
  expectTypeOf<WithSafeName<"deno-kv">>().toEqualTypeOf<
    "deno-kv" | "denoKV"
  >();
  // Test: 'cloudflare-kv-binding' => 'cloudflare-kv-binding' | 'cloudflareKVBinding'
  expectTypeOf<WithSafeName<"cloudflare-kv-binding">>().toEqualTypeOf<
    "cloudflare-kv-binding" | "cloudflareKVBinding"
  >();
  // Test: 'localStorage' => 'localStorage' | 'localstorage'
  expectTypeOf<WithSafeName<"localStorage">>().toEqualTypeOf<
    "localStorage" | "localstorage"
  >();
  // Test: 'azure-key-vault' => 'azure-key-vault' | 'azureKeyVault'
  expectTypeOf<WithSafeName<"azure-key-vault">>().toEqualTypeOf<
    "azure-key-vault" | "azureKeyVault"
  >();
  // Test: 'lru-cache' => 'lru-cache' | 'lruCache'
  expectTypeOf<WithSafeName<"lru-cache">>().toEqualTypeOf<
    "lru-cache" | "lruCache"
  >();
  // Test: 'netlify-blobs' => 'netlify-blobs' | 'netlifyBlobs'
  expectTypeOf<WithSafeName<"netlify-blobs">>().toEqualTypeOf<
    "netlify-blobs" | "netlifyBlobs"
  >();
  // Test: 'memory' => 'memory'
  expectTypeOf<WithSafeName<"memory">>().toEqualTypeOf<"memory">();
  // Test: 'uploadthing' => 'uploadthing'
  expectTypeOf<WithSafeName<"uploadthing">>().toEqualTypeOf<"uploadthing">();
  // Test: 'session-storage' => 'session-storage' | 'sessionStorage'
  expectTypeOf<WithSafeName<"session-storage">>().toEqualTypeOf<
    "session-storage" | "sessionStorage"
  >();
  // Test: 'vercel-runtime-cache' => 'vercel-runtime-cache' | 'vercelRuntimeCache'
  expectTypeOf<WithSafeName<"vercel-runtime-cache">>().toEqualTypeOf<
    "vercel-runtime-cache" | "vercelRuntimeCache"
  >();
  // Test: 'deno-kv-node' => 'deno-kv-node' | 'denoKVNode'
  expectTypeOf<WithSafeName<"deno-kv-node">>().toEqualTypeOf<
    "deno-kv-node" | "denoKVNode"
  >();

  // Negative test: @ts-expect-error 'deno-kv' does not produce 'denoKv'
  // @ts-expect-error
  expectTypeOf<WithSafeName<"deno-kv">>().toEqualTypeOf<"denoKv">();
});
