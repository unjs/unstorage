import { type DriverFactory, createRequiredError } from "./utils/index.ts";
import { CASMismatchError } from "./utils/cas.ts";
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

const DRIVER_NAME = "azure-app-configuration";

const driver: DriverFactory<AzureAppConfigurationOptions, AppConfigurationClient> = (opts = {}) => {
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
      throw createRequiredError(DRIVER_NAME, ["endpoint", "appConfigName", "connectionString"]);
    }
    const appConfigEndpoint = opts.endpoint || `https://${opts.appConfigName}.azconfig.io`;
    if (opts.connectionString) {
      client = new AppConfigurationClient(opts.connectionString);
    } else {
      const credential = new DefaultAzureCredential();
      client = new AppConfigurationClient(appConfigEndpoint, credential);
    }
    return client;
  };

  const setWithCAS = async (
    key: string,
    value: string,
    tOptions: { ifMatch?: string; ifNoneMatch?: string },
  ): Promise<{ etag: string | undefined }> => {
    const k = p(key);
    const label = opts.label;
    const c = getClient();
    const { ifMatch, ifNoneMatch } = tOptions;
    try {
      // Create-only: ifNoneMatch:"*"
      if (ifNoneMatch === "*" && ifMatch === undefined) {
        const result = await c.addConfigurationSetting({ key: k, value, label });
        return { etag: result.etag };
      }
      // Swap by etag: ifMatch:<etag> (no ifNoneMatch, or harmless ifNoneMatch:"*")
      if (
        ifMatch !== undefined &&
        ifMatch !== "*" &&
        (ifNoneMatch === undefined || ifNoneMatch === "*")
      ) {
        const result = await c.setConfigurationSetting(
          { key: k, value, label, etag: ifMatch },
          { onlyIfUnchanged: true },
        );
        return { etag: result.etag };
      }
      // Remaining cases (ifMatch:"*", ifNoneMatch:<etag>, or combinations)
      // are emulated via read-then-conditional-set.
      const current = await c.getConfigurationSetting({ key: k, label }).catch(() => null);
      const exists = !!current;
      const curEtag = current?.etag;
      let mismatch = false;
      if (ifNoneMatch !== undefined) {
        mismatch =
          ifNoneMatch === "*" ? exists : exists && curEtag === ifNoneMatch;
      }
      if (!mismatch && ifMatch !== undefined) {
        mismatch = ifMatch === "*" ? !exists : !exists || curEtag !== ifMatch;
      }
      if (mismatch) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      if (exists) {
        const result = await c.setConfigurationSetting(
          { key: k, value, label, etag: curEtag },
          { onlyIfUnchanged: true },
        );
        return { etag: result.etag };
      }
      const result = await c.addConfigurationSetting({ key: k, value, label });
      return { etag: result.etag };
    } catch (err: any) {
      if (CASMismatchError.is(err)) throw err;
      if (err?.statusCode === 412 || err?.statusCode === 409) {
        throw new CASMismatchError(DRIVER_NAME, key);
      }
      throw err;
    }
  };

  return {
    name: DRIVER_NAME,
    flags: { cas: true },
    options: opts,
    getInstance: getClient,
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
        return setting.value;
      } catch {
        return null;
      }
    },
    async setItem(key, value, tOptions) {
      if (tOptions?.ifMatch !== undefined || tOptions?.ifNoneMatch !== undefined) {
        return setWithCAS(key, value, tOptions);
      }
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
      const keys: string[] = [];
      for await (const setting of settings) {
        keys.push(d(setting.key));
      }
      return keys;
    },
    async getMeta(key) {
      const setting = await getClient()
        .getConfigurationSetting({
          key: p(key),
          label: opts.label,
        })
        .catch(() => null);
      if (!setting) return null;
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
};

export default driver;
