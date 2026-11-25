# Todos

Improvements to the website, the shell and existing simulations. When it is done, delete the entry in the same commit or PR. New simulations go into [ideas.md](ideas.md).

Entry format: bold title, a short description, optional `_claimed: <name>_`, optional "Done when" criteria (recommended for bigger items and for tasks handed to an AI agent).

## Landing page

- **Topic filter**: filter the tiles by tag.

## Language and translation

- **Preset dropdown after language switch**: it shows "–" again because the controls are rebuilt.

- **Crash overlay language**: the "Simulation abgestürzt" text is not re-translated on a language switch (it is created once).

- **English explanation texts**: `info.en.md` for all simulations.

## Fullscreen and booth

- **Booth mode**: when idle, the projector cycles through simulations automatically (attract loop) and returns on touch.

- **QR code in fullscreen**: show a QR code to the site in fullscreen mode.

## Design

- **Design polish and branding**: colors, typography; a logo only after asking.

## Existing simulations

### Flow

- **Check implementation, stability, and artifacts**: The simulation shows some artifacts. Find a solution for better stability or show the user that it is unstable.

- **Add pressure view**: visualize pressure in addition to velocity and vorticity.

## Metrics, charts and input parameters

- **Charts and histograms**: support for distribution plots (e.g. the velocity distribution or radial distribution function for Lennard-Jones); scalar metrics only cover sparklines.

- **Multiple lines in the chart**: the chart currently only supports one line; add support for multiple lines (e.g. for the Lennard-Jones energy components).

- **Chart legend**: add a legend to the chart (e.g. for the Lennard-Jones energy components).

- **Chart size**: the chart is currently fixed to 200px height; make it resizable or fill the available space.

- **Follow the specified simulation time**: the chart currently follows the wall clock time; change it to follow the simulation time (faster simulations produce more data points per second).

- **2D sliders**: support for 2D sliders (e.g. ising model like https://www.youtube.com/watch?v=itRV2jEtV8Q)

- **Constant slider length**: the slider length depends on the length of the label

## Shell and runner

- **Web Worker for heavy `step`s**: optionally run `step` off the main thread (hydrogen sampling, electronic structure). The strict step/draw split keeps this possible.

- **3D pointer input**: an `onPointer3d` with a ray, if a 3D simulation needs interaction beyond orbit/zoom (e.g. picking an orbital).

- **Reset button should not change the selected szenario**: keep the current scenario when resetting the simulation.

- **Warning when system is unstable**: e.g. when the Lennard-Jones simulation energy diverges, wind tunnel flow blocked / unstable

## src/lib

- **Neighbor/cell-list helper**: for Lennard-Jones and swarms with many particles.

- **Small linear solver**: dense Cholesky or CG, for structural mechanics and the truss builder.
