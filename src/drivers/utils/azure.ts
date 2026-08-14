import { importLib, type LibImport } from "./index.ts";

export interface AzureIdentityOptions {
  /**
   * Optionally provide the [`@azure/identity`](https://www.npmjs.com/package/@azure/identity)
   * library to avoid dynamically importing it.
   *
   * Only used when no explicit credentials (account key, SAS key or connection string) are provided.
   */
  identityLib?: LibImport<typeof import("@azure/identity")>;
}

/**
 * Create a `DefaultAzureCredential` from the (optionally user provided) `@azure/identity` library.
 */
export async function createDefaultAzureCredential(
  driver: string,
  opts: AzureIdentityOptions,
): Promise<import("@azure/identity").DefaultAzureCredential> {
  const { DefaultAzureCredential } = await importLib(
    driver,
    "@azure/identity",
    opts.identityLib,
    () => import("@azure/identity"),
  );
  return new DefaultAzureCredential();
}
