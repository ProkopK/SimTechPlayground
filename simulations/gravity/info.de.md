Hier ziehen sich Himmelskörper gegenseitig an, genau wie Sonne, Planeten und Monde.

## Was du ausprobieren kannst

- **Ziehen** mit Maus oder Finger startet einen neuen Körper: Der Pfeil zeigt, wohin und wie schnell er fliegt.
- Triffst du die richtige Geschwindigkeit, entsteht eine **Umlaufbahn**. Zu langsam: Absturz in die Sonne. Zu schnell: Der Körper entkommt.
- **Szenarien**: Doppelstern, ein Haufen, aus dem durch Zusammenstöße Planeten wachsen, oder die berühmte **Achter-Bahn** dreier gleich schwerer Körper.
- Erhöhe die **Gravitationskonstante $G$** und sieh, wie alles enger und schneller kreist.

## Die Physik dahinter

Zwei Massen $m_1$ und $m_2$ im Abstand $r$ ziehen sich mit dem **Gravitationsgesetz** von Isaac Newton an:

$$
F = G \, \frac{m_1 \, m_2}{r^2}
$$

Jeder Körper spürt die Kräfte aller anderen. Die Kraft bestimmt nach $F = m \, a$ die Beschleunigung, die Beschleunigung ändert die Geschwindigkeit und die Geschwindigkeit den Ort. Schon bei drei Körpern lässt sich das im Allgemeinen nicht mehr mit einer Formel lösen. Der Computer muss rechnen.

## Wie der Computer das rechnet

Die Zeit läuft in kleinen Schritten $\Delta t$ ab. In jedem Schritt werden alle Kräfte berechnet und die Körper ein Stückchen weiterbewegt. Wie genau man das macht, ist entscheidend:

- Das einfachste Verfahren (Euler) macht in jedem Schritt einen winzigen Fehler. Die Fehler summieren sich, Planeten spiralen langsam nach außen, und die Energie wächst, obwohl sie eigentlich erhalten bleiben muss.
- Wir verwenden das **Velocity-Verlet-Verfahren**. Es ist kaum aufwendiger, hält aber die **Gesamtenergie** über sehr lange Zeit stabil. Beobachte den Messwert: Er bleibt konstant, solange nichts zusammenstößt.

Beim Zusammenstoß verschmelzen zwei Körper. Masse und Impuls bleiben dabei erhalten, Bewegungsenergie wird aber zu Wärme. Deshalb springt die Gesamtenergie dann.

## Und im Studium?

Solche **numerischen Integrationsverfahren** sind ein Kernthema in Simulation Technology. Dieselben Methoden berechnen Satellitenbahnen und Raumsondenflüge, simulieren in der **Molekulardynamik**, wie sich Atome in Proteinen oder Werkstoffen bewegen, und zeigen, wie Galaxien entstehen.
