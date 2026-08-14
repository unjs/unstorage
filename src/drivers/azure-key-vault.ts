import {
  createError,
  createRequiredError,
  type DriverFactory,
  importLib,
  type LibImport,
  type DriverDependencies,
} from "./utils/index.ts";
import { type AzureIdentityOptions, createDefaultAzureCredential } from "./utils/azure.ts";
import type { SecretClient, SecretClientOptions } from "@azure/keyvault-secrets";

export interface AzureKeyVaultOptions extends AzureIdentityOptions {
  /**
   * The name of the key vault to use.
   */
  vaultName: string;

  /**
   * Version of the Azure Key Vault service to use. Defaults to 7.3.
   * @default '7.3'
   */
  serviceVersion?: SecretClientOptions["serviceVersion"];

  /**
   * The number of entries to retrieve per request. Impacts getKeys() and clear() performance. Maximum value is 25.
   * @default 25
   */
  pageSize?: number;

  /**
   * Optionally provide the [`@azure/keyvault-secrets`](https://www.npmjs.com/package/@azure/keyvault-secrets)
   * library to avoid dynamically importing it.
   */
  lib?: LibImport<typeof import("@azure/keyvault-secrets")>;
}

export const DRIVER_DEPENDENCIES: DriverDependencies = {
  lib: { name: "@azure/keyvault-secrets", version: "^4.10.0" },
  identityLib: { name: "@azure/identity", version: "^4.13.0" },
};

const DRIVER_NAME = "azure-key-vault";

const driver: DriverFactory<AzureKeyVaultOptions, Promise<SecretClient>> = (opts) => {
  let keyVaultClient: Promise<SecretClient> | undefined;
  const getKeyVaultClient = () =>
    (keyVaultClient ??= (async () => {
      const { vaultName = null, serviceVersion = "7.3", pageSize = 25 } = opts;
      if (!vaultName) {
        throw createRequiredError(DRIVER_NAME, "vaultName");
      }
      if (pageSize > 25) {
        throw createError(DRIVER_NAME, "`pageSize` cannot be greater than `25`");
      }
      const { SecretClient } = await importLib(
        DRIVER_NAME,
        "@azure/keyvault-secrets",
        opts.lib,
        () => import("@azure/keyvault-secrets"),
      );
      const credential = await createDefaultAzureCredential(DRIVER_NAME, opts);
      const url = `https://${vaultName}.vault.azure.net`;
      return new SecretClient(url, credential, { serviceVersion });
    })());

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getKeyVaultClient,
    async hasItem(key) {
      try {
        await (await getKeyVaultClient()).getSecret(encode(key));
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      try {
        const secret = await (await getKeyVaultClient()).getSecret(encode(key));
        return secret.value;
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      await (await getKeyVaultClient()).setSecret(encode(key), value);
    },
    async removeItem(key) {
      const poller = await (await getKeyVaultClient()).beginDeleteSecret(encode(key));
      await poller.pollUntilDone();
      await (await getKeyVaultClient()).purgeDeletedSecret(encode(key));
    },
    async getKeys() {
      const secrets = (await getKeyVaultClient())
        .listPropertiesOfSecrets()
        .byPage({ maxPageSize: opts.pageSize || 25 });
      const keys: string[] = [];
      for await (const page of secrets) {
        const pageKeys = page.map((secret) => decode(secret.name));
        keys.push(...pageKeys);
      }
      return keys;
    },
    async getMeta(key) {
      const secret = await (await getKeyVaultClient()).getSecret(encode(key));
      return {
        mtime: secret.properties.updatedOn,
        birthtime: secret.properties.createdOn,
        expireTime: secret.properties.expiresOn,
      };
    },
    async clear() {
      const secrets = (await getKeyVaultClient())
        .listPropertiesOfSecrets()
        .byPage({ maxPageSize: opts.pageSize || 25 });
      for await (const page of secrets) {
        const deletionPromises = page.map(async (secret) => {
          const poller = await (await getKeyVaultClient()).beginDeleteSecret(secret.name);
          await poller.pollUntilDone();
          await (await getKeyVaultClient()).purgeDeletedSecret(secret.name);
        });
        await Promise.all(deletionPromises);
      }
    },
  };
};

const base64Map: { [key: string]: string } = {
  "=": "-e-",
  "+": "-p-",
  "/": "-s-",
};

function encode(value: string): string {
  let encoded = Buffer.from(value).toString("base64");
  for (const key in base64Map) {
    encoded = encoded.replace(
      new RegExp(key.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&"), "g"),
      base64Map[key]!,
    );
  }
  return encoded;
}

function decode(value: string): string {
  let decoded = value;
  const search = new RegExp(Object.values(base64Map).join("|"), "g");
  decoded = decoded.replace(search, (match) => {
    return Object.keys(base64Map).find((key) => base64Map[key] === match)!;
  });
  return Buffer.from(decoded, "base64").toString();
}

export default driver;
