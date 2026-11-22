# Simulation ideas

Ideas for new simulations. If you want to implement one follow the instructions in [CONTRIBUTING.md](../CONTRIBUTING.md) and delete the entry here when merging.

Entry format: bold title, a few sentences on what visitors see and do, optional notes on what the shell or `src/lib` still lacks, optional "Done when" criteria.

## Particles and molecular dynamics

- **Lennard-Jones particles**: atoms that attract and repel each other; switch between ensembles (NVE, NVT), control a thermostat, watch gas, liquid and solid form, and measure observables live (temperature, pressure, energy).
  - Notes: needs a cell-list neighbor helper in `src/lib` for N > ~500 (see [todos.md](todos.md#srclib)). Velocity histogram or radial distribution function need chart support; until then the sim can draw them on its own canvas.

- **Swarm behavior**: flocking (boids) that emerges from three simple local rules: separation, alignment, cohesion. Sliders for the rule weights, the pointer as a predator or food source.
  - Notes: the cell-list neighbor helper is useful here too.

## Fluids and heat

- **Convection**: a fluid heated from below; rising plumes and Rayleigh–Bénard cells form. Extends the idea of [heat](../simulations/heat/) with flow.

- **Turbulence**: watch order break down into eddies and vortices as the Reynolds number rises.
  - Notes: a useful resolution probably needs the WebGL path (see [todos.md](todos.md#flow)).

## Structures

- **Structural mechanics**: visualize stress and deformation of a beam or plate under load; drag the load around.
  - Notes: needs a small linear solver (dense Cholesky or CG) in `src/lib`.

- **Truss builder**: design your own bridge from nodes and beams, put a load on it and test it to failure.
  - Notes: tool modes (place node / beam / load) via a `select` param plus `onPointer`; "test to failure" = steps of increasing load. Same linear solver as above.

## Quantum and electronic structure

- **Electronic structure**: how electrons arrange themselves in atoms and molecules.
  - Notes: one `step` could be one SCF iteration. Possibly heavy, so a Web Worker might be needed (see [todos.md](todos.md#shell-and-runner)).

## Machine learning

- **Neural network classifier**: watch a small network learn to separate two classes in real time; click to add data points.
  - Notes: `step` = one training iteration, the decision boundary is drawn with the grid renderer, `onPointer` adds data points.
