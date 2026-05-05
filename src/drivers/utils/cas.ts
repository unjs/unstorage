/**
 * Compare-and-swap helpers shared by drivers.
 *
 * Lives under `src/drivers/utils/` because drivers are transpiled per-file
 * and must not import from `..` (the rest of `src` is bundled). The bundled
 * side re-exports these via `src/errors.ts`.
 *
 * Note on cross-bundle identity: the bundled main and the per-driver output
 * each receive their own copy of these classes. Prefer
 * `CASMismatchError.is(err)` / `err.code === "ERR_CAS_MISMATCH"` over
 * `instanceof` for catch-blocks that may receive errors thrown across that
 * boundary.
 */

export const ERR_CAS_MISMATCH: "ERR_CAS_MISMATCH" = "ERR_CAS_MISMATCH";
export const ERR_CAS_UNSUPPORTED: "ERR_CAS_UNSUPPORTED" = "ERR_CAS_UNSUPPORTED";

/** Thrown by CAS-aware drivers when an `ifMatch` / `ifNoneMatch` precondition fails. */
export class CASMismatchError extends Error {
  readonly code: typeof ERR_CAS_MISMATCH = ERR_CAS_MISMATCH;

  constructor(driver: string, key?: string, message?: string) {
    super(
      message ??
        `[unstorage] [${driver}] CAS mismatch${key === undefined ? "" : ` for key "${key}"`}`,
    );
    this.name = "CASMismatchError";
  }

  /** Cross-bundle-safe check (uses `code` field, not `instanceof`). */
  static is(err: unknown): err is CASMismatchError {
    return !!err && typeof err === "object" && (err as any).code === ERR_CAS_MISMATCH;
  }
}

/** Thrown when CAS preconditions are passed to a driver that does not implement CAS. */
export class CASUnsupportedError extends Error {
  readonly code: typeof ERR_CAS_UNSUPPORTED = ERR_CAS_UNSUPPORTED;

  constructor(driver: string) {
    super(`[unstorage] [${driver}] driver does not support ifMatch/ifNoneMatch`);
    this.name = "CASUnsupportedError";
  }

  /** Cross-bundle-safe check (uses `code` field, not `instanceof`). */
  static is(err: unknown): err is CASUnsupportedError {
    return !!err && typeof err === "object" && (err as any).code === ERR_CAS_UNSUPPORTED;
  }
}

/** Throw {@link CASUnsupportedError} if `opts` carries any CAS precondition. */
export function assertCASUnsupported(driver: string, opts: unknown): void {
  if (opts && typeof opts === "object") {
    const o = opts as { ifMatch?: unknown; ifNoneMatch?: unknown };
    if (o.ifMatch !== undefined || o.ifNoneMatch !== undefined) {
      throw new CASUnsupportedError(driver);
    }
  }
}

/**
 * Evaluate `ifMatch` / `ifNoneMatch` preconditions against the current state
 * of a key. Throws {@link CASMismatchError} on failure. Used by drivers whose
 * underlying backend exposes etag/version metadata to the client.
 */
export function checkCAS(
  driver: string,
  key: string,
  current: { exists: boolean; etag?: string },
  opts: { ifMatch?: string; ifNoneMatch?: string },
): void {
  const { ifMatch, ifNoneMatch } = opts;
  const { exists, etag } = current;

  if (ifNoneMatch !== undefined) {
    if (ifNoneMatch === "*") {
      if (exists) throw new CASMismatchError(driver, key);
    } else if (exists && etag === ifNoneMatch) {
      throw new CASMismatchError(driver, key);
    }
  }

  if (ifMatch !== undefined) {
    if (ifMatch === "*") {
      if (!exists) throw new CASMismatchError(driver, key);
    } else if (!exists || etag !== ifMatch) {
      throw new CASMismatchError(driver, key);
    }
  }
}
