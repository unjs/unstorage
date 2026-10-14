// Re-exported from `src/drivers/utils/cas.ts` so drivers (transpiled per-file)
// and the bundled main share a single source. See cas.ts for cross-bundle
// identity caveats — prefer `CASMismatchError.is(err)` / `err.code` over
// `instanceof` when catching errors that originated in a driver.
export {
  CASMismatchError,
  CASUnsupportedError,
  ERR_CAS_MISMATCH,
  ERR_CAS_UNSUPPORTED,
  assertCASUnsupported,
} from "./drivers/utils/cas.ts";
