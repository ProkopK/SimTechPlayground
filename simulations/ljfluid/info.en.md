Many phenomena we observe in a fluid (i.e., a gas or liquid) already appear in this simple model.
We are modelling a fluid as a collection of circular molecules with diameter $\sigma$ in a box.
Every point in the simulation represents such a molecule.
The molecules interact exclusively via the so-called [Lennard-Jones potential](https://en.wikipedia.org/wiki/Lennard-Jones_potential) 
$$
V_\text{LJ}(r) = 4\varepsilon \left[\left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^{6}\right],
$$
where $r$ is the distance between two molecules.
The material parameter $\varepsilon$ describes the interaction strength.
With this potential, two close molecules attract until they collide, at which point they bounce off each other (for $r < \sigma$).
Additionally, the simulation contains a stochastic temperature control, a so-called [Langevin thermostat](https://en.wikipedia.org/wiki/Langevin_dynamics#Langevin_thermostat).

## How can we describe this system physically?

We enumerate the molecules from $1$ to $N$ and denote by $\mathbf{r}_i$ the position of the $i$-th molecule.
At any point in time, there exists an interaction between any two particles.
The amount of force exerted by particle $j$ onto particle $i$ is given by the derivative
$$
F_{i, j} = -\frac{\mathrm{d}}{\mathrm{d}r} V_\text{LJ}(r_{ij}) = 24\varepsilon\left[2\left(\frac{\sigma}{r}\right)^{13} - \left(\frac{\sigma}{r}\right)^{7}\right],
$$
where $r_{ij}$ is the distance between both particles.
Thus, every particle $j$ pulls particle $i$ in its direction with strength $F_{i, j}$.
If we denote the (vectorial) distance between $i$ and $j$ by $\mathbf{r}_{ij} = \mathbf{r}_j - \mathbf{r}_j$, all such forces sum to
$$
\mathbf{F}_i = \sum_{j=1}^N F_{i, j} \frac{\mathbf{r}_{ij}}{|\mathbf{r}_{ij}|}.
$$
By Newton's law (assuming that all particles have unit mass),
$$
\mathbf{F}_i = m_i \mathbf{a}_i = \frac{\mathrm{d}^2}{\mathrm{d}t^2} \mathbf{r}_i.
$$
This is an ordinary differential equation of second order, which we can integrate numerically.
For example, one simple algorithm would be an explicit Euler scheme: for a small time step $\Delta t$, we compute
 - the current forces $\mathbf{F}_i(t)$ (which depend on the positions of all particles) and, from those, the current accelerations $\mathbf{a}_i(t)$,
 - the updated velocities $\mathbf{v}_i(t + \Delta t) \coloneqq \mathbf{v}_i(t) + \Delta t \cdot \mathbf{a}_i(t)$,
 - and finally the updated positions $\mathbf{r}_i(t + \Delta t) \coloneqq \mathbf{r}_i(t) + \Delta t \cdot \mathbf{v}_i(t + \Delta t)$.

Then, we start over with the next time step.
If we know the initial condition of the system ($\mathbf{v}_i$ and $\mathbf{r}_i$ for all particles), we can compute the state of the system at any given time.
(In reality, the explicit Euler scheme is not very well suited for this use case, as it violates conservation of energy. Thus, this simulation uses a [BAOAB integrator](https://pubs.aip.org/aip/jcp/article/162/10/104108/3339186/Langevin-integration-for-isothermal-isobaric), an explanation of which is beyond the scope of this exposition.)

## How does the temperature come into play?

For this, we use a stochastic description, the so-called Langevin dynamics.
The idea behind this approach is the assumption that our molecules do not exist in a vacuum, but are dispersed in a solvent made up of small molecules such as water or air.
We further assume that this solvent has a constant temperature $T$ (this is called a heat bath).
Then, the small solvent molecules collide randomly with our large molecules.
The frequency and strength of these impacts depend on $T$.
Furthermore, we introduce a friction term describing the interaction of moving molecules with the solvent.
In the place of Newton's law, we thus use the Langevin equation
$$
m_i \mathbf{a}_i = \mathbf{F}_i - \gamma m_i \mathbf{v}_i + \sqrt{2\gamma m_i k_B T}\mathbf{R}_i
$$
with a coupling parameter $\gamma$ describing the frequency of collisions of particles with solvent molecules, the Boltzmann constant $k_B$ (we assume $k_B = 1$), and a random term $\mathbf{R}_i$.
If we integrate this equation numerically as above, this random term follows a normal distribution with expectation $0$ and standard deviation $\sqrt{\frac{2\gamma k_B T}{\Delta t}}$.
Since our system is now surrounded by a heat bath with temperature $T$, it will eventually take on approximately that temperature.
However, as this is a stochastic description, we can not expect it to reach precisely the temperature $T$.

## Where do the measurements come from?

In this model, we can measure most things that would be interesting for a real fluid.
As an example, we show the behaviour of temperature and pressure over time.
The (instantaneous) temperature is directly proportional to the kinetic energy per degree of freedom.
In a system with $N$ particles that may move in two spatial dimensions, it is given by
$$
T_\text{gemessen} = \frac{1}{k_B \cdot 2N} \sum_{i=1}^N m_i|\mathbf{v}_i|^2.
$$
Since we already know the velocities $\mathbf{v}$, this is straightforward to compute.
However, this temperature most likely does not match that of the heat bath, but fluctuates strongly.
Thus, we also compute a running average of the temperature over the last three time units of the simulation.
We compute the pressure similarly.

## What can we observe?

For different temperatures, the system takes on various states.
If the temperature is near zero, the molecules form hexagonal crystals.
This is a simulated solid.
For slightly higher temperatures, they form contiguous structures that no longer exhibit regular patterns and change shape even under small perturbations.
In reality, this would be a liquid.
At sufficiently large temperatures, single molecules break away from the complex, until eventually the entire liquid has "evaporated" to become a gas.
Thus, even in this simple model, we already observe different states of matter and transitions between them.

Furthermore, we can "experimentally" confirm the ideal gas law.
Theory predicts that in an ideal gas,
$$
PV = N k_B T,
$$
where $P$ is pressure, $V$ is volume (the simulation domain has size $100 \times 100$ units) and $N$, $k_B$, and $T$ are as above.
After the simulation has run for a while and has reached an equilibrium, this is in fact approximately the case, even though strictly speaking, a Lennard-Jones fluid is not an ideal gas.

## What else does this simulation do?

300 molecules in a box is a pretty small amount of gas.
In a real simulation that does not run in your browser, we can maybe reach a few million particles.
Compared to realistic numbers of particles (on the order of $\sim 10^{20}$ or more), even that is vanishingly small.
To model larger systems, we assume that the fluid behaves similarly across the entire domain.
Then, we partition the domain into many small cells and assume that approximately the same number of particles leave on one side as appear on the other.
This allows us to define periodic boundary conditions: If a particle leaves a cell, it "teleports" to the opposite boundary of the cell and continues with the same velocity.
This allows us to simulate larger amounts of gas, at least approximately.

Additionally, external forces may act on the fluid.
This may for example be gravitation or for certain types of fluids electric or magnetic fields.
In this simulation, you can exert a force pointing to or away from your cursor by clicking and holding.
(The physical-didactic value of this specific force is rather limited, but at least you can play molecule billiards 😉)