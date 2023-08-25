import { defineDriver } from "./utils";

export interface CloudflareDOOptions {
  base?: string;
}

export class UnstorageDurableObject {
  state: DurableObjectState

  constructor(state: DurableObjectState, env) {
    this.state = state;
  }

  async fetch(request: Request) {

  }
}

const DRIVER_NAME = "cloudflare-durable-objects";

export default defineDriver((opts: CloudflareDOOptions) => {
	const id = UNSTORAGE_DURABLE_OBJECT.idFromName(opts.base || 'unstorage');
	const stub = env.EXAMPLE_CLASS.get(id);

	return {
		name: DRIVER_NAME,
		options,
		async hasItem(key, _opts) { },
		async getItem(key, _opts) { 
			let resp = await stub.fetch(request);
			let item = await resp.text();
			
			return item;
		},
		async setItem(key, value, _opts) { },
		async removeItem(key, _opts) { },
		async getKeys(base, _opts) { },
		async clear(base, _opts) { },
	}

})