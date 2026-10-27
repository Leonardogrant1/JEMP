"use client";

import { ReactNode, useEffect, useState } from "react";

// Muss zum Parser in der App passen: utils/referral-clipboard.ts
const REF_CODE_COOKIE = "jemp_ref_code";
const CODE_PATTERN = /^[a-zA-Z0-9_-]{2,32}$/;

function readRefCode(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${REF_CODE_COOKIE}=([^;]+)`),
  );
  if (!match) return null;
  const code = decodeURIComponent(match[1]);
  return CODE_PATTERN.test(code) ? code : null;
}

// Download-CTA mit Affiliate-Attribution: kam die Session über /c/[code],
// landet "JEMP:<CODE>" beim Klick im Clipboard — die App liest es im
// Onboarding aus und ordnet das Referral automatisch zu. Der Write muss
// synchron im Click-Handler starten (User-Gesture-Anforderung von Safari);
// da der Store in einem neuen Tab öffnet, läuft er ungestört zu Ende.
export function DownloadLink({
  className,
  children,
  source,
}: {
  className?: string;
  children: ReactNode;
  /** Platzierung des Buttons — landet als "source"-Property am Umami-Event "download" */
  source: string;
}) {
  // Ref-Code erst nach Mount lesen: Cookie gibt es nur im Browser,
  // und das Attribut muss beim Klick im DOM stehen (Umami-Auto-Tracking)
  const [refCode, setRefCode] = useState<string | null>(null);
  useEffect(() => {
    setRefCode(readRefCode());
  }, []);

  function handleClick() {
    const code = readRefCode();
    if (!code || !navigator.clipboard) return;
    navigator.clipboard.writeText(`JEMP:${code.toUpperCase()}`).catch(() => {
      // Clipboard verweigert — Download läuft trotzdem normal weiter
    });
  }

  return (
    <a
      href="/api/download"
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
      data-umami-event="download"
      data-umami-event-source={source}
      {...(refCode ? { "data-umami-event-ref": refCode.toUpperCase() } : {})}
    >
      {children}
    </a>
  );
}
