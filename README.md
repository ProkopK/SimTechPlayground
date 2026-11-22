# SimTech Playground

Interactive simulations from the **Simulation Technology** degree program, running live in the browser. Change a parameter, click or tap into the simulation, and watch what happens over time.

**Live:** https://prokopk.github.io/SimTechPlayground/

It is used at fairs and open days (a projector shows a running simulation, visitors try things on laptops and phones) and stays online as a permanent website. The audience is high school students, so the website content is **German first**, with English as a second language.

## Quick start

Requires [Node.js](https://nodejs.org/) 22 or newer.

```bash
npm install
npm run dev      # local site at http://localhost:5173/SimTechPlayground/
npm run check    # typecheck + validate and smoke-test all simulations
npm run build    # static site in dist/
```

## Add your own simulation

A simulation is just a folder: copy `simulations/_template/`, write the physics and the drawing, add a German explanation text and a thumbnail. It appears on the landing page automatically. See **[CONTRIBUTING.md](CONTRIBUTING.md)**.

## Project structure

```
simulations/        one folder per simulation (sim.js|ts, meta.json, info.de.md, thumbnail.webp)
  _template/        copy this to start a new simulation
src/                the shell (TypeScript): everything simulations share
  types/            the simulation contract (also gives JS simulations autocompletion)
  runner/           animation loop, 2D canvas, Three.js setup, pointer input
  ui/               landing page, simulation page, controls, metrics, explanation text
  lib/              helpers for simulations: colormaps, grid drawing, RNG, ODE integrators, trails
  i18n/             UI strings (de.json, en.json)
  styles/           CSS with design tokens (CSS variables)
scripts/check-sims.js   validation and headless smoke test (npm run check)
plans/              ideas.md (simulation ideas), todos.md (open work): pick an entry and go
docs/               MAINTAINERS.md (yearly handover)
```

## Technology

A static site without a backend: TypeScript shell, simulations in plain JavaScript or TypeScript, [Vite](https://vite.dev/), [lil-gui](https://lil-gui.georgealways.com/) for controls, [KaTeX](https://katex.org/) and [marked](https://marked.js.org/) for explanation texts, [Three.js](https://threejs.org/) for 3D. No UI framework. Deployed to GitHub Pages by GitHub Actions on every push to `main`.

## License

[MIT](LICENSE)
