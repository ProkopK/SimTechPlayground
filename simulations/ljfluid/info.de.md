Viele Phänomene, die man in einem Fluid (also einem Gas oder einer Flüssigkeit) beobachten kann, entstehen schon in diesem einfachen Modell. Wir modellieren ein Fluid als eine Ansammlung von kreisförmigen Molekülen mit Durchmesser $\sigma$ in einer Box. Jeder der Punkte in der Simulation stellt ein solches Molekül dar. Die Moleküle wechselwirken ausschließlich anhand des sogenannten [Lennard-Jones-Potentials](https://en.wikipedia.org/wiki/Lennard-Jones_potential) 
$$
V_\text{LJ}(r) = 4\varepsilon \left[\left(\frac{\sigma}{r}\right)^{12} - \left(\frac{\sigma}{r}\right)^{6}\right],
$$
wobei $r$ der Abstand zweier Moleküle ist. Der Materialparameter $\varepsilon$ beschreibt die Stärke der Interaktion.
Mit diesem Potential ziehen sich Teilchen, die nahe beisammen sind, an, bis sie kollidieren und sich abstoßen (für $r < \sigma>$).
Zusätzlich enthält die Simulation eine stochastische Temperaturkontrolle, ein sogenanntes [Langevin-Thermostat](https://en.wikipedia.org/wiki/Langevin_dynamics#Langevin_thermostat).

## Wie lässt sich dieses System physikalisch beschreiben?

Wir nummerieren die Moleküle von $1$ bis $N$ und bezeichnen die Position des $i$-ten Moleküls mit $\mathbf{r}_i$. Zu jedem Zeitpunkt besteht eine Wechselwirkung von jedem Teilchen mit jedem anderen. Der Betrag der von Teilchen $j$ auf Teilchen $i$ wirkenden Kraft ist gegeben durch die Ableitung
$$
F_{i, j} = -\frac{\mathrm{d}}{\mathrm{d}r} V_\text{LJ}(r_{ij}) = 24\varepsilon\left[2\left(\frac{\sigma}{r}\right)^{13} - \left(\frac{\sigma}{r}\right)^{7}\right],
$$
wobei $r_{ij}$ die Distanz der beiden Teilchen ist. Teilchen $i$ wird also von jedem Teilchen $j$ mit $F_{ij}$ in dessen Richtung gezogen. Wenn wir mit $\mathbf{r}_{ij} = \mathbf{r}_j - \mathbf{r}_j$ den (vektoriellen) Abstand von $i$ zu $j$ bezeichnen, summieren sich alle diese Kräfte zu
$$
\mathbf{F}_i = \sum_{j=1}^N F_{i, j} \frac{\mathbf{r}_{ij}}{|\mathbf{r}_{ij}|}.
$$
Nach dem Newton'schen Kraftgesetz gilt (wir nehmen an, dass alle Teilchen die Masse $m_i = 1$ haben)
$$
\mathbf{F}_i = m_i \mathbf{a}_i = \frac{\mathrm{d}^2}{\mathrm{d}t^2} \mathbf{r}_i.
$$
Dies ist eine gewöhnliche Differenzialgleichung zweiter Ordnung, die wir numerisch integrieren können. Ein einfaches Verfahren wäre zum Beispiel ein explizites Euler-Schema: für einen kleinen Zeitschritt $\Delta t$ berechnen wir
 - die aktuell wirkenden Kräfte $\mathbf{F}_i(t)$ (die von den Positionen aller Teilchen abhängen) und daraus die aktuellen Beschleunigungen $\mathbf{a}_i(t)$,
 - die neuen Geschwindigkeiten $\mathbf{v}_i(t + \Delta t) \coloneqq \mathbf{v}_i(t) + \Delta t \cdot \mathbf{a}_i(t)$,
 - und schließlich die neuen Positionen $\mathbf{r}_i(t + \Delta t) \coloneqq \mathbf{r}_i(t) + \Delta t \cdot \mathbf{v}_i(t + \Delta t)$.

Danach beginnen wir von Neuem mit dem nächsten Zeitschritt. Wenn wir den Anfangszustand des Systems ($\mathbf{v}_i$ und $\mathbf{r}_i$ für alle Teilchen) kennen, können wir so den Zustand des Systems zu einem beliebigen Zeitpunkt berechnen. (Tatsächlich ist das explizite Euler-Schema hier nicht besonders gut geeignet, da es die Energieerhaltung verletzt. Deswegen nutzt diese Simulation einen [BAOAB-Integrator](https://pubs.aip.org/aip/jcp/article/162/10/104108/3339186/Langevin-integration-for-isothermal-isobaric), dessen Erklärung hier aber zu weit führen würde.)

## Wie kommt die Temperatur ins Spiel?

Hierzu nutzen wir eine stochastische Beschreibung, die sogenannte Langevin-Dynamik. Die Idee dahinter ist die Annahme, dass sich unsere Moleküle nicht im Vakuum, sondern in einem Lösungsmittel aus kleinen Molekülen wie Wasser oder Luft befinden. Wir nehmen weiter an, dass dieses Lösungsmittel eine konstante Temperatur $T$ hat (ein sogenanntes Wärmebad). Dann üben die kleinen Lösungsmittelmoleküle zufällige Stöße auf unsere großen Moleküle aus. Die Häufigkeit und Stärke dieser Stöße hängt hierbei von $T$ ab. Zusätzlich führen wir einen Reibungsterm ein, der die Interaktion von sich bewegenden Molekülen mit dem Lösungsmittel beschreibt. Anstelle des Newton'schen Kraftgesetzes nutzen wir also die Langevin-Gleichung
$$
m_i \mathbf{a}_i = \mathbf{F}_i - \gamma m_i \mathbf{v}_i + \sqrt{2\gamma m_i k_B T}\mathbf{R}_i
$$
mit einem Kopplungsparameter $\gamma$, der die Kollisionsfrequenz der Teilchen mit den Molekülen des Lösungsmittels beschreibt, der Boltzmann-Konstante $k_B$ (bei uns $k_B = 1$), sowie einem Zufallsterm $\mathbf{R}_i$.
Wenn wir die Gleichung wie oben numerisch integrieren, folgt dieser Term einer Normalverteilung mit Erwartungswert $0$ und Standardabweichug $\sqrt{\frac{2\gamma k_B T}{\Delta t}}$.
Dadurch, dass unser System nun von einem Wärmebad mit Temperatur $T$ umgeben ist, stellt sich diese über die Zeit auch für die großen Teilchen näherungsweise ein.
Eine exakte Temperatur können wir aufgrund der stochastischen Beschreibung allerdings nicht erwarten.

## Wo kommen die Messungen her?

Wir können in unserem System die meisten Dinge messen, die für ein echtes Fluid interessant wären.
Beispielhaft zeigen wir den Verlauf von Temperatur und Druck des Fluids über die Zeit.
Die (instantane) Temperatur ist proportional zur kinetischen Energie pro Freiheitsgrad.
In einem System mit $N$ Teilchen, die sich jeweils in zwei Dimensionen bewegen können, ergibt sie sich durch
$$
T_\text{gemessen} = \frac{1}{k_B \cdot 2N} \sum_{i=1}^N m_i|\mathbf{v}_i|^2.
$$
Da wir die Geschwindigkeiten $\mathbf{v}_i$ bereits kennen, ist dies leicht zu berechnen.
Diese Temperatur entspricht aber nicht notwendigerweise der des Wärmebads, sondern schwankt stark.
Deswegen geben wir auch die Temperatur gemittelt über drei Zeiteinheiten der Simulation an.
Auf ähnliche Weise berechnen wir den Druck.

## Was kann man beobachten?

Für verschiedene Temperaturen stellen sich unterschiedliche Zustände des Systems ein.
Bei Temperaturen nahe 0 bilden sich sechseckige Kristalle.
Das ist das Simulationsäquivalent eines Festkörpers.
Für etwas höhere Temperaturen bilden sich zunächst zusammenhängende Strukturen, die aber keine regelmäßigen Strukturen mehr bilden und ihre Form schon bei leichten Störungen verändern.
In der echten Welt wäre das eine Flüssigkeit.
Bei hinreichend großen Temperaturen lösen einzelne Teilchen aus dem zusammenhängenden Komplex, bis schließlich die gesamte Flüssigkeit zu einem Gas "verdampft" ist.
Man erkennt also selbst in diesem einfachen Modell bereits verschiedene Aggregatszustände und Übergänge zwischen diesen.

Außerdem können wir das ideale Gasgesetz "experimentell" bestätigen.
Die Theorie sagt voraus, dass in einem idealen Gas
$$
PV = N k_B T
$$
gilt.
Hierbei ist $P$ der Druck, $V$ das Volumen (das Simulationsgebiet ist $100 \times 100$ Einheiten groß) und $N$, $k_B$ sowie $T$ wie oben.
Nachdem die Simulation ein bisschen gelaufen ist und sich ein Gleichgewichtszustand eingestellt hat, ist dies tatsächlich näherungsweise der Fall, auch wenn ein Lennard-Jones-Fluid streng genommen kein ideales Gas ist.

## Was kann diese Simulation noch?

300 Moleküle in einer Box ist eine ziemlich kleine Menge Gas.
Bei einer echten Simulation, die nicht in deinem Browser läuft, sind vielleicht auch ein paar Millionen Teilchen möglich.
Verglichen mit realistischen Teilchenzahlen (in der Ordnung $\sim 10^{20}$ oder mehr) ist aber auch das verschwindend gering.
Um größere Systeme zu modellieren, nehmen wir an, dass das Fluid im ganzen Raum ungefähr gleich aussieht.
Dann teilen wir den Raum in viele kleine Zellen auf und nehmen an, dass sich ungefähr genauso viele Teilchen auf einer Seite in eine Zelle hinein wie aus der anderen Seite heraus bewegen.
Das erlaubt uns, periodische Randbedingungen zu definieren: Wenn sich ein Teilchen aus der Zelle bewegt, wird es auf die andere Seite der Zelle "teleportiert" und fliegt mit derselben Geschwindigkeit weiter.
Dadurch können wir auch große Mengen Gas zumindest näherungsweise simulieren.

Außerdem können auch Kräfte von außen auf das Fluid wirken.
Das können zum Beispiel die Gravitation oder bei bestimmten Fluiden auch elektrische oder magnetische Felder sein.
In dieser Simulation kann man durch Klicken und Halten auf dem Simulationsgebiet eine zum Mauszeiger hin anziehende oder abstoßende Kraft erzeugen.
(Der physikalisch-didaktische Sinn dieser speziellen Kraft ist zwar überschaubar, aber immerhin kann man damit Molekülbillard spielen 😉)