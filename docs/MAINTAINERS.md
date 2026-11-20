# Maintainer handover

Each year one person is responsible for SimTech Playground. This page is the handover: what runs where, what to check regularly, and how to review contributions. Keep it up to date for your successor.

## Handover checklist

- [ ] New maintainer has admin (or at least maintain) access to the GitHub repository
- [ ] Walk through this page together, then deploy once (see below) to make sure it works
- [ ] Update the "Current maintainer" line below
- [ ] Look at open issues, open pull requests and `docs/FINETUNING.md` together

**Current maintainer:** _name, year_ (update on handover)

## How the site is built and deployed

- The site is fully static: no server, no database, no accounts, no tracking.
- **Every push to `main`** runs [.github/workflows/deploy.yml](../.github/workflows/deploy.yml): `npm ci` → `npm run check` → `npm run build` → upload `dist/` → deploy to GitHub Pages.
- **Pull requests** run [.github/workflows/ci.yml](../.github/workflows/ci.yml): the same checks and build, without deploying.
- Live URL: https://prokopk.github.io/SimTechPlayground/
- One-time repository setting (already done): **Settings → Pages → Source: GitHub Actions**. If deployments fail with "Ensure GitHub Pages has been enabled", check this first.

To redeploy without a code change: **Actions → Deploy to GitHub Pages → Run workflow**.

### Moving to another address

The output in `dist/` is a plain static folder that works on any web server.

- The base path is set in [vite.config.ts](../vite.config.ts) and defaults to `/SimTechPlayground/` (the GitHub Pages project path). For a custom domain or a server root, build with `BASE_PATH=/ npm run build`; for a subfolder, `BASE_PATH=/some/folder/ npm run build`. In the workflow, set it as an `env:` on the build step.
- If the repository is renamed, update the default in `vite.config.ts`, the live URL in this file and in `README.md`.
- Routing uses the URL hash (`#/sim/ising`), so no server configuration (rewrites) is needed.

### Placeholders still to fill in

- Program website link: `PROGRAM_URL` in [src/config.ts](../src/config.ts).
- Branding (colors, logo): colors are CSS variables at the top of [src/styles/main.css](../src/styles/main.css). Ask before using a university logo.

## Reviewing a new simulation

CI already checks types, required files, metadata, the parameter definitions, and runs the simulation headless (no exceptions, finite metrics). What a human still needs to check:

1. **Open the PR locally** (`gh pr checkout <number>` or fetch the branch), `npm run dev`, open the simulation.
2. **First impression**: does it start by itself and look interesting within a few seconds? Would a high school student understand what to do?
3. **Interaction**: all controls have a visible effect; try mouse and touch (devtools device mode), fullscreen, phone width.
4. **Performance**: `npm run check` prints the CPU time per second at speed ×1. Well above ~300 ms on a fast laptop is a warning sign for phones. Ask for a `mobileValue` with a smaller grid or fewer particles.
5. **Explanation text**: German, short, friendly, formulas render, a section about the connection to the program.
6. **Code**: readable for the next student, English comments, no allocations in `step`, no DOM or canvas access in `step`.
7. **Thumbnail** looks good as a tile and is small (≤ 50 KB).

Use the checklist in [CONTRIBUTING.md](../CONTRIBUTING.md#10-checklist-before-opening-a-pull-request) as the review template. Prefer merging and improving in a follow-up over letting a PR sit for months.

## Updating dependencies

Do this about once per semester, on a branch, and only when nothing important (a fair) is coming up in the next days.

```bash
npm outdated                 # what's new
npm update                   # minor/patch updates within the allowed ranges
npm install <pkg>@latest     # a major update, one package at a time
npm run check && npm run build && npm run dev   # then click through all simulations
```

| Package | Used for | Watch out for |
|---|---|---|
| `vite` | dev server, build, discovering simulations (`import.meta.glob`) | glob syntax changes in major versions ([src/registry.ts](../src/registry.ts)) |
| `typescript` | `tsc --noEmit` type check | stricter checks can flag JS simulations with `// @ts-check` |
| `lil-gui` | controls | CSS class names (`lil-*`) are themed in `main.css` |
| `marked`, `katex` | explanation texts | the math extension in [src/ui/info.ts](../src/ui/info.ts) |
| `three` (+ `@types/three`) | 3D simulations | API changes in `OrbitControls` or `BufferGeometry`; test Lorenz |

GitHub Actions versions (`actions/checkout@v…` etc. in `.github/workflows/`) also need a bump every year or two; GitHub shows deprecation warnings in the workflow runs.

## Where things live

| What | Where |
|---|---|
| Simulation contract (all fields, documented) | [src/types/index.ts](../src/types/index.ts) |
| Discovering simulations | [src/registry.ts](../src/registry.ts) |
| Animation loop (fixed time step, frame-rate independent) | [src/runner/loop.ts](../src/runner/loop.ts), [src/runner/runner.ts](../src/runner/runner.ts) |
| 2D canvas scaling, pointer input, 3D view | [src/runner/](../src/runner/) |
| Pages and UI parts | [src/ui/](../src/ui/) |
| UI strings and topic tags | [src/i18n/de.json](../src/i18n/de.json), [src/i18n/en.json](../src/i18n/en.json) |
| Validation and smoke test | [scripts/check-sims.js](../scripts/check-sims.js) |
| Implementation history and decisions | [docs/PLAN.md](PLAN.md) |
| Ideas and polish not yet done | [docs/FINETUNING.md](FINETUNING.md), [ideas.md](../ideas.md) |

## Before a fair or open day

- [ ] Open the live site on the booth laptop, the projector setup and a phone; click through all simulations
- [ ] Fullscreen mode works on the projector; set the browser zoom so the controls are readable
- [ ] The language follows the browser language (English browsers get English UI); click DE/EN once on each booth device, the choice is remembered
- [ ] Have a fallback without internet: `npm run build && npm run preview` on the laptop serves the site locally
- [ ] QR code to the live URL on the booth material
