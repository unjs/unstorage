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
