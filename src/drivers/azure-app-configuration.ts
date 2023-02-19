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
  const {
    prefix = null,
    label = null,
    endpoint = null,
    appConfigName = null,
    connectionString = null,
  } = opts;
  const labelFilter = label || "\0";
  const keyFilter = prefix ? `${prefix}:*` : "*";
  const p = (key: string) => (prefix ? `${prefix}:${key}` : key); // Prefix a key
  const d = (key: string) => (prefix ? key.replace(prefix, "") : key); // Deprefix a key

  if (!endpoint && !appConfigName && !connectionString)
    throw new Error(
      "Either the endpoint, appConfigName or connectionString option must be provided."
    );
  const appConfigEndpoint = endpoint || `https://${appConfigName}.azconfig.io`;
  let client: AppConfigurationClient;
  const getClient = () => {
    if (!client) {
      if (connectionString) {
        client = new AppConfigurationClient(connectionString);
      } else {
        const credential = new DefaultAzureCredential();
        client = new AppConfigurationClient(appConfigEndpoint, credential);
      }
    }
    return client;
  };

  return {
    async hasItem(key) {
      try {
        await getClient().getConfigurationSetting({
          key: p(key),
          label,
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
          label,
        });
        return d(setting.value);
      } catch {
        return null;
      }
    },
    async setItem(key, value) {
      await getClient().setConfigurationSetting({ key: p(key), value, label });
      return;
    },
    async removeItem(key) {
      console.log(p(key));
      await getClient().deleteConfigurationSetting({ key: p(key), label });
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
        label,
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
      return;
    },
  };
});
