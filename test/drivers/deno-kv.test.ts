import { fileURLToPath } from "node:url";
import { exec, execSync, type ChildProcess } from "node:child_process";
import { describe, beforeAll, afterAll } from "vitest";
import { getRandomPort, waitForPort } from "get-port-please";
import httpDriver from "../../src/drivers/http.ts";
import { testDriver } from "./utils";

let hasDeno: boolean;
// prettier-ignore
try { execSync("deno --version"); hasDeno = true } catch { hasDeno = false; }

describe.skipIf(!hasDeno)("drivers: deno-kv", async () => {
  let denoProcess: ChildProcess;
  const randomPort = await getRandomPort();

  beforeAll(async () => {
    const fixtureFile = fileURLToPath(
      new URL("deno-kv.fixture.ts", import.meta.url)
    );
    console.log(process.env);
    denoProcess = exec(
      `deno run --unstable-kv --unstable-sloppy-imports -A ${fixtureFile}`,
      {
        env: {
          ...process.env,
          PORT: randomPort.toString(),
        },
      }
    );
    await waitForPort(randomPort, { host: "0.0.0.0" });
  });

  afterAll(() => {
    denoProcess.kill(9);
  });

  testDriver({
    driver: httpDriver({
      base: `http://localhost:${randomPort}`,
    }),
  });
});
