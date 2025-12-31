import type {
  Driver,
  DriverFlags,
  StorageValue,
  TransactionOptions,
} from "../types.ts";
import {
  createError,
  createRequiredError,
  defineDriver,
  normalizeKey,
} from "./utils/index.ts";
import {
  AppwriteException,
  Client as AppwriteClient,
  Storage as AppwriteStorage,
  type Models as AppwriteModels,
  Query as AppwriteQuery,
  ID as AppwriteID,
} from "node-appwrite";

type AppwriteClientOptions = {
  /**
   * Shared Appwrite client instance.
   * This allows reusing an existing Appwrite client across multiple drivers.
   */
  client: AppwriteClient;
};

type AppwriteProjectOptions = {
  /**
   * The Appwrite endpoint URL.
   * This is the base URL for your Appwrite server.
   * @example 'https://fra.cloud.appwrite.io/v1'
   */
  endpoint: URL | string;

  /**
   * The Appwrite project ID.
   * This identifies your specific project within the Appwrite server.
   */
  projectId: string;

  /**
   * Optional API key for authentication with the Appwrite server.
   */
  apiKey?: string;
};

// export type StringTransformer = (value: string) => string | Promise<string>;
/**
 * Function type for transforming strings, typically used for encoding/decoding file IDs.
 * @param value - The input string to transform
 * @param keySeparator - The separator character used in key paths
 * @returns The transformed string
 */
export type StringTransformer = (value: string, keySeparator: string) => string;

type Impl<Flag extends boolean, T> = Flag extends true ? T : never;

/**
 * Interface for transforming between storage keys and Appwrite file IDs.
 * This allows custom encoding/decoding logic for file ID generation.
 */
export type AppwriteStorageKeyOptions<Flag extends boolean> = {
  /**
   * Encodes a storage key to an Appwrite file ID.
   * @param value - The storage key to encode
   * @param keySeparator - The separator character used in key paths
   * @returns The encoded file ID
   */
  encodeKey: Impl<Flag, StringTransformer>;

  /**
   * Decodes an Appwrite file ID back to a storage key.
   * @param value - The file ID to decode
   * @param keySeparator - The separator character used in key paths
   * @returns The decoded storage key
   */
  decodeKey: Impl<Flag, StringTransformer>;
};

/**
 * Configuration options for using file ID strategy.
 * This strategy uses file IDs as the primary key for storage operations.
 */
export type AppwriteStorageFileIdOptions = (
  | AppwriteStorageKeyOptions<true>
  | AppwriteStorageKeyOptions<false>
) & {
  /**
   * The key strategy to use - 'id' means using Appwrite file IDs as keys
   */
  keyStrategy: "id";
};

/**
 * Configuration options for using file name strategy.
 * This strategy uses file names as the primary key for storage operations.
 */
export type AppwriteStorageNameOptions = {
  /**
   * The key strategy to use - 'name' means using file names as keys
   */
  keyStrategy: "name";
};

/**
 * Common configuration options shared by all Appwrite storage strategies.
 * This includes either project options (endpoint + projectId) or a shared client,
 * plus the bucket ID that will be used for storage operations.
 */
export type AppwriteStorageCommonOptions = (
  | AppwriteProjectOptions
  | AppwriteClientOptions
) & {
  /**
   * The bucket ID to use.
   * This identifies the specific Appwrite storage bucket where files will be stored.
   */
  bucketId: string;
};

/**
 * Complete configuration options for the Appwrite storage driver.
 * This combines common options with either file ID strategy or name strategy options.
 */
export type AppwriteStorageConfigurationOptions = AppwriteStorageCommonOptions &
  (AppwriteStorageFileIdOptions | AppwriteStorageNameOptions);

type MaybePromise<T> = T | Promise<T>;
type FetchAppwriteStorageOptions<T> = {
  onNotFound?: () => MaybePromise<T>;
};

/**
 * Wrapper function for calling Appwrite Storage API with error handling.
 * This function handles API calls and provides a consistent way to handle 404 (not found) errors.
 *
 * @template T - The return type of the API call
 * @param call - The function that makes the actual API call
 * @param options - Optional configuration for handling not found errors
 * @returns A promise that resolves with the API call result or the onNotFound fallback
 * @throws Will throw an error if the API call fails (except when handled by onNotFound)
 */
async function callAppwriteStorageApi<T>(
  call: () => MaybePromise<T>,
  options?: FetchAppwriteStorageOptions<T>
): Promise<T> {
  try {
    return await call();
  } catch (cause) {
    if (
      options?.onNotFound &&
      isAppwriteException(cause) &&
      404 == cause.code
    ) {
      return await options.onNotFound();
    }

    throw createError(DRIVER_NAME, "Failed to call Appwrite Storage API", {
      cause,
    });
  }
}

/**
 * Type guard to check if a value is an AppwriteException.
 * This helps with proper error handling for Appwrite-specific exceptions.
 *
 * @param value - The value to check
 * @returns true if the value is an AppwriteException, false otherwise
 */
function isAppwriteException(value: unknown): value is AppwriteException {
  return (
    value instanceof AppwriteException ||
    (value instanceof Error && AppwriteException.name == value.name)
  );
}

export type AppwritePermissionOptions = {
  /**
   * Optional array of permission strings to apply to files.
   * These permissions control access to the files in Appwrite storage.
   * Each permission string follows Appwrite's permission format.
   * @example ['read("user:123")', 'write("team:456")']
   */
  permissions?: string[];
};

export type AppwriteStorageSetTransactionOptions = TransactionOptions &
  AppwritePermissionOptions;

const DRIVER_NAME = "appwrite-storage";

export default defineDriver((options: AppwriteStorageConfigurationOptions) => {
  let storage: AppwriteStorage;

  const getStorage = () => {
    if (!storage) {
      let client: AppwriteClient;

      if ("client" in options) {
        if (!options.client) {
          throw createRequiredError(DRIVER_NAME, "client");
        }

        client = options.client;
      } else {
        if (!options.endpoint) {
          throw createRequiredError(DRIVER_NAME, "endpoint");
        }
        if (!options.projectId) {
          throw createRequiredError(DRIVER_NAME, "project");
        }

        client = new AppwriteClient()
          .setEndpoint(options.endpoint.toString())
          .setProject(options.projectId);

        if (options.apiKey) {
          client.setKey(options.apiKey);
        }
      }

      storage = new AppwriteStorage(client);
    }

    return storage;
  };

  const driver = selectDriverVariant(getStorage, options);

  return {
    hasItem: driver.hasItem.bind(driver),
    getItem: driver.getItem.bind(driver),
    getKeys: driver.getKeys.bind(driver),
    setItem: driver.setItem.bind(driver),
    removeItem: driver.removeItem.bind(driver),
    getMeta: driver.getMeta.bind(driver),
    clear: driver.clear.bind(driver),
  } satisfies Driver;
});

/**
 * Factory function to create the appropriate driver variant based on configuration.
 * This selects between FileIdAppwriteStorageDriver and FileNameAppwriteStorageDriver
 * based on the keyStrategy option.
 *
 * @param getStorage - Function to get the Appwrite Storage instance
 * @param options - Configuration options for the driver
 * @returns An instance of the appropriate Appwrite storage driver
 * @throws Will throw an error if keyStrategy is not provided or is invalid
 */
function selectDriverVariant(
  getStorage: () => AppwriteStorage,
  options: AppwriteStorageConfigurationOptions
) {
  switch (options.keyStrategy) {
    case "id": {
      return new FileIdAppwriteStorageDriver(getStorage, options);
    }

    case "name": {
      return new FileNameAppwriteStorageDriver(getStorage, options);
    }

    default: {
      throw createRequiredError(DRIVER_NAME, "keyStrategy");
    }
  }
}

/**
 * Abstract base class for Appwrite storage drivers.
 * This class implements the Driver interface and provides common functionality
 * for both file ID and file name strategies.
 *
 * @template Options - The specific configuration options type for the driver variant
 */
abstract class AppwriteStorageDriver<
  Options extends AppwriteStorageConfigurationOptions,
> implements Driver
{
  readonly name = DRIVER_NAME;
  readonly flags: DriverFlags = {
    ttl: false,
    maxDepth: false,
  };
  readonly options: Options;
  readonly getInstance: () => AppwriteStorage;

  constructor(getStorage: () => AppwriteStorage, options: Options) {
    this.getInstance = getStorage;
    this.options = options;
  }

  /**
   * Resolves a file ID to the corresponding Appwrite file object.
   * This method handles the API call and 404 (not found) errors gracefully.
   *
   * @param fileId - The Appwrite file ID to resolve
   * @returns A promise that resolves with the file object, or null if not found
   */
  protected async getFile(fileId: string): Promise<AppwriteModels.File | null> {
    return await callAppwriteStorageApi(
      async () => {
        return await this.getInstance().getFile({
          bucketId: this.options.bucketId,
          fileId,
        });
      },
      {
        onNotFound() {
          return null;
        },
      }
    );
  }

  protected abstract generateFileId(key: string): string;
  protected abstract decodeFileToKey(file: AppwriteModels.File): string;

  protected abstract resolveKeyToFileId(
    key: string
  ): MaybePromise<string | null>;
  protected abstract resolveKeyToFile(
    key: string
  ): Promise<AppwriteModels.File | null>;

  protected abstract createQueriesForBase(
    base: string | undefined
  ): [string, ...string[]] | undefined;

  /**
   * Checks if an item exists in storage.
   *
   * @param key - The storage key to check
   * @returns A promise that resolves with true if the item exists, false otherwise
   */
  async hasItem(key: string) {
    const file = await this.resolveKeyToFile(key);
    return null != file;
  }

  /**
   * Gets metadata for a stored item.
   *
   * @param key - The storage key to get metadata for
   * @returns A promise that resolves with metadata object containing mtime, birthtime, and size,
   *          or null if the item doesn't exist
   */
  async getMeta(key: string) {
    const file = await this.resolveKeyToFile(key);
    if (!file) return null;
    return {
      mtime: new Date(file.$updatedAt),
      birthtime: new Date(file.$createdAt),
      size: file.sizeOriginal,
    };
  }

  /**
   * Gets an item from storage.
   *
   * @param key - The storage key to retrieve
   * @returns A promise that resolves with the stored value, or null if not found
   */
  async getItem(key: string): Promise<StorageValue> {
    const fileId = await this.resolveKeyToFileId(key);
    if (!fileId) return null;

    return await callAppwriteStorageApi(
      async () => {
        const fileContent = await this.getInstance().getFileView({
          bucketId: this.options.bucketId,
          fileId,
        });
        const file = new File([fileContent], key);
        return JSON.parse(await file.text());
      },
      {
        onNotFound() {
          return null;
        },
      }
    );
  }

  // getItems?: ((items: { key: string; options?: TransactionOptions; }[], commonOptions?: TransactionOptions) => { key: string; value: StorageValue; }[] | Promise<{ key: string; value: StorageValue; }[]>) | undefined;
  // getItemRaw?: ((key: string, opts: TransactionOptions) => unknown) | undefined;

  /**
   * Creates a new file in the Appwrite storage bucket.
   *
   * @param fileId - The unique identifier for the file
   * @param file - The File object to upload
   * @param permissions - Optional array of permission strings to apply to the file
   * @returns A promise that resolves when the file has been created
   * @throws Will throw an error if the Appwrite API call fails
   */
  protected async createFile(
    fileId: string,
    file: File,
    permissions?: string[]
  ) {
    await callAppwriteStorageApi(async () => {
      await this.getInstance().createFile({
        bucketId: this.options.bucketId,
        fileId,
        file,
        permissions,
      });
    });
  }

  /**
   * Upserts (inserts or updates) a file in the Appwrite storage bucket.
   *
   * This method handles the logic for either creating a new file or updating an existing one
   * in the configured Appwrite storage bucket. The exact implementation may vary between
   * subclasses, but the end result is that the file is stored with the given fileId.
   *
   * @param fileId - The unique identifier for the file in the bucket. This must be a valid
   *                 string that complies with Appwrite's file ID requirements.
   * @param file - The File object to upload. This should contain the file data and metadata
   *               such as name and type.
   * @param permissions - Optional array of permission strings to apply to the file. If not
   *                      provided, default permissions will be used.
   * @returns A Promise that resolves when the file has been successfully upserted.
   * @throws {Error} Throws an error if the Appwrite API call fails, wrapped in a custom error
   *                 with driver name and cause. This may include network errors, authentication
   *                 issues, or invalid parameters.
   *
   * @example
   * ```typescript
   * const file = new File(['content'], 'example.txt', { type: 'text/plain' });
   * await this.upsertFile('unique-file-id', file, ['read("user:123")']);
   * ```
   *
   * @note This method assumes a valid Appwrite client and bucket ID are configured.
   *       It modifies the storage state by uploading the file, potentially overwriting
   *       any existing file with the same fileId.
   */
  protected abstract upsertFile(
    fileId: string,
    file: File,
    permissions?: string[]
  ): Promise<void>;

  /**
   * Sets an item in storage.
   *
   * @param key - The storage key to set
   * @param value - The value to store
   * @param opts - Transaction options, which may include permissions
   * @returns A promise that resolves when the item has been stored
   */
  async setItem(
    key: string,
    value: StorageValue,
    opts?: AppwriteStorageSetTransactionOptions
  ) {
    const serializedValue = JSON.stringify(value);
    const file = new File([serializedValue], key, {
      type: "application/json",
    });

    const fileId = await this.resolveKeyToFileId(key);

    if (fileId) {
      await this.upsertFile(fileId, file, opts?.permissions);
    } else {
      const newFileId = this.generateFileId(key);
      await this.createFile(newFileId, file, opts?.permissions);
    }
  }

  // setItems?: ((items: { key: string; value: string; options?: TransactionOptions; }[], commonOptions?: TransactionOptions) => void | Promise<void>) | undefined;
  // setItemRaw?: ((key: string, value: any, opts: TransactionOptions) => void | Promise<void>) | undefined;

  /**
   * Removes a file from the Appwrite storage bucket.
   *
   * @param fileId - The unique identifier for the file to remove
   * @returns A promise that resolves when the file has been removed
   * @throws Will throw an error if the Appwrite API call fails (except for 404 errors)
   */
  protected async removeFile(fileId: string) {
    await callAppwriteStorageApi(
      async () => {
        await this.getInstance().deleteFile({
          bucketId: this.options.bucketId,
          fileId,
        });
      },
      {
        onNotFound() {},
      }
    );
  }

  /**
   * Removes an item from storage.
   *
   * @param key - The storage key to remove
   * @param opts - Transaction options (currently unused in this implementation)
   * @returns A promise that resolves when the item has been removed
   */
  async removeItem(key: string) {
    const fileId = await this.resolveKeyToFileId(key);
    if (!fileId) return;
    await this.removeFile(fileId);
  }

  /**
   * Gets all keys that match the specified base path.
   *
   * @param base - Optional base path to filter keys
   * @param opts - Options for getting keys, including maxDepth
   * @returns A promise that resolves with an array of matching keys
   */
  async getKeys(base: string | undefined) {
    const queries = this.createQueriesForBase(base);
    const fileList = await callAppwriteStorageApi(async () => {
      return await this.getInstance().listFiles({
        bucketId: this.options.bucketId,
        queries,
      });
    });
    return fileList.files.map((file) => {
      return this.decodeFileToKey(file);
    });
  }

  /**
   * Clears all items that match the specified base path.
   *
   * @param base - Optional base path to filter items to clear
   * @returns A promise that resolves when all matching items have been cleared
   */
  async clear(base: string | undefined) {
    const queries = this.createQueriesForBase(base);
    await callAppwriteStorageApi(async () => {
      const files = await this.getInstance().listFiles({
        bucketId: this.options.bucketId,
        queries,
      });

      await Promise.all(
        files.files.map((file: AppwriteModels.File) =>
          this.getInstance().deleteFile({
            bucketId: this.options.bucketId,
            fileId: file.$id,
          })
        )
      );
    });
  }
  // dispose?: (() => void | Promise<void>) | undefined;
  /**
   * @todo Implement watch method based on Appwrite Realtime API
   */
  // watch?: ((callback: WatchCallback) => Unwatch | Promise<Unwatch>) | undefined;
}

/**
 * Appwrite storage driver that uses file IDs as the primary key strategy.
 * This strategy maps storage keys directly to Appwrite file IDs, allowing for
 * efficient lookups and hierarchical key structures.
 */
class FileIdAppwriteStorageDriver extends AppwriteStorageDriver<
  AppwriteStorageCommonOptions & AppwriteStorageFileIdOptions
> {
  constructor(
    getStorage: () => AppwriteStorage,
    options: AppwriteStorageCommonOptions & AppwriteStorageFileIdOptions
  ) {
    super(getStorage, options);
  }

  private static KEY_SEPARATOR = "/" as const;

  protected override resolveKeyToFileId(key: string): string {
    return this.generateFileId(key);
  }

  protected override async resolveKeyToFile(
    key: string
  ): Promise<AppwriteModels.File | null> {
    const fileId = this.generateFileId(key);
    return await this.getFile(fileId);
  }

  protected override generateFileId(key: string): string {
    key = normalizeKey(key, FileIdAppwriteStorageDriver.KEY_SEPARATOR);
    return (
      this.options.encodeKey?.(
        key,
        FileIdAppwriteStorageDriver.KEY_SEPARATOR
      ) ?? key
    );
  }

  protected override decodeFileToKey(file: AppwriteModels.File): string {
    return (
      this.options.decodeKey?.(
        file.$id,
        FileIdAppwriteStorageDriver.KEY_SEPARATOR
      ) ?? file.$id
    );
  }

  protected override createQueriesForBase(
    base: string | undefined
  ): [string, ...string[]] | undefined {
    base = normalizeKey(base, FileIdAppwriteStorageDriver.KEY_SEPARATOR);

    if (!base) return;

    base = base + FileIdAppwriteStorageDriver.KEY_SEPARATOR;
    base =
      this.options.encodeKey?.(
        base,
        FileIdAppwriteStorageDriver.KEY_SEPARATOR
      ) ?? base;

    return [AppwriteQuery.startsWith("$id", base)];
  }

  protected override async upsertFile(
    fileId: string,
    file: File,
    permissions?: string[]
  ): Promise<void> {
    await this.removeFile(fileId);
    await this.createFile(fileId, file, permissions);
  }
}

/**
 * Appwrite storage driver that uses file names as the primary key strategy.
 * This strategy uses Appwrite's auto-generated file IDs and relies on file names
 * for key mapping. It's useful when you want Appwrite to manage file IDs.
 */
class FileNameAppwriteStorageDriver extends AppwriteStorageDriver<
  AppwriteStorageCommonOptions & AppwriteStorageNameOptions
> {
  protected override generateFileId(): string {
    return AppwriteID.unique();
  }

  protected override decodeFileToKey(file: AppwriteModels.File): string {
    return file.name;
  }

  protected override async resolveKeyToFileId(
    key: string
  ): Promise<string | null> {
    const file = await this.resolveKeyToFile(key);
    return file?.$id ?? null;
  }

  protected override async resolveKeyToFile(
    key: string
  ): Promise<AppwriteModels.File | null> {
    const fileList = await callAppwriteStorageApi(
      async () => {
        return await this.getInstance().listFiles({
          bucketId: this.options.bucketId,
          queries: [
            AppwriteQuery.equal("name", key),
            AppwriteQuery.orderDesc("$createdAt"),
            AppwriteQuery.limit(1),
          ],
        });
      },
      {
        onNotFound() {
          return null;
        },
      }
    );

    const file = fileList?.files.at(0);

    return file || null;
  }

  protected override createQueriesForBase(
    base: string | undefined
  ): [string, ...string[]] | undefined {
    if (!base) return;
    return [AppwriteQuery.startsWith("name", base)];
  }

  protected override async upsertFile(
    fileId: string,
    file: File,
    permissions?: string[]
  ): Promise<void> {
    await this.createFile(fileId, file, permissions);
    await this.removeFile(fileId);
  }
}
