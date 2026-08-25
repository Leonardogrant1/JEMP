// Die Web-Landingpage legt beim Download-Klick "JEMP:<CODE>" ins
// Clipboard — Format muss mit web/components/download-link.tsx übereinstimmen.
const CLIPBOARD_PATTERN = /^JEMP:([A-Za-z0-9_-]{2,32})$/i;

export function parseReferralClipboard(text: string | null): string | null {
    const match = text?.trim().match(CLIPBOARD_PATTERN);
    return match ? match[1].toUpperCase() : null;
}
