# Fine-tuning

Things noticed during the work that are not part of the proof of concept. Add items here instead of implementing them right away.

## From the project brief

- [ ] Dark/light mode (toggle + `prefers-color-scheme`)
- [ ] Design polish, branding (colors, logo only after asking)
- [ ] English explanation texts for all simulations
- [ ] Topic filter on the landing page
- [ ] "Booth mode": when idle, the projector cycles through simulations automatically (attract loop), returning on touch
- [ ] QR code to the site shown in fullscreen mode
- [ ] Automatically generated thumbnails (optional)
- [ ] WebGL acceleration for the flow simulation if the CPU version is too slow on phones
- [ ] More simulations from `ideas.md`

## Noticed during planning

- [ ] Chart/histogram support for simulations (e.g. velocity distribution, radial distribution function for Lennard-Jones); scalar metrics only cover sparklines
- [ ] `src/lib` neighbor/cell-list helper (Lennard-Jones, swarms with many particles)
- [ ] `src/lib` small linear solver (structural mechanics, truss builder)
- [ ] Optional Web Worker for heavy `step` functions (hydrogen sampling, electronic structure)
- [ ] Optional 3D picking (`onPointer3d`) if a 3D simulation needs interaction beyond orbit/zoom

## Noticed during Phase 1

- [ ] Crash overlay text is not re-translated on a language switch (it is created once)
- [ ] Preset dropdown shows "–" again after a language switch (controls are rebuilt)
- [ ] Explanation text on desktop is only visible by scrolling the side panel; consider a collapsible controls panel or tabs
