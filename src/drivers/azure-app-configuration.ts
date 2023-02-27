import { defineDriver } from "./utils";
import { AppConfigurationClient } from "@azure/app-configuration";
import { DefaultAzureCredential } from "@azure/identity";

export interface AzureAppConfigurationOptions {
  /**
   * Optional prefix for keys. This can be used to isolate keys from different applications in the same Azure App Configuration instance. E.g. "app01" results in keys like "app01:foo" and "app01:bar".
   * @default null
   */
  prefix?: string;

  /**
   * Optional label for keys. If not provided, all keys will be created and listed without labels. This can be used to isolate keys from different environments in the same Azure App Configuration instance. E.g. "dev" results in keys like "foo" and "bar" with the label "dev".
   * @default '\0'
   */
  label?: string;

  /**
   * Optional endpoint to use when connecting to Azure App Configuration. If not provided, the appConfigName option must be provided. If both are provided, the endpoint option takes precedence.
   * @default null
   */
  endpoint?: string;

  /**
   * Optional name of the Azure App Configuration instance to connect to. If not provided, the endpoint option must be provided. If both are provided, the endpoint option takes precedence.
   * @default null
   */
  appConfigName?: string;

  /**
   * Optional connection string to use when connecting to Azure App Configuration. If not provided, the endpoint option must be provided. If both are provided, the endpoint option takes precedence.
   * @default null
   */
  connectionString?: string;
}

export default defineDriver((opts: AzureAppConfigurationOptions = {}) => {
  const labelFilter = opts.label || "\0";
  const keyFilter = opts.prefix ? `${opts.prefix}:*` : "*";
  const p = (key: string) => (opts.prefix ? `${opts.prefix}:${key}` : key); // Prefix a key
  const d = (key: string) => (opts.prefix ? key.replace(opts.prefix, "") : key); // Deprefix a key

  let client: AppConfigurationClient;
  const getClient = () => {
    if (client) {
      return client;
    }
    if (!opts.endpoint && !opts.appConfigName && !opts.connectionString) {
      throw new Error(
        "[unstorage] [azure-app-configuration] Either the `endpoint`, `appConfigName` or `connectionString` option must be provided."
      );
    }
    const appConfigEndpoint =
      opts.endpoint || `https://${opts.appConfigName}.azconfig.io`;
    if (opts.connectionString) {
      client = new AppConfigurationClient(opts.connectionString);
    } else {
      const credential = new DefaultAzureCredential();
      client = new AppConfigurationClient(appConfigEndpoint, credential);
    }
    return client;
  };

  return {
    async hasItem(key) {
      try {
        await getClient().getConfigurationSetting({
          key: p(key),
          label: opts.label,
        });
        return true;
      } catch {
        return false;
      }
    },
    async getItem(key) {
      try {
        const setting = await getClient().getConfigurationSetting({
          key: p(key),
          label: opts.label,
        });
        return d(setting.value);
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      await getClient().setConfigurationSetting({
        key: p(key),
        value,
        label: opts.label,
      });
      return;
    },
    async removeItem(key) {
      await getClient().deleteConfigurationSetting({
        key: p(key),
        label: opts.label,
      });
      return;
    },
    async getKeys() {
      const settings = getClient().listConfigurationSettings({
        keyFilter,
        labelFilter,
        fields: ["key", "value", "label"],
      });
      const keys = [];
      for await (const setting of settings) {
        keys.push(d(setting.key));
      }
      return keys;
    },
    async getMeta(key) {
      const setting = await getClient().getConfigurationSetting({
        key: p(key),
        label: opts.label,
      });
      return {
        mtime: setting.lastModified,
        etag: setting.etag,
        tags: setting.tags,
      };
    },
    async clear() {
      const settings = getClient().listConfigurationSettings({
        keyFilter,
        labelFilter,
        fields: ["key", "value", "label"],
      });
      for await (const setting of settings) {
        await getClient().deleteConfigurationSetting({
          key: setting.key,
          label: setting.label,
        });
      }
    },
  };
});
