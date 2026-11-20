Jedes Kästchen ist ein winziger Magnet, ein sogenannter **Spin**. Er zeigt entweder nach oben (rot, $s = +1$) oder nach unten (blau, $s = -1$). Ein Stück Eisen besteht aus unvorstellbar vielen solcher Spins.

## Was du ausprobieren kannst

- **Temperatur runter** (z. B. $T = 1$): Gleichfarbige Bereiche wachsen, bis fast alles eine Farbe hat. Das Material ist jetzt ein Magnet.
- **Temperatur hoch** (z. B. $T = 4$): Alles flackert wild durcheinander, die Magnetisierung verschwindet.
- **Bei $T \approx 2{,}27$** passiert das Spannende: Es entstehen Inseln in allen Größen. Hier liegt der **Phasenübergang**.
- **Malen** mit Maus oder Finger: Setze Spins selbst und schau, ob deine Insel überlebt.
- **Magnetfeld $B$**: Ein äußeres Feld bevorzugt eine Richtung.

## Die Physik dahinter

Benachbarte Spins „mögen“ es, in dieselbe Richtung zu zeigen. Das beschreibt die Energie

$$
E = -J \sum_{\langle i,j \rangle} s_i \, s_j \;-\; B \sum_i s_i ,
$$

wobei die erste Summe über alle Paare direkter Nachbarn läuft. Gleiche Nachbarn senken die Energie, ungleiche erhöhen sie.

Die Wärme sorgt aber dafür, dass Spins trotzdem zufällig umklappen. Wie wahrscheinlich ein Zustand mit Energie $E$ bei der Temperatur $T$ ist, sagt der **Boltzmann-Faktor**:

$$
P \propto e^{-E / (k_B T)}
$$

Bei niedriger Temperatur gewinnt die Ordnung, bei hoher das Chaos. Genau deshalb verliert ein Magnet seine Magnetisierung, wenn man ihn stark erhitzt (bei Eisen oberhalb von etwa 770 °C, der **Curie-Temperatur**).

## Wie der Computer das rechnet

Alle möglichen Zustände durchzuprobieren ist unmöglich: Schon bei $128 \times 128$ Spins gibt es $2^{16384}$ Möglichkeiten. Stattdessen nutzen wir den **Metropolis-Algorithmus**, eine **Monte-Carlo-Methode**:

1. Wähle zufällig einen Spin.
2. Berechne, wie sich die Energie ändern würde, wenn er umklappt ($\Delta E$).
3. Klappe ihn um, wenn die Energie sinkt. Sonst nur mit der Wahrscheinlichkeit $e^{-\Delta E / (k_B T)}$.

Wiederholt man das millionenfach, verhält sich das Gitter wie ein echtes Material im Wärmegleichgewicht.

## Und im Studium?

Monte-Carlo-Methoden begegnen dir in Simulation Technology immer wieder: in der statistischen Physik, bei der Entwicklung neuer Materialien, in der Risikoabschätzung oder beim Rendern realistischer Bilder. Das Ising-Modell ist dabei das klassische Einstiegsbeispiel, weil eine einfache Regel ein überraschend reiches Verhalten erzeugt.
