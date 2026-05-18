"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";

export function LanguagePicker() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next = locale === "de" ? "en" : "de";
    // Swap locale prefix in current path
    const newPath =
      next === "de"
        ? pathname.replace(/^\/en/, "") || "/"
        : `/en${pathname}`;

    startTransition(() => {
      router.push(newPath);
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/15 text-sm font-bold text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40"
      aria-label="Switch language"
    >
      {locale.toUpperCase()}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        className="opacity-50"
        aria-hidden="true"
      >
        <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
