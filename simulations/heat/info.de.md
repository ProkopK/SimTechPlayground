Wärme fließt immer von warm nach kalt. Wähle ein **Werkzeug** und male mit Maus oder Finger heiße oder kalte Stellen oder eine **Wand** aus Dämmstoff. Die rechte Maustaste macht jeweils das Gegenteil (kalt statt heiß, Wand löschen statt zeichnen).

Im Szenario **Haus im Winter** steht eine Heizung in einem gedämmten Haus, draußen ist es kalt. Schieb die Wärmeleitfähigkeit der Wand hoch und runter: Wie warm wird es drinnen, und wie viel muss die Heizung leisten?

## Die Physik dahinter

Die **Wärmeleitungsgleichung** beschreibt, wie sich die Temperatur $T$ im Raum und in der Zeit verändert:

$$
\frac{\partial T}{\partial t} = \alpha \, \nabla^2 T
$$

Dabei ist $\alpha$ die **Wärmeleitfähigkeit** des Materials. Sie hängt von der Dichte, der spezifischen Wärme und der spezifischen Wärmeleitfähigkeit ab.

$\nabla^2 T$ ist der **Laplace-Operator**. Er beschreibt, wie stark die Temperatur an einem Punkt von der Umgebung abweicht. Ist die Umgebung wärmer, steigt die Temperatur an diesem Punkt, ist sie kälter, sinkt sie.

$$
\nabla^2 T = \frac{\partial^2 T}{\partial x^2} + \frac{\partial^2 T}{\partial y^2}
$$

## Dämmung: Wärme festhalten

Eine Wand aus Dämmstoff hat ein viel kleineres $\alpha$ als die Luft. Die Wärme kommt nur langsam hindurch, deshalb fällt die Temperatur fast vollständig **innerhalb der Wand** ab: Drinnen bleibt es warm, draußen kalt.

Ganz aufhalten kann die Wand die Wärme aber nicht. Damit es drinnen warm bleibt, muss die Heizung genau so viel Wärme nachliefern, wie durch die Wand nach draußen fließt. Das zeigt die **Heizleistung**. Je besser die Dämmung, desto kleiner ist sie, und genau deshalb spart ein gut gedämmtes Haus Energie.

Im Computer wird die Fläche in kleine Zellen zerlegt. Zwischen zwei Nachbarzellen fließt Wärme umso schneller, je größer der Temperaturunterschied ist. Ist eine der beiden Zellen Wand, bremst sie den Fluss, so wie in einer Reihenschaltung der größte Widerstand den Strom bestimmt.

## Und im Studium?

Dieselbe Gleichung steckt in vielen anderen physikalischen Prozessen, z. B. in der Diffusion von Gasen und Flüssigkeiten, in der Ausbreitung von Wellen und in der Quantenmechanik. Im Studium begegnet dir die Wärmeleitungsgleichung häufig als erstes Beispiel für eine **partielle Differentialgleichung**. Mit genau solchen Simulationen wird in der Praxis berechnet, wie dick die Dämmung eines Hauses sein muss oder wie ein Prozessor gekühlt werden kann.
