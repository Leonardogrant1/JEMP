# Landing Page Rework — Score als Herzstück

**Datum:** 2026-07-22
**Bereich:** `web/` (Next.js Landing Page)

## Ziel

Die Landing Page verkauft das stärkste Asset der App — das Score-/Assessment-System — bisher nicht. Die Überarbeitung macht es zum Herzstück, ergänzt Social Proof und ein Video, schärft die Copy und räumt den Funnel auf.

## Faktenbasis (aus der App verifiziert)

- 5 Kategorien: Kraft, Sprünge, Unterkörper-Plyometrie, Oberkörper-Plyometrie, Mobilität
- Scores 1–100, z-Score-normalisiert, alters- und geschlechtsbereinigt (`lib/score-calculators/`)
- 30+ Assessment-Tests (Vertical Jump, 30m-Sprint, Back Squat 1RM, Medizinball-Würfe, Mobility-Tests …)
- Plan-Generierung filtert Übungen nach `min_level`/`max_level` gegen den Kategorie-Score des Users
- Fortschrittsverlauf 3M/6M/1Y in der App
- Screenshot `web/public/images/progress.png` zeigt echte Werte: Overall 59, Jumps 39, Strength 71, Upper Plyo 59, Lower Plyo 70
- Social Proof (vom User bestätigt): „10.000+ Athleten · 4,8 ★ im App Store"

## Neue Seitenstruktur (`app/(landing)/[locale]/page.tsx`)

1. **Hero** (überarbeitet)
   - Headline: „Wie explosiv bist du wirklich?"
   - Subtitle: Assessment → Score → Plan in einem Satz, plus Sportart/Equipment
   - Social-Proof-Zeile direkt unter dem CTA: „10.000+ Athleten · 4,8 ★ im App Store"
2. **Score-Sektion** (neu, `components/score-section.tsx`)
   - Headline à la „Dein athletisches Level. In Zahlen."
   - Layout: `progress.png` links, rechts Aussagen mit echten Werten (Sprungkraft 39, Kraft 71, Overall 59)
   - 3-Schritte-Strip: Assessment machen → Score erhalten (1–100, verglichen mit Athleten deines Alters & Geschlechts) → Plan, der genau da ansetzt
3. **Video-Sektion** (neu, `components/video-section.tsx`)
   - Selbst gehostetes MP4 in Phone-Frame, autoplay/muted/loop/playsInline
   - Video-Datei kommt später nach `public/videos/`; bis dahin Platzhalter/Poster, Sektion rendert robust ohne Datei
4. **Features** (Copy überarbeitet, Layout unverändert)
   - „Level-adaptiv" → „Wird schwerer, wenn du besser wirst"
   - „Fortschritt tracken" → „Sieh deine Werte steigen" (3M/6M/1Y-Verlauf erwähnen)
   - Übrige Karten sprachlich schärfen
5. **Download-CTA** (überarbeitet)
   - Abo-Ehrlichkeit: „Kostenlos starten — voller Zugriff im Abo."
6. **Creator-Kompaktblock** (ersetzt große Creator-Sektion)
   - Schlanke Zeile über dem Footer: ein Satz + Link zu `/creator-application`; Nav-Link bleibt

## Technische Umsetzung

- Copy ausschließlich über next-intl: `web/messages/de.json` und `web/messages/en.json` (beide Sprachen vollständig)
- Neue Komponenten: `score-section.tsx`, `video-section.tsx`; `creator-cta.tsx` wird zur Kompakt-Variante
- Reihenfolge in `page.tsx` angepasst; keine neuen Routen, keine neuen Dependencies
- Bestehende Design-Sprache beibehalten: dunkles Theme, `bg-brand-gradient`-Akzente, `bg-white/5`-Karten
- Vor dem Coden: gebundlete Next.js-Doku in `web/node_modules/next/dist/docs/` konsultieren (Version weicht von Trainingsdaten ab, siehe `web/AGENTS.md`)

## Nicht im Scope

- Keine separate Feature-Unterseite
- Kein echtes Video-Asset (liefert der User später)
- Keine Änderungen an Admin, App oder Backend

## Erfolg

Die Seite erklärt Assessment + Score konkret mit echten Zahlen, nennt Social Proof, setzt die Abo-Erwartung ehrlich, und der Creator-Block unterbricht den Funnel nicht mehr. Build (`npm run build` in `web/`) läuft fehlerfrei, beide Sprachen vollständig.
