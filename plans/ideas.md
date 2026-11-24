# Simulation ideas

Ideas for new simulations. If you want to implement one follow the instructions in [CONTRIBUTING.md](../CONTRIBUTING.md) and delete the entry here when merging.

Entry format: bold title, a few sentences on what visitors see and do, optional notes on what the shell or `src/lib` still lacks, optional "Done when" criteria.

## Particles

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

- **Bloch waves**: visualize the band structure of a crystal and how it changes with lattice spacing or atomic species.

## Machine learning

- **Neural network classifier**: watch a small network learn to separate two classes in real time; click to add data points.
  - Notes: `step` = one training iteration, the decision boundary is drawn with the grid renderer, `onPointer` adds data points.

## Mathematics

- **Mandelbrot set**: explore the Mandelbrot set with a zoomable view; color by iteration count.

- **Interpolation**: watch how different interpolation methods (linear, cubic, spline) approximate a function from a few sample points; click to add sample points.

- **Cellular automata**: explore different rules and patterns in 2D cellular automata, like Conway's Game of Life.

## Systems and control

- **Double pendulum**: a chaotic system that shows sensitive dependence on initial conditions; drag the pendulum to set the initial state.

## Computer Science

- **Sorting algorithms**: visualize different sorting algorithms (bubble sort, quicksort, mergesort) on an array of numbers; watch the process step by step.

## Traffic

- **Ghost jam**: a line of cars that slows down and speeds up without any apparent reason. The simulation shows how small perturbations can lead to traffic jams.

- **Traffic light**: a traffic light that controls the flow of cars on a road. Add more lanes, change timings, add more intersections, and pedestrians ... or change it to a roundabout. The simulation shows how the timing of the light affects the flow of traffic.
