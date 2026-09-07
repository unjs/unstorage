// Ambient type declarations for the optional `react-native-mmkv` peer library
// (https://github.com/mrousavy/react-native-mmkv).
//
// The package is intentionally NOT installed as a devDependency: it only ships
// native modules, and its type declarations (via `react-native-nitro-modules`)
// inject React Native globals that pollute the compiler environment. These
// declarations mirror the public v4 API so `import("react-native-mmkv")`
// resolves during type-checking. The real library is loaded dynamically at
// runtime through the driver's `lib` option / `DRIVER_DEPENDENCIES`.
declare module "react-native-mmkv" {
  export interface Configuration {
    /**
     * The MMKV instance's ID. Defaults to `"mmkv.default"`.
     */
    id: string;
    /**
     * Custom root path for the storage file.
     */
    path?: string;
    /**
     * Optional encryption key. Max 16 bytes with `AES-128` (default), 32 bytes
     * with `AES-256`.
     */
    encryptionKey?: string;
    /**
     * Encryption algorithm. Defaults to `AES-128`.
     */
    encryptionType?: "AES-128" | "AES-256";
    /**
     * Processing mode. Defaults to `single-process`.
     */
    mode?: "single-process" | "multi-process";
    /**
     * Read-only mode. Defaults to `false`.
     */
    readOnly?: boolean;
    /**
     * Skip the file write when the stored value is unchanged.
     */
    compareBeforeSet?: boolean;
    /**
     * How to handle recoverable storage errors.
     */
    recoveryStrategy?: "discard-on-error" | "recover-on-error";
  }

  export interface MMKV {
    contains(key: string): boolean;
    getString(key: string): string | undefined;
    set(key: string, value: boolean | string | number | ArrayBuffer): void;
    remove(key: string): boolean;
    getAllKeys(): string[];
    clearAll(): void;
    addOnValueChangedListener(
      onValueChanged: (key: string) => void,
    ): { remove(): void };
  }

  export function createMMKV(config?: Configuration): MMKV;
}