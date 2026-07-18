# Creator Application: Plattform-Dropdown + Username statt Profil-Link

**Datum:** 2026-07-18
**Betroffene Dateien:** `web/components/creator-application-form.tsx`, `web/messages/de.json`, `web/messages/en.json`

## Problem

In Step 2 („Social Media Channels") muss man aktuell den vollständigen Profil-Link
einfügen. Das ist umständlich — man muss den Link erst raussuchen. Stattdessen soll
man die Plattform per Dropdown wählen und nur den Username eintippen.

## Lösung

Die Eingabe in Step 2 wird ersetzt durch **Plattform-Dropdown + Username-Feld**.
Aus beidem wird eine kanonische Profil-URL gebaut, die wie bisher als String in
`social_accounts` landet. Alles hinter der Eingabe bleibt unverändert: Chips-Liste,
Review-Step (nutzen weiter `parseProfileUrl`), API-Route und Northbyte-Payload.

### Dropdown

- Optionen: Instagram, TikTok, YouTube, X, Facebook, „Anderer Link" (`other`).
- Gleicher Look & Verhalten wie das bestehende `CountryDropdown` (Öffnen nach
  oben/unten, Outside-Click, Escape). Dafür wird das bestehende Dropdown zu einer
  generischen `Dropdown`-Komponente (Items mit `value`, Render-Label) in derselben
  Datei verallgemeinert; `CountryDropdown` und das neue Plattform-Dropdown nutzen
  sie beide — kein Copy-Paste-Drift.
- Optionen zeigen das vorhandene Plattform-Icon (`PlatformIcon`).
- Default: Instagram.

### Username-Feld

- Placeholder `@username`; bei `other` verhält sich das Feld wie bisher als
  Link-Feld (Placeholder z.B. `twitch.tv/yourname`).
- Tolerante Normalisierung der Eingabe:
  - führendes `@` wird entfernt,
  - fügt jemand doch eine volle URL/Domain ein (`instagram.com/foo`,
    `https://instagram.com/foo`), wird der Username daraus extrahiert, sofern die
    Domain zur gewählten Plattform passt; sonst Validierungsfehler.
  - Leere Eingabe → bestehender Fehler `invalidProfileUrl` (Text angepasst:
    „Bitte gib einen gültigen Usernamen ein.").

### URL-Bau pro Plattform

| Plattform | URL |
|---|---|
| Instagram | `https://instagram.com/<user>` |
| TikTok | `https://tiktok.com/@<user>` |
| YouTube | `https://youtube.com/@<user>` |
| X | `https://x.com/<user>` |
| Facebook | `https://facebook.com/<user>` |
| Anderer Link | Eingabe wie bisher via `parseProfileUrl` normalisiert |

Duplikat-Check wie bisher über die fertige URL.

### Übersetzungen (de/en)

- `steps.socials.subtitle`: „Wähle die Plattform und gib deinen Usernamen ein."
- `steps.socials.handleLabel`/`handlePlaceholder`: auf Username umgestellt.
- Neuer Key für das Plattform-Label des Dropdowns.
- `errors.invalidProfileUrl`: auf Username-Wording angepasst (bleibt für `other`
  als Link-Fehler sinnvoll formuliert oder bekommt einen zweiten Key).

## Nicht-Ziele

- Keine Änderung an `web/app/api/creator-application/route.ts` oder am
  Northbyte-Datenformat (`social_accounts` bleibt `string[]` mit URLs).
- Keine Existenz-Prüfung der Usernames gegen die Plattformen.

## Testen

Manuell im Dev-Server: Account je Plattform hinzufügen (mit/ohne `@`, mit
eingefügter URL), Duplikat, `other`-Link, Chips/Review-Anzeige, Submit-Payload
im Network-Tab prüfen; de + en Texte.
