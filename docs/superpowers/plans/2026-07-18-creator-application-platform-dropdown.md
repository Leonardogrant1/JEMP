# Creator Application Platform-Dropdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In Step 2 der Creator Application ersetzt ein Plattform-Dropdown + Username-Feld die bisherige Profil-Link-Eingabe; gespeichert wird weiterhin eine kanonische URL in `social_accounts`.

**Architecture:** Das bestehende `CountryDropdown` wird zu einer generischen `Dropdown`-Komponente verallgemeinert (gleiche Datei). Aus Plattform + Username wird per `buildProfileHref` eine kanonische URL gebaut — Chips, Review-Step, API-Route und Northbyte-Payload bleiben unverändert.

**Tech Stack:** Next.js (App Router), React Client Component, next-intl, Tailwind.

## Global Constraints

- **Keine Git-Commits** — der User committet selbst (User-Präferenz, überschreibt die Commit-Steps dieses Skills).
- Kein Test-Runner im Projekt: Verifikation via `npx tsc --noEmit`, `npm run lint`, manueller Dev-Server-Check.
- `web/app/api/creator-application/route.ts` und das Northbyte-Datenformat (`social_accounts: string[]` mit URLs) bleiben unverändert.
- Spec: `docs/superpowers/specs/2026-07-18-creator-application-platform-dropdown-design.md`

---

### Task 1: Generische `Dropdown`-Komponente, `CountryDropdown` als Wrapper

**Files:**
- Modify: `web/components/creator-application-form.tsx:113-223` (CountryDropdown)

**Interfaces:**
- Produces: `type DropdownOption<V extends string> = { value: V; label: string; icon?: React.ReactNode }` und `function Dropdown<V extends string>({ value, options, onChange }): JSX.Element`. Task 2 nutzt beides für das Plattform-Dropdown.

- [ ] **Step 1: `CountryDropdown` durch generisches `Dropdown` + Wrapper ersetzen**

Den kompletten Block `function CountryDropdown(...) { ... }` (Zeilen 115–223) ersetzen durch:

```tsx
type DropdownOption<V extends string> = {
  value: V;
  label: string;
  icon?: React.ReactNode;
};

function Dropdown<V extends string>({
  value,
  options,
  onChange,
}: {
  value: V;
  options: DropdownOption<V>[];
  onChange: (value: V) => void;
}) {
  const [open, setOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // max-h-60 (240px) + 8px Abstand zum Button
  const PANEL_SPACE = 248;

  const toggleOpen = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpensUpward(spaceBelow < PANEL_SPACE && rect.top > spaceBelow);
    }
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-left focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className="flex items-center gap-2.5 truncate">
          {selected?.icon}
          <span className="truncate">{selected?.label ?? value}</span>
        </span>
        <svg
          className={`w-4 h-4 text-white/50 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className={`absolute z-30 w-full max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#141414]/95 backdrop-blur-xl shadow-2xl py-1.5 ${
            opensUpward ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2 ${
                  o.value === value
                    ? "text-brand-cyan bg-brand-cyan/10 font-semibold"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  {o.icon}
                  <span className="truncate">{o.label}</span>
                </span>
                {o.value === value && (
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CountryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const locale = useLocale();
  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const options = COUNTRY_CODES.map((code) => ({
    value: code,
    label: `${regionNames.of(code) ?? code} (${code})`,
  }));
  return <Dropdown value={value} options={options} onChange={onChange} />;
}
```

- [ ] **Step 2: Typecheck**

Run: `cd web && npx tsc --noEmit`
Expected: keine Fehler (bzw. keine neuen Fehler gegenüber dem Stand davor).

---

### Task 2: Plattform-Dropdown + Username-Feld in Step 2

**Files:**
- Modify: `web/components/creator-application-form.tsx` (URL-Builder nach `parseProfileUrl`; State + Handler in `CreatorApplicationForm`; JSX von Step 2)

**Interfaces:**
- Consumes: `Dropdown`/`DropdownOption` aus Task 1; bestehende `parseProfileUrl`, `PlatformKey`, `PLATFORM_LABELS`, `PlatformIcon`.
- Produces: `buildProfileHref(platform: PlatformKey, raw: string): string | null`. Übersetzungs-Keys, die Task 3 anlegt: `steps.socials.handlePlaceholder` (neu belegt), `steps.socials.linkPlaceholder`, `steps.socials.platformOther`, `errors.invalidUsername`.

- [ ] **Step 1: URL-Builder ergänzen**

Direkt nach `parseProfileUrl` (nach Zeile 111) einfügen:

```tsx
const PLATFORM_URL_BUILDERS: Record<Exclude<PlatformKey, "other">, (user: string) => string> = {
  instagram: (u) => `https://instagram.com/${u}`,
  tiktok: (u) => `https://tiktok.com/@${u}`,
  youtube: (u) => `https://youtube.com/@${u}`,
  x: (u) => `https://x.com/${u}`,
  facebook: (u) => `https://facebook.com/${u}`,
};

function buildProfileHref(platform: PlatformKey, raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;
  if (platform === "other") {
    return parseProfileUrl(input)?.href ?? null;
  }
  let username = input;
  // Volle URL eingefügt? Username extrahieren, sofern die Domain zur Plattform passt.
  if (/^https?:\/\//i.test(input) || input.includes("/")) {
    const parsed = parseProfileUrl(input);
    if (!parsed || parsed.platform !== platform) return null;
    username = parsed.handle;
  }
  username = username.replace(/^@+/, "");
  if (!/^[A-Za-z0-9._-]+$/.test(username)) return null;
  return PLATFORM_URL_BUILDERS[platform](username);
}
```

- [ ] **Step 2: State und Handler in `CreatorApplicationForm` umstellen**

Neben `socialInput` (Zeile 229) den Plattform-State ergänzen:

```tsx
const [socialPlatform, setSocialPlatform] = useState<PlatformKey>("instagram");
```

`detectedProfile` (Zeile 241) ersetzen durch:

```tsx
  const previewHref = buildProfileHref(socialPlatform, socialInput);
  const previewProfile = previewHref ? parseProfileUrl(previewHref) : null;
```

`handleAddSocial` (Zeilen 243–258) ersetzen durch:

```tsx
  const handleAddSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialInput.trim()) return;
    const href = buildProfileHref(socialPlatform, socialInput);
    if (!href) {
      setValidationError(
        t(socialPlatform === "other" ? "errors.invalidProfileUrl" : "errors.invalidUsername")
      );
      return;
    }
    if (formData.social_accounts.includes(href)) {
      setValidationError(t("errors.duplicateSocial"));
      return;
    }
    handleInputChange("social_accounts", [...formData.social_accounts, href]);
    setSocialInput("");
    setValidationError(null);
  };
```

- [ ] **Step 3: Step-2-JSX umbauen**

Innerhalb von Step 2 den `<form onSubmit={handleAddSocial} ...>`-Block inklusive der Preview-Zeile (Zeilen 507–535) ersetzen durch:

```tsx
                  <form onSubmit={handleAddSocial} className="flex flex-col sm:flex-row gap-2">
                    <div className="sm:w-44 shrink-0">
                      <Dropdown
                        value={socialPlatform}
                        options={(Object.keys(PLATFORM_LABELS) as PlatformKey[]).map((p) => ({
                          value: p,
                          label: p === "other" ? t("steps.socials.platformOther") : PLATFORM_LABELS[p],
                          icon: <PlatformIcon platform={p} className="w-4 h-4 shrink-0" />,
                        }))}
                        onChange={(p) => {
                          setSocialPlatform(p);
                          setValidationError(null);
                        }}
                      />
                    </div>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        inputMode={socialPlatform === "other" ? "url" : "text"}
                        placeholder={
                          socialPlatform === "other"
                            ? t("steps.socials.linkPlaceholder")
                            : t("steps.socials.handlePlaceholder")
                        }
                        value={socialInput}
                        onChange={(e) => setSocialInput(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all"
                      />
                      <button
                        type="submit"
                        className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.97] transition-all font-bold text-sm text-white border border-white/10"
                      >
                        {t("steps.socials.addButton")}
                      </button>
                    </div>
                  </form>
                  {socialInput.trim() && previewProfile && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-cyan">
                      <PlatformIcon platform={previewProfile.platform} className="w-3.5 h-3.5" />
                      <span>
                        {PLATFORM_LABELS[previewProfile.platform]} · {previewProfile.handle}
                      </span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
```

- [ ] **Step 4: Typecheck + Lint**

Run: `cd web && npx tsc --noEmit && npm run lint`
Expected: keine neuen Fehler. (next-intl-Keys werden erst in Task 3 angelegt — zur Laufzeit erst danach testen.)

---

### Task 3: Übersetzungen de/en

**Files:**
- Modify: `web/messages/en.json` (`creatorApplication.steps.socials`, `creatorApplication.errors`)
- Modify: `web/messages/de.json` (gleiche Pfade)

**Interfaces:**
- Consumes: Keys aus Task 2: `steps.socials.platformOther`, `steps.socials.linkPlaceholder`, `steps.socials.handlePlaceholder`, `errors.invalidUsername`.

- [ ] **Step 1: en.json anpassen**

`creatorApplication.steps.socials` neu:

```json
{
  "title": "Social Media Channels",
  "subtitle": "Choose the platform and enter your username — no link needed.",
  "handleLabel": "Username",
  "handlePlaceholder": "@yourname",
  "linkPlaceholder": "twitch.tv/yourname",
  "platformOther": "Other link",
  "addButton": "Add",
  "noAccounts": "Please add at least one social media channel.",
  "listHeader": "Your channels:"
}
```

In `creatorApplication.errors` ergänzen:

```json
"invalidUsername": "Please enter a valid username."
```

- [ ] **Step 2: de.json anpassen**

`creatorApplication.steps.socials` neu:

```json
{
  "title": "Social Media Kanäle",
  "subtitle": "Wähle die Plattform und gib deinen Usernamen ein – ganz ohne Link.",
  "handleLabel": "Username",
  "handlePlaceholder": "@deinname",
  "linkPlaceholder": "twitch.tv/deinname",
  "platformOther": "Anderer Link",
  "addButton": "Hinzufügen",
  "noAccounts": "Bitte füge mindestens einen Social-Media-Kanal hinzu.",
  "listHeader": "Deine Kanäle:"
}
```

In `creatorApplication.errors` ergänzen:

```json
"invalidUsername": "Bitte gib einen gültigen Usernamen ein."
```

- [ ] **Step 3: JSON-Validität prüfen**

Run: `python3 -c "import json; json.load(open('web/messages/en.json')); json.load(open('web/messages/de.json')); print('ok')"`
Expected: `ok`

---

### Task 4: Verifikation

- [ ] **Step 1: Build/Typecheck gesamt**

Run: `cd web && npx tsc --noEmit && npm run lint`
Expected: keine neuen Fehler.

- [ ] **Step 2: Manueller Dev-Server-Check**

Run: `cd web && npm run dev` und die Bewerbungsseite öffnen. Prüfen:
- Instagram + `deinname`, `@deinname` → Chip `Instagram · @deinname`, Preview erscheint.
- TikTok + `name` → URL `https://tiktok.com/@name` (Preview-Handle `@name`).
- Instagram gewählt, `https://instagram.com/foo` eingefügt → akzeptiert; `tiktok.com/@foo` eingefügt → Fehler `invalidUsername`.
- Gleicher Account zweimal → Fehler `duplicateSocial`.
- „Anderer Link" + `twitch.tv/name` → Chip mit Link-Icon.
- Country-Dropdown in Step 1 funktioniert weiter (Öffnen, Auswahl, Escape).
- Review-Step zeigt Chips korrekt; Submit-Payload im Network-Tab enthält URLs.
- Beide Sprachen (de/en) zeigen die neuen Texte.
