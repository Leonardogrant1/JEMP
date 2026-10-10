# JEMP Plan-Generierung — einfach erklärt

Stand: 2026-10-10 · Lebende Version: [Claude Doc](https://claude.ai/code/artifact/aa53a825-abcb-4636-9eff-341e353278d2) · Technische Autorität: `docs/superpowers/specs/2026-10-10-upper-lower-strength-blocks-design.md` (+ Vorgänger-Specs)

## Was reingeht

Der Generator bekommt vier Dinge vom User und baut daraus eine Trainingswoche, die 4 Wochen lang läuft.

| Eingabe | Woher | Was sie steuert |
| --- | --- | --- |
| **Sportart** + Vereinskalender (Trainings, Spiele, Intensität) | Onboarding | Wochenbelastung, Spieltagsschutz, Sprint-Übungswahl |
| **Prioritäten** (7 Säulen, je Level 1–3) | Wizard-Stepper (Budget) | Wie viele Extra-Bausteine jede Säule bekommt |
| **Tage + Dauer pro Tag** | Schedule-Step | Wie viele Sessions, wie viele Bausteine pro Session |
| **Orte, Equipment, Leistungslevel** | Onboarding + Assessments | Welche Übungen überhaupt in Frage kommen |

Die 7 Säulen: Kraft, Unterkörper-Plyo, Oberkörper-Plyo, Sprints, COD (Richtungswechsel), Conditioning, Mobility. Level 1 = dabei, Level 2 = Fokus, Level 3 = Priorität.

## Schritt 1: Das Wochenbudget

Zuerst wird entschieden, wie viele Einheiten die Woche überhaupt verträgt — bevor irgendein Inhalt feststeht.

1. **Vereinspensum zählen:** Alle Vereinstermine (Training, Sparring, Spiele) ergeben einen Belastungs-Score → Profil *low*, *medium* oder *high*.
2. **Workout-Deckel:** low = max. 5 eigene Workouts, medium = 3, high = 2. Wer mehr Tage anhakt als der Deckel erlaubt, hat Überschuss-Tage.
3. **Sprints ziehen zuerst:** Priorität (Level 3) bekommt garantiert einen eigenen Sprint-Tag — notfalls wird dafür ein Workout-Tag geopfert (mindestens 2 Workouts bleiben immer). Fokus (Level 2) bekommt nur einen Überschuss-Tag; gibt es keinen, läuft Sprint als Mikro-Dosis im Warmup der Workouts (2 kurze Antritte — Erhalt, kein Fortschritt).
4. **Conditioning danach:** Level 3 nimmt einen freien Überschuss-Tag, Level 2 nur bei niedriger Wochenlast. Sonst läuft Conditioning als ~10-min-Finisher am Ende eines Workouts.
5. **Mobility ist gratis:** Ab Level 2 gibt es eine eigene 20-min-Einheit — sie kostet keinen Trainingstag, weil sie auf einem Ruhetag liegt (Ermüdung ≈ 0).

Faustregel: **Priorität darf das Budget umverteilen, Fokus verstärkt nur innerhalb des Budgets.**

## Schritt 2: Tage platzieren

Jetzt bekommen die Einheiten konkrete Wochentage — hier leben die harten Schutzregeln, die nie verhandelbar sind.

- **Spieltage sind tabu.** Selbst wenn der User sie angehakt hat, fliegen sie aus den Trainingstagen.
- **Sprints nie <72 h vor einem Spiel** und nie am Spieltag. Die Sprint-Einheit bekommt zusätzlich ein *flexibles Fenster*: Der User darf sie auf jeden legalen Tag verschieben — die 72-h-Regel kann er dabei nicht brechen, gesperrte Tage zeigen ein Schloss.
- **Der harte Beintag** liegt so weit wie möglich vom nächsten Spiel entfernt (schwere Beine am Spieltag sind der klassische Fehler).
- **Conditioning nie am Vortag eines Spiels.**
- **Mobility** landet auf dem ersten echten Ruhetag (kein Vereins-, kein Workout-Tag); gibt es keinen, auf dem lockersten Vereinstag. Auch sie ist frei verschiebbar — alle 7 Tage legal.

Sprint- und Mobility-Einheiten erscheinen in der App deshalb als Wochen-Checkliste („Diese Woche noch") mit Empfehlungstag — der Tag ist ein Vorschlag, kein Zwang.

## Schritt 3: Die Session-Bausteine

Jedes Workout wird aus Bausteinen komponiert — deterministisch, ohne KI. Die Anzahl hängt an der Dauer: 30 min → 3 Bausteine, 45 → 4, 60 → 5, mehr → 6 (plus Warmup und Cooldown, die nie fehlen).

**Das Grundgerüst jeder Session:**

1. Warmup (gezielt auf die heutigen Muskelgruppen)
2. ggf. Plyo (explosiv, frisch, VOR dem schweren Heben)
3. **Lead-Kraftblock** — die Hauptarbeit: 4–5 Sätze, 3–5 Wiederholungen, schwer
4. **Begleit-Kraftblock** — solide Ergänzung: 3 Sätze, 5–8 Wiederholungen
5. Core (2–3× pro Woche, Ebene rotiert: rotierend → gerade → frei)
6. Rest-Slots: Accessory (Prophylaxe: Hüfte, Waden, Leiste) vor Optional (Arme, Schultern)
7. Cooldown (dehnt, was heute belastet wurde)

**Die Rotation:** Der Lead wechselt von Tag zu Tag zwischen *Unterkörper* und *Oberkörper* — der geschützte Beintag aus Schritt 2 bekommt immer den Unterkörper-Lead. Im Unterkörper wechseln Hüftbeuge (Deadlift-Familie) und Kniebeuge; der Oberkörper-Block enthält IMMER Push und Pull als Antagonisten-Paar (Supersatz), die schwere Seite wechselt — Pull zuerst, weil chronisch unterversorgt.

**Was die Prioritäten hier bewirken:** Die Plyo-Level sind ein Wochen-Budget — Level = Blöcke pro Woche (minus 1, wenn es eine eigene Sprint-Einheit gibt). **Level 3 darf zusätzlich eine Session anführen:** Der Plyo-Block wird dort selbst schwer (4–5 Sätze, volle Pausen) und der Kraft-Lead des Tages fährt auf Erhaltungsdosis — aber nur am Lead-Tag der eigenen Region, damit die andere Region ihren schweren Krafttag behält.

**Der Floor (nicht verhandelbar):** Jede Session enthält mindestens einen Kraftblock, und jede Region bekommt jede Woche einen schweren Reiz — als Kraft-Lead oder als Plyo-Lead. Kraft kann schrumpfen, nie verschwinden: Sie trägt Sprint- und Sprungleistung und schützt genau die Strukturen (Hamstrings, Sehnen), die Explosivtraining am stärksten belastet.

## Schritt 4 + 5: Übungsauswahl

**Erst die Pools (Code):** Für jeden Baustein wird ein Topf erlaubter Übungen gebaut — gefiltert nach Trainingsort, Equipment und Leistungslevel, dann nach Baustein-Logik: Kraftblöcke nach Bewegungsmuster (Push/Pull/Beuge/Hüfte), Core nach Bewegungsebene, Plyo nach Region. Warmup und Cooldown werden auf die heute trainierten Körperregionen verengt — ein Beintag wärmt Hüfte und Sprunggelenk auf, kein Schulterkreisen.

**Dann die Auswahl — zwei Wege:**

- **Ohne KI (fester Bauplan):** Sprint-, Mobility- und Conditioning-Einheiten baut der Code komplett selbst. Die Sprint-Einheit ist dabei immer *outdoor* (Sprinten braucht nur freie Fläche): Traben → dynamische Mobility → Lauf-ABC → Steigerungsläufe → genau EINE Haupt-Sprintübung (6–8 Antritte à 20 m, volle Pausen — Kampfsportler bekommen den Bergsprint) → optional COD → Auslaufen.
- **Mit KI (Workouts):** Ein kleines Sprachmodell wählt pro Baustein die konkreten Übungen aus dem Pool und verschreibt Sätze/Wiederholungen — mehr darf es nicht. Struktur, Dosierungs-Rahmen und Muster-Pflichten sind vorgegeben; ein Validator prüft jede Antwort hart (richtige Blöcke? Nur Pool-Übungen? Push UND Pull vertreten?) und lässt bis zu 3 Korrekturversuche zu.

**Zum Schluss** wird die Woche als Vorlage gespeichert und in 4 Wochen konkreter Termine ausgerollt — inklusive der flexiblen Fenster für Sprint und Mobility.

Die Leitplanke hinter allem: **Was gefährlich wäre, wenn es schiefgeht (72 h, Spieltage, Kraft-Floor, Muster-Abdeckung), garantiert Code. Die KI entscheidet nur, wo ein Fehler höchstens suboptimal ist.**

## Beispielwoche: Kickboxer, 4 Tage

Test-User: Kickboxen, Teamtraining Mo/Mi/Fr (→ Belastung *medium*, Deckel 3 Workouts), 4 Tage angehakt (Di/Do/Sa/So), Prioritäten: Mobility 3, Sprints 2, Conditioning 2, Rest 1.

Rechnung: Deckel 3 → 1 Überschuss-Tag → Sprints (Fokus) bekommen ihn. Mobility ab Level 2 → gratis dazu. Ergebnis: 3 Workouts + 1 Sprint-Einheit + 1 Mobility.

| Tag | Einheit | Inhalt (echter Generator-Output) |
| --- | --- | --- |
| Mo | Mobility, 20 min (flexibel) | ruhige Mobility — liegt auf dem lockersten Tag, frei verschiebbar |
| Di | Sprint-Einheit, 40 min (outdoor, flexibel) | Traben → Lauf-ABC → Steigerungen → **Bergsprint 7×20 m** → Shuffle |
| Do | Workout: Oberkörper-Lead (Pull schwer) | DB-Rudern 4×3–5 schwer, Push Press 3×5–8, Goblet Squat, Rotations-Core |
| Sa | Workout: **harter Beintag** | Broad Jumps → **Deadlift 5×3–5** → Bench + Klimmzug im Supersatz → Core → Waden/Leiste |
| So | Workout: Unterkörper-Lead (Kniebeuge) | **Back Squat 5×3–5** → OHP + Rudern im Supersatz → Core → Hüfte → Arme |

Zu sehen: Lead wechselt Oberkörper → Unterkörper → Unterkörper (der Beintag zieht den Lead an), Pull kommt in jeder Session vor, Plyo liegt vor dem schweren Heben, und der Cooldown dehnt jeweils die belasteten Regionen.

## Spickzettel: Welcher Hebel wirkt wo

**Sportart** wirkt über drei Kanäle: Vereinspensum → Workout-Deckel; Spiel-/Wettkampftage → Platzierungsschutz (72 h, Beintag, Vortag); Sportgruppe → Übungswahl (Kampfsport → Bergsprint; geplant: Bewegungsebenen-Verteilung, z. B. mehr Rotation für Kämpfer).

**Prioritäten (das Budget)** wirken pro Säule so:

| Säule | Level 1 | Level 2 (Fokus) | Level 3 (Priorität) |
| --- | --- | --- | --- |
| Sprints | Mikro-Dosis im Warmup | eigener Tag nur bei Überschuss-Tag, sonst Mikro-Dosis | eigener Tag garantiert (opfert notfalls ein Workout) |
| Plyo (unten/oben) | 1 Block/Woche | 2 Blöcke/Woche | 3 Blöcke **+ führt 1 Session** (Plyo schwer, Kraft an dem Tag Erhaltung) |
| Conditioning | — | Finisher im Workout; eigener Tag nur bei low Load | eigener Tag, wenn ein Tag frei ist; sonst Finisher |
| Mobility | — | eigene 20-min-Einheit, gratis auf Ruhetag | wie Level 2 |
| COD | fließt ins Sprint-Level ein (max. beider Werte) + COD-Teil der Sprint-Einheit | ebenso, mehr Anteil | ebenso |
| Kraft | immer die Basis jeder Session — das Level steuert aktuell nichts Zusätzliches | — | — |

Merksatz: **Die Sportart bestimmt die Leitplanken, die Prioritäten verteilen das Budget, der Code garantiert die Physiologie — und die KI füllt nur noch Übungen in ein fertiges Gerüst.**
