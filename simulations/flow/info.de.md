Von links strömt Luft (oder Wasser) in einen Kanal und muss um Hindernisse herum. Die Farben zeigen, wie stark sich die Strömung dreht: **rot** gegen den Uhrzeigersinn, **blau** im Uhrzeigersinn.

## Was du ausprobieren kannst

- **Zeichne** mit Maus oder Finger eigene Hindernisse, auch während die Strömung läuft. Rechte Maustaste oder der Schalter „Radieren“ entfernt sie wieder.
- Hinter dem Zylinder lösen sich nach ein paar Sekunden abwechselnd oben und unten Wirbel ab: die **Kármánsche Wirbelstraße**.
- Mach die Strömung **zäher** (Viskosität hoch): Die Wirbel verschwinden, alles fließt ruhig und gleichmäßig.
- Probier den **Tragflügel**: Oben strömt die Luft schneller als unten. Daraus entsteht der Auftrieb, der Flugzeuge trägt.
- Die **Rauchteilchen** schwimmen mit der Strömung, wie Rauch im echten Windkanal.

## Die Reynolds-Zahl

Ob eine Strömung ruhig oder verwirbelt ist, hängt fast nur von einer einzigen Zahl ab, der **Reynolds-Zahl**:

$$
Re = \frac{u \cdot L}{\nu}
$$

Dabei ist $u$ die Geschwindigkeit, $L$ die Größe des Hindernisses und $\nu$ die Viskosität (wie zäh das Fluid ist). Sie vergleicht die Trägheit des Fluids mit seiner inneren Reibung:

- **Kleines $Re$** (Honig, winzige Bakterien): Die Reibung gewinnt, die Strömung bleibt geordnet.
- Ab etwa **$Re \approx 50$** lösen sich hinter einem Zylinder Wirbel ab.
- **Sehr großes $Re$** (Flugzeug, Wind um ein Hochhaus): Die Strömung wird **turbulent** und chaotisch.

Das Geniale: Ein kleines Modell im Windkanal verhält sich wie das große Original, wenn die Reynolds-Zahl gleich ist.

## Wie der Computer das rechnet

Wir verwenden die **Lattice-Boltzmann-Methode**. Statt die komplizierten Strömungsgleichungen (Navier-Stokes) direkt zu lösen, stellt sie sich das Fluid als viele Teilchen auf einem Gitter vor. In jedem Gitterpunkt wird nur gespeichert, wie viele Teilchen in welche von 9 Richtungen unterwegs sind. Pro Zeitschritt passieren zwei einfache Dinge:

1. **Strömen**: Die Teilchen hüpfen zum Nachbarpunkt in ihrer Richtung. Treffen sie auf ein Hindernis, prallen sie zurück.
2. **Stoßen**: In jedem Punkt gleichen sich die Teilchen ein Stück weit an ein Gleichgewicht an.

Aus diesen einfachen Regeln entstehen Druck, Reibung und Wirbel ganz von selbst. Weil jeder Gitterpunkt nur seine Nachbarn braucht, lässt sich die Methode hervorragend auf Grafikkarten und Supercomputern parallelisieren.

## Und im Studium?

Strömungssimulation, kurz **CFD** (Computational Fluid Dynamics), ist ein großes Feld in Simulation Technology. Damit werden Autos windschnittiger, Flugzeuge sparsamer und Brücken sicherer: Die Tacoma-Narrows-Brücke in den USA stürzte 1940 ein, auch weil Wirbel sie in Schwingung versetzten. Auch Blutströmungen in Adern, Wetter und Klima werden so berechnet.
