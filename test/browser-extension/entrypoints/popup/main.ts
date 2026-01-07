import { storage } from "@/lib/storage";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <div>
    <h3>unstorage web-extension-storage driver</h3>
    <input id="key" placeholder="key" value="test-key" />
    <input id="value" placeholder="value" value="hello world" />
    <button id="set">Set</button>
    <button id="get">Get</button>
    <button id="remove">Remove</button>
    <button id="keys">Get Keys</button>
    <button id="clear">Clear</button>
    <pre id="output"></pre>
  </div>
`;

const keyInput = document.querySelector<HTMLInputElement>("#key")!;
const valueInput = document.querySelector<HTMLInputElement>("#value")!;
const output = document.querySelector<HTMLPreElement>("#output")!;

const log = (msg: string) => {
  output.textContent = msg;
  console.log(msg);
};

document.querySelector("#set")!.addEventListener("click", async () => {
  await storage.setItem(keyInput.value, valueInput.value);
  log(`Set "${keyInput.value}" = "${valueInput.value}"`);
});

document.querySelector("#get")!.addEventListener("click", async () => {
  const val = await storage.getItem(keyInput.value);
  log(`Get "${keyInput.value}" = ${JSON.stringify(val)}`);
});

document.querySelector("#remove")!.addEventListener("click", async () => {
  await storage.removeItem(keyInput.value);
  log(`Removed "${keyInput.value}"`);
});

document.querySelector("#keys")!.addEventListener("click", async () => {
  const keys = await storage.getKeys();
  log(`Keys: ${JSON.stringify(keys)}`);
});

document.querySelector("#clear")!.addEventListener("click", async () => {
  await storage.clear();
  log("Cleared all");
});
