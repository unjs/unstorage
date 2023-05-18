// Copied from https://raw.githubusercontent.com/denoland/deno/v1.33.3/cli/tsc/dts/lib.deno.unstable.d.ts

type KvKeyPart = Uint8Array | string | number | bigint | boolean;
type KvKey = readonly KvKeyPart[];
interface AtomicCheck {
  key: KvKey;
  versionstamp: string | null;
}
type KvMutation = { key: KvKey } & (
  | { type: "set"; value: unknown }
  | { type: "delete" }
  | { type: "sum"; value: KvU64 }
  | { type: "max"; value: KvU64 }
  | { type: "min"; value: KvU64 }
);
interface KvCommitResult {
  ok: true;
  versionstamp: string;
}
interface KvCommitError {
  ok: false;
}
interface DenoAtomicOperation {
  check(...checks: AtomicCheck[]): this;
  mutate(...mutations: KvMutation[]): this;
  sum(key: KvKey, n: bigint): this;
  min(key: KvKey, n: bigint): this;
  max(key: KvKey, n: bigint): this;
  set(key: KvKey, value: unknown): this;
  delete(key: KvKey): this;
  commit(): Promise<KvCommitResult | KvCommitError>;
}
interface KvU64 {
  constructor(value: bigint);
  readonly value: bigint;
}
type KvConsistencyLevel = "strong" | "eventual";
type KvEntry<T> = { key: KvKey; value: T; versionstamp: string };
type KvEntryMaybe<T> =
  | KvEntry<T>
  | {
      key: KvKey;
      value: null;
      versionstamp: null;
    };
type KvListSelector =
  | { prefix: KvKey }
  | { prefix: KvKey; start: KvKey }
  | { prefix: KvKey; end: KvKey }
  | { start: KvKey; end: KvKey };
export interface KvListIterator<T> extends AsyncIterableIterator<KvEntry<T>> {
  get cursor(): string;
  next(): Promise<IteratorResult<KvEntry<T>, undefined>>;
  [Symbol.asyncIterator](): AsyncIterableIterator<KvEntry<T>>;
}
export interface DenoKv {
  get<T = unknown>(
    key: KvKey,
    options?: { consistency?: KvConsistencyLevel }
  ): Promise<KvEntryMaybe<T>>;
  getMany<T extends readonly unknown[]>(
    keys: readonly [...{ [K in keyof T]: KvKey }],
    options?: { consistency?: KvConsistencyLevel }
  ): Promise<{ [K in keyof T]: KvEntryMaybe<T[K]> }>;
  set(key: KvKey, value: unknown): Promise<KvCommitResult>;
  delete(key: KvKey): Promise<void>;
  list<T = unknown>(
    selector: KvListSelector,
    options?: KvListOptions
  ): KvListIterator<T>;
  atomic(): DenoAtomicOperation;
  close(): Promise<void>;
}
interface KvListOptions {
  limit?: number;
  cursor?: string;
  reverse?: boolean;
  consistency?: KvConsistencyLevel;
  batchSize?: number;
}
export type DenoGlobal = {
  openKv(path?: string): Promise<DenoKv>;
};
