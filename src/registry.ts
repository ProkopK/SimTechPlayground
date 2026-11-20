/**
 * Finds all simulations automatically: every folder in `simulations/` (except those
 * starting with `_`, like the template) with a `meta.json` is a simulation.
 *
 * Only metadata and thumbnail URLs are bundled eagerly, so the landing page loads no
 * simulation code. The simulation module and its explanation text are loaded on demand.
 */
import type { Lang } from "./i18n";
import type { SimMeta, Simulation } from "./types";

const EXCLUDE = "!/simulations/_*/**";

const metas = import.meta.glob<SimMeta>(["/simulations/*/meta.json", EXCLUDE], {
  eager: true,
  import: "default",
});
const thumbnails = import.meta.glob<string>(["/simulations/*/thumbnail.{webp,png}", EXCLUDE], {
  eager: true,
  query: "?url",
  import: "default",
});
const modules = import.meta.glob<Simulation>(["/simulations/*/sim.{js,ts}", EXCLUDE], {
  import: "default",
});
const infos = import.meta.glob<string>(["/simulations/*/info.*.md", EXCLUDE], {
  query: "?raw",
  import: "default",
});

export interface SimEntry {
  id: string;
  meta: SimMeta;
  thumbnail?: string;
  loadSim(): Promise<Simulation>;
  /** Explanation text in the given language, falling back to German. */
  loadInfo(lang: Lang): Promise<string>;
}

/** "/simulations/ising/meta.json" → "ising" */
const folderOf = (path: string) => path.split("/")[2];

function findByFolder<T>(record: Record<string, T>, id: string): T | undefined {
  const key = Object.keys(record).find((p) => folderOf(p) === id);
  return key ? record[key] : undefined;
}

export const simulations: SimEntry[] = Object.entries(metas)
  .map(([path, meta]): SimEntry | undefined => {
    const id = folderOf(path);
    const loadSim = findByFolder(modules, id);
    if (!loadSim) return undefined; // meta.json without sim file: ignore (check-sims reports it)
    return {
      id,
      meta,
      thumbnail: findByFolder(thumbnails, id),
      loadSim,
      async loadInfo(lang) {
        const load = infos[`/simulations/${id}/info.${lang}.md`] ?? infos[`/simulations/${id}/info.de.md`];
        return load ? load() : "";
      },
    };
  })
  .filter((e): e is SimEntry => e !== undefined)
  .sort((a, b) => (a.meta.order ?? 100) - (b.meta.order ?? 100) || a.id.localeCompare(b.id));

export function getSimulation(id: string): SimEntry | undefined {
  return simulations.find((s) => s.id === id);
}
