import { describe, it, expect, vi } from "vitest";
import { execa, execaCommandSync } from "execa";
import { readFile, mkdir, writeFile } from "fs/promises";
import crypto from "crypto"

const hasDeno =
  execaCommandSync("deno --version", { stdio: "ignore", reject: false })
    .exitCode === 0;

try{
  await mkdir("./tmp") // Make tmp dir
} catch(_e) {} // Dir exists

describe.runIf(hasDeno)("drivers: deno-kv", async () => {
  const driverModuleCode = (await readFile("./src/drivers/deno-kv.ts")).toString().replace(/(?<=from ")\.\/utils\/.*?(?=")/g, str => {
    return "../src/drivers/"+str+".ts"
  });
  await writeFile("./tmp/deno-kv-for-deno.ts", driverModuleCode);

  const driverInitCode = `
  import driver from './tmp/deno-kv-for-deno.ts';
  import { createStorage } from "npm:unstorage";
  const storage = createStorage({
    driver: driver({}),
  });
  `;
  it("can set and get items", async ()=>{
    const key = crypto.randomUUID(); // Create random key
    const value = crypto.randomUUID(); // Create random value

    const code = `${driverInitCode}
    await storage.setItem("${key}","${value}");
    console.log(await storage.getItem("${key}"));
    `;
    expect((await execa("deno", [
      "eval",

      code,
      "--unstable", // If Deno use Kv, we must give "--unstable" flag to Deno.
    ])).stdout).toBe(value)
  }, 100000);
})