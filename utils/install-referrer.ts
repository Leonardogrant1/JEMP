// Der Play-Store-Link aus web/app/api/download/route.ts trägt
// referrer=code%3D<CODE> — Google reicht den String beim Install durch.
// Manuell geparst statt URLSearchParams: RNs Implementierung ist lückenhaft.
const CODE_PATTERN = /^[A-Za-z0-9_-]{2,32}$/;

export function parseInstallReferrer(referrer: string | null): string | null {
    if (!referrer) return null;
    for (const pair of referrer.split('&')) {
        const eq = pair.indexOf('=');
        if (eq < 0) continue;
        try {
            const key = decodeURIComponent(pair.slice(0, eq));
            if (key !== 'code') continue;
            const value = decodeURIComponent(pair.slice(eq + 1));
            return CODE_PATTERN.test(value) ? value.toUpperCase() : null;
        } catch {
            return null;
        }
    }
    return null;
}
