import { parseQuery } from "ufo";
import { createError } from "../drivers/utils";
import { coerceQuery } from "./_utils";
import type { Driver, DriverFactory, AsyncDriverFactory } from "../types";

const RE = /^(?<scheme>[^:]+):(?<base>[^?]*)?(\?(?<query>.*))?$/;

export async function loadFromUrl(
  url: string,
  factories: Record<
    string,
    DriverFactory<any, any> | AsyncDriverFactory<any, any>
  >
): Promise<Driver<any, any>> {
  const match = url.match(RE);
  if (!match?.groups) throw createError("load-from-url", `invalid url ${url}`);

  const { scheme, base, query } = match.groups as {
    scheme: string;
    base?: string;
    query?: string;
  };

  const factory = factories[scheme];
  if (!factory)
    throw createError(
      "load-from-url",
      `no driver handle scheme for url ${url}`
    );

  const opts = {
    base,
    scheme,
    ...coerceQuery(parseQuery(query)),
  };

  return await factory(opts);
}
