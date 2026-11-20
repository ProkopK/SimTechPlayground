# CLAUDE.md

Conventions for AI coding assistants working on SimTech Playground. Humans: see [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/MAINTAINERS.md](docs/MAINTAINERS.md).

## What this is

A static website (no backend) with small interactive simulations from the Simulation Technology degree program, for high school students at fairs and online. Every simulation runs live in the browser and reacts immediately to sliders and mouse/touch input. Performance and clarity beat physical accuracy.

## Languages

- **English**: code, identifiers, comments, commit messages, PRs, issues, and all docs (`docs/*.md`, README, CONTRIBUTING, this file).
- **German first** for website content: UI strings, simulation titles, descriptions, parameter labels, explanation texts (`info.de.md` is required, `info.en.md` optional). Every user-facing `Text` is `{ de: "...", en: "..." }` or a language-neutral string. Missing English must fall back to German, never error.

## Architecture (decided; don't reopen without a real blocker)

- Vite + TypeScript shell in `src/`, no UI framework. Simulations in `simulations/<id>/` as `sim.js` (with `// @ts-check`) or `sim.ts`.
- The contract is [src/types/index.ts](src/types/index.ts). A simulation is a plain object: `init`, `step` (physics only, no DOM/canvas/WebGL), `draw` (2D) or `setup3d`/`update3d` (3D), optional `params`, `presets`, `metrics`, `onPointer`.
- Simulations are discovered via `import.meta.glob` in [src/registry.ts](src/registry.ts); metadata is eager, simulation code is lazy. The landing page must not load simulation code, KaTeX or Three.js.
- Time: fixed `dt`, `stepsPerSecond × speed` steps per real second, independent of the frame rate ([src/runner/loop.ts](src/runner/loop.ts)).
- Dependencies: vite, typescript, lil-gui, marked, katex, three. Add others only with a good reason.
- Hash routing (`#/sim/<id>`), GitHub Pages via GitHub Actions.

## Writing a simulation

- Start from [simulations/_template/](simulations/_template/); [simulations/ising/](simulations/ising/) (grid), [gravity/](simulations/gravity/) (particles), [flow/](simulations/flow/) (CFD, drawing obstacles) and [lorenz/](simulations/lorenz/) (3D) are the reference examples. They are role models: readable, commented in English.
- Typed arrays, no allocations in `step`/`draw`, expensive metrics computed in `step`. Use `mobileValue` for lighter defaults on phones.
- Reuse [src/lib](src/lib/) (grid renderer, colormaps, RNG, RK4/Euler/velocity Verlet, trails) instead of writing your own.
- Explanation texts: German, "du"-form, for high school students, few well-chosen formulas (`$…$`, `$$…$$`), sections as in the existing simulations, ending with the connection to the program.
- Every simulation needs `meta.json`, `info.de.md` and a `thumbnail.webp` (press T in `npm run dev`).

## Way of working

- **Plan in the repo**: [docs/PLAN.md](docs/PLAN.md). Keep it current: check off steps, justify plan changes in its "Plan changes" section.
- **Small steps, one commit each**, with a meaningful English message. Each commit builds and passes `npm run check`.
- **Important things first, polish later.** Anything noticed that isn't part of the current task goes into [docs/FINETUNING.md](docs/FINETUNING.md) instead of being implemented right away.
- **Ask instead of assuming** when something is unclear or would break the "keep it simple" frame.
- Verify in the browser: Chrome and Firefox, desktop and phone view (touch emulation), clean console.

## Commands

```bash
npm run dev     # dev server
npm run check   # tsc --noEmit + scripts/check-sims.js (validation, headless smoke test)
npm run build   # static site in dist/
```
