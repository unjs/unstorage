// Source: https://github.com/h3js/h3/blob/main/src/utils/internal/path.ts

export function joinURL(
  base: string | undefined,
  path: string | undefined
): string {
  if (!base || base === "/") {
    return path || "/";
  }
  if (!path || path === "/") {
    return base || "/";
  }

  const baseHasTrailing = base[base.length - 1] === "/";
  const pathHasLeading = path[0] === "/";
  if (baseHasTrailing && pathHasLeading) {
    return base + path.slice(1);
  }
  if (!baseHasTrailing && !pathHasLeading) {
    return base + "/" + path;
  }
  return base + path;
}

export function withTrailingSlash(path: string | undefined): string {
  if (!path || path === "/") {
    return "/";
  }
  return path[path.length - 1] === "/" ? path : `${path}/`;
}
