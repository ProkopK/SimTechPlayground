Jede farbige Linie ist die Bahn eines Punktes, der drei einfachen Gleichungen folgt. Alle Bahnen starten fast am selben Ort: Der Unterschied beträgt nur ein Zehntausendstel. Trotzdem gehen sie nach einigen Sekunden völlig verschiedene Wege.

## Was du ausprobieren kannst

- **Drehen und zoomen**: Ziehe mit Maus oder Finger, zoome mit dem Mausrad oder zwei Fingern.
- Beobachte den **Messwert**: Der Abstand der ersten beiden Bahnen wächst um viele Zehnerpotenzen, bis er so groß ist wie die ganze Figur.
- Verändere **$\rho$**: Unter etwa $\rho = 24$ beruhigt sich alles und die Bahnen landen in einem festen Punkt. Darüber wird es chaotisch.
- Erhöhe die **Anzahl der Bahnen** auf 10 und sieh zu, wie sie sich über den ganzen „Schmetterling“ verteilen.

## Die Gleichungen

Der Meteorologe Edward Lorenz wollte 1963 die Konvektion in der Atmosphäre verstehen, also wie warme Luft aufsteigt und kalte absinkt. Er vereinfachte das Problem auf drei Größen $x$, $y$ und $z$:

$$
\begin{aligned}
\dot x &= \sigma \, (y - x) \\
\dot y &= x \, (\rho - z) - y \\
\dot z &= x \, y - \beta \, z
\end{aligned}
$$

Der Punkt über einer Größe bedeutet „Änderung pro Zeit“. Mit den klassischen Werten $\sigma = 10$, $\rho = 28$ und $\beta = 8/3$ entsteht diese Figur, der **Lorenz-Attraktor**. Er sieht aus wie ein Schmetterling.

## Deterministisches Chaos

Die Gleichungen enthalten keinen Zufall: Wer exakt denselben Startpunkt nimmt, bekommt exakt dieselbe Bahn. Das nennt man **deterministisch**. Aber winzige Unterschiede wachsen exponentiell an, ungefähr wie

$$
\Delta(t) \approx \Delta_0 \, e^{\lambda t} .
$$

Deshalb steigt die Kurve im Messwert-Diagramm zunächst ungefähr geradlinig an. Die senkrechte Achse ist **logarithmisch**: Jede Linie nach oben bedeutet zehnmal so viel Abstand. Eine Gerade heißt also, dass der Abstand in gleichen Zeiten immer um denselben Faktor wächst. Lorenz bemerkte das, als er eine Rechnung mit leicht gerundeten Startwerten wiederholte und ein völlig anderes Ergebnis erhielt. Daher kommt der Begriff **Schmetterlingseffekt**: Kann der Flügelschlag eines Schmetterlings in Brasilien einen Tornado in Texas auslösen?

## Und im Studium?

Deshalb lässt sich das Wetter nur etwa zwei Wochen im Voraus vorhersagen, egal wie gut die Computer sind. Wetterdienste rechnen darum **Ensembles**: viele Simulationen mit leicht veränderten Startwerten, so wie die vielen Bahnen hier. Wie stark sie auseinanderlaufen, zeigt, wie sicher die Vorhersage ist. Nichtlineare Dynamik, Unsicherheitsquantifizierung und Klimamodelle sind Themen, denen du in Simulation Technology begegnest.
