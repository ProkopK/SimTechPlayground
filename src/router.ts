/**
 * Hash routing (`#/`, `#/sim/<id>`) works on GitHub Pages without server configuration.
 */
export type Route = { page: "home" } | { page: "sim"; id: string };

export function parseRoute(hash: string): Route {
  const match = hash.match(/^#\/sim\/([\w-]+)/);
  return match ? { page: "sim", id: match[1] } : { page: "home" };
}

export function simHref(id: string): string {
  return `#/sim/${id}`;
}
