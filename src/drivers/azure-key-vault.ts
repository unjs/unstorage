import { createError, createRequiredError, defineDriver } from "./utils";
import { SecretClient, SecretClientOptions } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureKeyVaultOptions {
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
}

const DRIVER_NAME = "azure-key-vault";

export default defineDriver((opts: AzureKeyVaultOptions) => {
  let keyVaultClient: SecretClient;
  const getKeyVaultClient = () => {
    if (keyVaultClient) {
      return keyVaultClient;
    }
    const { vaultName = null, serviceVersion = "7.3", pageSize = 25 } = opts;
    if (!vaultName) {
      throw createRequiredError(DRIVER_NAME, "vaultName");
    }
    if (pageSize > 25) {
      throw createError(DRIVER_NAME, "`pageSize` cannot be greater than `25`");
    }
    const credential = new DefaultAzureCredential();
    const url = `https://${vaultName}.vault.azure.net`;
    keyVaultClient = new SecretClient(url, credential, { serviceVersion });
    return keyVaultClient;
  };

  return {
    name: DRIVER_NAME,
    options: opts,
    getInstance: getKeyVaultClient,
    async hasItem(key) {
      try {
        await getKeyVaultClient().getSecret(encode(key));
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      try {
        const secret = await getKeyVaultClient().getSecret(encode(key));
        return secret.value;
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      await getKeyVaultClient().setSecret(encode(key), value);
    },
    async removeItem(key) {
      const poller = await getKeyVaultClient().beginDeleteSecret(encode(key));
      await poller.pollUntilDone();
      await getKeyVaultClient().purgeDeletedSecret(encode(key));
    },
    async getKeys() {
      const secrets = getKeyVaultClient()
        .listPropertiesOfSecrets()
        .byPage({ maxPageSize: opts.pageSize || 25 });
      const keys = [];
      for await (const page of secrets) {
        const pageKeys = page.map((secret) => decode(secret.name));
        keys.push(...pageKeys);
      }
      return keys;
    },
    async getMeta(key) {
      const secret = await getKeyVaultClient().getSecret(encode(key));
      return {
        mtime: secret.properties.updatedOn,
        birthtime: secret.properties.createdOn,
        expireTime: secret.properties.expiresOn,
      };
    },
    async clear() {
      const secrets = getKeyVaultClient()
        .listPropertiesOfSecrets()
        .byPage({ maxPageSize: opts.pageSize || 25 });
      for await (const page of secrets) {
        const deletionPromises = page.map(async (secret) => {
          const poller = await getKeyVaultClient().beginDeleteSecret(
            secret.name
          );
          await poller.pollUntilDone();
          await getKeyVaultClient().purgeDeletedSecret(secret.name);
        });
        await Promise.all(deletionPromises);
      }
    },
  };
});

const base64Map: { [key: string]: string } = {
  "=": "-e-",
  "+": "-p-",
  "/": "-s-",
};

function encode(value: string): string {
  let encoded = Buffer.from(value).toString("base64");
  for (const key in base64Map) {
    encoded = encoded.replace(
      new RegExp(key.replace(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`), "g"),
      base64Map[key]
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
