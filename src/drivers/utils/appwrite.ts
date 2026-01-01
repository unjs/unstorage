import { Client as AppwriteClient, AppwriteException } from "node-appwrite";
import { createError, createRequiredError } from "./index.ts";

export type AppwriteClientOptions = {
  /**
   * Shared Appwrite client instance.
   * This allows reusing an existing Appwrite client across multiple drivers.
   */
  client: AppwriteClient;
};

export type AppwriteProjectOptions = {
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

export type MaybePromise<T> = T | Promise<T>;

export type FetchAppwriteStorageOptions<T> = {
  driverName: string;
  onNotFound?: () => MaybePromise<T>;
};

/**
 * Function type for transforming strings, typically used for encoding/decoding file IDs.
 * @param value - The input string to transform
 * @param keySeparator - The separator character used in key paths
 * @returns The transformed string
 */
export type StringTransformer = (value: string, keySeparator: string) => string;

export type RequireAllOrNone<T> = T | { [K in keyof T]?: never };
/**
 * Type for transforming between storage keys and Appwrite file IDs.
 * This allows custom encoding/decoding logic for file ID generation.
 */
export type AppwriteStorageKeyOptions = {
  /**
   * Encodes a storage key to an Appwrite file ID.
   * @param value - The storage key to encode
   * @param keySeparator - The separator character used in key paths
   * @returns The encoded file ID
   */
  encodeKey: StringTransformer;

  /**
   * Decodes an Appwrite file ID back to a storage key.
   * @param value - The file ID to decode
   * @param keySeparator - The separator character used in key paths
   * @returns The decoded storage key
   */
  decodeKey: StringTransformer;
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
export async function callAppwriteApi<T>(
  call: () => MaybePromise<T>,
  options: FetchAppwriteStorageOptions<T>
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

    throw createError(options.driverName, "Failed to call Appwrite API", {
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
export function isAppwriteException(
  value: unknown
): value is AppwriteException {
  return (
    value instanceof AppwriteException ||
    (value instanceof Error && AppwriteException.name == value.name)
  );
}

/**
 * Provides an Appwrite client instance based on the provided options.
 * This function either reuses an existing client or creates a new one using the provided configuration.
 *
 * @param options - Configuration options for the Appwrite client
 * @param driverName - The name of the driver using this client (for error reporting)
 * @returns An initialized Appwrite client instance
 * @throws Will throw an error if required options are missing
 */
export function provideAppwriteClient(
  options: AppwriteClientOptions | AppwriteProjectOptions,
  driverName: string
) {
  let client: AppwriteClient;

  if ("client" in options) {
    if (!options.client) {
      throw createRequiredError(driverName, "client");
    }

    client = options.client;
  } else {
    if (!options.endpoint) {
      throw createRequiredError(driverName, "endpoint");
    }
    if (!options.projectId) {
      throw createRequiredError(driverName, "project");
    }

    client = new AppwriteClient()
      .setEndpoint(options.endpoint.toString())
      .setProject(options.projectId);

    if (options.apiKey) {
      client.setKey(options.apiKey);
    }
  }

  return client;
}
