import kvBinding from "../../../src/drivers/cloudflare-kv-binding.ts";
import r2Binding from "../../../src/drivers/cloudflare-r2-binding.ts";
import type * as CF from "@cloudflare/workers-types";

// Bindings as the ambient (global) `@cloudflare/workers-types` declare them for `env`
declare const KV: KVNamespace;
declare const BUCKET: R2Bucket;

kvBinding({ binding: KV });
r2Binding({ binding: BUCKET });

// Module types and binding names keep working
declare const moduleKV: CF.KVNamespace;
declare const moduleBucket: CF.R2Bucket;

kvBinding({ binding: moduleKV });
r2Binding({ binding: moduleBucket });
kvBinding({ binding: "KV" });
r2Binding({ binding: "BUCKET" });

// Plain objects with only the members the drivers use are accepted
const kvLike = {
  get: async () => null,
  put: async () => {},
  delete: async () => {},
  list: async () => ({ keys: [], list_complete: true }),
};
kvBinding({ binding: kvLike });

const r2Body = {
  text: async () => "",
  arrayBuffer: async () => new ArrayBuffer(0),
  body: null,
  blob: async () => null,
};
const r2Like = {
  head: async () => ({ uploaded: new Date() }),
  get: async () => r2Body,
  put: async () => {},
  delete: async () => {},
  list: async () => ({ objects: [] }),
};
r2Binding({ binding: r2Like });

// Objects whose results lack what the drivers read are rejected
// @ts-expect-error `get` must resolve to an object body
r2Binding({ binding: { ...r2Like, get: async () => "text" } });
// @ts-expect-error `head` must resolve to an object with `uploaded`
r2Binding({ binding: { ...r2Like, head: async () => ({}) } });
const { body: _body, ...r2BodyWithoutStream } = r2Body;
// @ts-expect-error `get` results need `body` for stream reads
r2Binding({ binding: { ...r2Like, get: async () => r2BodyWithoutStream } });
const { blob: _blob, ...r2BodyWithoutBlob } = r2Body;
// @ts-expect-error `get` results need `blob()` for blob reads
r2Binding({ binding: { ...r2Like, get: async () => r2BodyWithoutBlob } });
