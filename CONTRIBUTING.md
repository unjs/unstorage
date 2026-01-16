# Contribution Guide

<!-- https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors -->

> All contributors lead the growth of Unstorage - including you!

## Discussions

You can involve in discussions using:

- [GitHub Discussions](https://github.com/unjs/unstorage/discussions)

## Contribute to the Code

> [!IMPORTANT]
> Please discuss your ideas with the maintainers before opening a pull request.

### Local Development

- Clone the [`unjs/unstorage`](https://github.com/unjs/unstorage) git repository.
- Install the latest LTS version of [Node.js](https://nodejs.org/en/) (v22+).
- Enable [corepack](https://github.com/nodejs/corepack) using `corepack enable` (run `npm i -g corepack` if it's not available).
- Install dependencies using `pnpm install`.
- Run the generation script after creating a new driver using `pnpm generate`.
- Build the project using `pnpm build`.
- Add, modify, and run tests using `pnpm test`.

## Reporting Issues

You might encounter a bug while using Unstorage.

Although we aim to resolve all known issues, new bugs can emerge over time. Your bug report helps us find and fix them faster — even if you're unable to fix the underlying code yourself.

Here’s how to report a bug effectively:

### Ensure It's a Bug

Sometimes what seems like a bug may actually be expected behavior or a missing feature. Make sure you’re reporting an actual bug by creating a minimal unstorage project and reducing scope.

### Create a Minimal Reproduction

Please create a minimal reproduction using the starter templates or a simple repository.

Sometimes, bugs originate from another layer — not Unstorage itself. A minimal reproduction helps identify the source and speeds up debugging.

If your bug involves a higher-level framework, please report it there. Maintainers will help narrow it down to an Unstorage-level issue if needed.

### Search Existing Issues and Discussions

Before creating a new issue, search existing [issues](https://github.com/unjs/unstorage/issues) and [discussions](https://github.com/unjs/unstorage/discussions) to see if your bug has already been reported.

If it has already been reported:

- Add a 👍 reaction to the original post (instead of commenting "me too" or "when will it be fixed").
- If you can provide additional context or a better/smaller reproduction, please share it.

> [!NOTE]
> If the issue seems related but different or old or already closed, it's **better to open a new issue**. Maintainers will merge similar issues if needed.

## Contributing: Developing Drivers for Unstorage

This guide explains how to develop a custom driver for `unstorage`, including naming conventions, typing options, and best practices. For a practical example, see the [`deno-kv` driver](https://github.com/unjs/unstorage/blob/main/src/drivers/deno-kv.ts).

## 1. Naming Your Driver and Options

- **Driver file:** Use a clear, kebab-case name (e.g., `my-custom-driver.ts`).
- **Options interface:** Name it as `MyCustomOptions` (PascalCase, ends with `Options`).
- **Driver interface:** Name it as `MyCustomDriver` (PascalCase, ends with `Driver`).
- **Driver name constant:** It is recommended to use a `DRIVER_NAME` constant as the driver name in the implementation and should match the pattern in [`src/drivers`](https://github.com/unjs/unstorage/tree/main/src/drivers) (see e.g. `deno-kv.ts`, `fs.ts`, `redis.ts`). The file name should match the `DRIVER_NAME` constant.
- **File name transformation:** The file name is used to determine how to access the driver's options in the global options types. Internally, a transformation (is applied to the file name for type access. For example, `deno-kv` becomes `denoKV`, so you would access options as `opts.denoKV`.

## 2. Typing Driver Options

Define an options interface for your driver. This describes the configuration users can pass when initializing the driver.

```ts
// my-custom-driver.ts
export interface MyCustomOptions {
  path: string;
  ttl?: number;
}
```

## 3. Typing Driver Methods

Define a driver interface with the suffix `Driver`. This interface should have the following properties:

- `getOptions`: Type for options passed to `getItem`.
- `setOptions`: Type for options passed to `setItem`.
- `removeOptions`: Type for options passed to `removeItem`.
- `listOptions`: Type for options passed to `getKeys`.
- `clearOptions`: Type for options passed to `clear` (if your driver supports it).

Example:

```ts
export interface MyCustomDriver {
  getOptions: { raw?: boolean };
  setOptions: { foo?: string };
  removeOptions: {};
  listOptions: { prefix?: string };
  clearOptions: { deep?: boolean };
}
```

## 4. Implementing the Driver

Use the `defineDriver` helper, passing your options and driver types:

```ts
import { defineDriver } from "unstorage";
import type { MyCustomOptions, MyCustomDriver } from "./my-custom-driver";
import type {
  GetOptions,
  SetOptions,
  RemoveOptions,
  ListOptions,
  ClearOptions,
} from "../types";

const DRIVER_NAME = "my-custom-driver";

export default defineDriver<MyCustomOptions, unknown, MyCustomDriver>(
  (options) => {
    return {
      name: DRIVER_NAME,
      async getItem(key, opts: GetOptions) {
        // Get the raw option
        const raw = opts?.["my-custom-driver"]?.raw;
        /** Implementation */
      },
      async setItem(key, value, opts: SetOptions) {
        /** Implementation */
      },
      async removeItem(key, opts: RemoveOptions) {
        /** Implementation */
      },
      async getKeys(base, opts: ListOptions) {
        /** Implementation */
      },
      async clear(base, opts: ClearOptions) {
        /** Implementation */
      },
      // ...other methods...
    };
  }
);
```

Take a look at the [deno driver](https://github.com/unjs/unstorage/blob/main/src/drivers/deno-kv.ts) for a complete implementation example with typed options.

## 5. Generating and Using Types Globally

After defining your driver and its types:

1. **Run the code generation script:**

   ```sh
   pnpm gen-drivers
   ```

   This will update the generated types so your driver's options are available inside the `GetOptions`, `SetOptions`, `RemoveOptions`, and `ListOptions` types.

2. **Use the generated types** in your code:

   ```ts
   import type { SetOptions } from "unstorage";

   defineDriver((options) => {
     return {
       async setItem(key, value, opts: SetOptions) {
         // opts is typed for your driver
       },
     };
   });
   ```

Some important notes:

- Always use the `Driver` and `Options` suffixes for your types.
- Document your options and method behaviors.
- Document if your driver supports the [common options](https://github.com/unjs/unstorage/blob/src/types.ts#L27)
