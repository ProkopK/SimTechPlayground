Wo ist das Elektron im Wasserstoffatom? Die Quantenmechanik sagt: Das lässt sich nicht genau sagen, nur wie **wahrscheinlich** es an jedem Ort zu finden ist. Jeder Punkt hier ist ein möglicher Messort. Wo die Wolke dicht und hell ist, findest du das Elektron oft, wo sie dunkel ist, selten.

## Was du ausprobieren kannst

- **Drehen und zoomen**: Ziehe mit Maus oder Finger, zoome mit dem Mausrad oder zwei Fingern. Die farbigen Linien sind die Achsen: rot $x$, grün $y$, blau $z$ (nach oben).
- Wähle verschiedene **Orbitale** und vergleiche ihre Formen: Kugel (s), Hantel (p), Kleeblatt (d) und noch kompliziertere (f).
- Schalte **Nur Schnitt** ein: Dann siehst du nur eine dünne Scheibe durch die Mitte. Im 2s- und 3s-Orbital versteckt sich innen eine Kugelschale, in der das Elektron nie zu finden ist.
- Probiere die **Szenarien** mit zwei Zuständen aus: Dann bewegt sich die Wolke, und der Messwert zeigt, wie der Schwerpunkt der Ladung hin und her schwingt.

## Orbitale

Das Elektron wird durch eine **Wellenfunktion** $\psi$ beschrieben. Die Wahrscheinlichkeit, es an einem Ort zu finden, ist $|\psi|^2$. Beim Wasserstoffatom kann man die erlaubten Wellenfunktionen genau ausrechnen. Sie heißen **Orbitale** und werden durch drei Quantenzahlen gekennzeichnet:

- $n = 1, 2, 3, \dots$ bestimmt die Energie und die Größe,
- $l = 0, 1, \dots, n-1$ die Form (s, p, d, f für $l = 0, 1, 2, 3$),
- $m$ die Ausrichtung im Raum.

Die Energie hängt nur von $n$ ab:

$$
E_n = -\frac{13{,}6\ \text{eV}}{n^2}
$$

Die Farben zeigen das Vorzeichen der Wellenfunktion: orange für positiv, hellblau für negativ. Bei den Orbitalen mit „$m = +1$“ oder „$m = +2$“ ist $\psi$ eine komplexe Zahl, und die Farbe läuft einmal oder zweimal durch den Regenbogen, wenn du um die $z$-Achse herumgehst. Diese Elektronen kreisen um die $z$-Achse. Damit alles gut zu sehen ist, wird jede Wolke auf dieselbe Größe gebracht. In Wirklichkeit wachsen Orbitale ungefähr mit $n^2$: Ein 4f-Orbital ist mehr als zehnmal so groß wie das 1s-Orbital.

## Wie ein Atom leuchtet

Ein einzelnes Orbital ist **stationär**: Die Wolke ändert sich nie, auch wenn die Zeit läuft. Interessant wird es, wenn das Elektron in zwei Zuständen gleichzeitig ist, einer **Überlagerung**. Dann schwingt die Wolke mit der Frequenz

$$
f = \frac{E_2 - E_1}{h} ,
$$

wobei $h$ die Planck-Konstante ist. Wenn dabei der Schwerpunkt der Ladung hin und her schwingt, wirkt das Atom wie eine winzige Antenne und sendet Licht genau dieser Frequenz aus. So entsteht das Licht, das Wasserstoff aussendet: Zwischen $n = 2$ und $n = 3$ ist es rot (656 nm), zwischen $n = 1$ und $n = 2$ ultraviolett (122 nm). Bei manchen Überlagerungen, etwa 1s + 2s, „atmet“ die Wolke nur, ihr Schwerpunkt bleibt in der Mitte, und es entsteht kein Licht. Solche Regeln heißen **Auswahlregeln**.

## Wie die Bilder entstehen

Die Punkte werden mit Zufallszahlen so verteilt, dass sie der Wahrscheinlichkeit $|\psi|^2$ folgen. Das ist eine **Monte-Carlo-Methode**: Mit genug Zufallspunkten bekommt man ein immer genaueres Bild einer Verteilung. Damit sich die Wolke bei einer Überlagerung schnell bewegen kann, werden die Punkte nicht jedes Mal neu gewürfelt: Jeder Punkt wird nur heller oder dunkler, je nachdem, wie wahrscheinlich sein Ort gerade ist.

## Und im Studium?

Beim Wasserstoffatom lässt sich alles exakt ausrechnen. Schon beim Helium mit zwei Elektronen geht das nicht mehr, und für Moleküle oder neue Materialien braucht man Computer. Solche Rechnungen helfen, Medikamente, Batterien oder Solarzellen zu entwickeln. Quantenmechanik, Monte-Carlo-Methoden und Methoden für die Elektronenstruktur von Molekülen sind Themen, denen du in Simulation Technology begegnest.
