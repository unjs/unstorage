import type { Driver, AsyncDriverFactory } from "../types";

export function coerceQuery(query: Record<string, string | string[]>) {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]: [string, string | string[]]) => {
      return [key, coerceValue(value)];
    })
  );
}

function coerceValue(value: string | string[]): any {
  if (Array.isArray(value)) return value.map((v) => coerceValue(v));
  else if (["true", "false"].includes(value.toLowerCase()))
    return Boolean(value);
  else if (value != "" && !Number.isNaN(Number(value))) return Number(value);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function factoryLoader<OptionsT, InstanceT>(
  loader: () => any
): AsyncDriverFactory<OptionsT, InstanceT> {
  async function dynamicFactory(
    options: OptionsT
  ): Promise<Driver<OptionsT, InstanceT>> {
    const factory = (await loader()).default;
    return factory(options);
  }
  return dynamicFactory;
}
