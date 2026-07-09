"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type FormState = {
  name: string;
  email: string;
  phone: string;
  country: string;
  social_accounts: string[];
  video_link: string;
  description: string;
};

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  country: "DE",
  social_accounts: [],
  video_link: "",
  description: "",
};

type PlatformKey = "instagram" | "tiktok" | "youtube" | "x" | "facebook" | "other";

const PLATFORM_HOSTS: Record<string, PlatformKey> = {
  "instagram.com": "instagram",
  "tiktok.com": "tiktok",
  "youtube.com": "youtube",
  "youtu.be": "youtube",
  "x.com": "x",
  "twitter.com": "x",
  "facebook.com": "facebook",
  "fb.com": "facebook",
};

const PLATFORM_LABELS: Record<PlatformKey, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  x: "X",
  facebook: "Facebook",
  other: "Link",
};

const PLATFORM_ICON_PATHS: Record<Exclude<PlatformKey, "other">, string> = {
  instagram:
    "M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z",
  tiktok:
    "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z",
  youtube:
    "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  x: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z",
  facebook:
    "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
};

function PlatformIcon({ platform, className }: { platform: PlatformKey; className?: string }) {
  if (platform === "other") {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5m7.156-2.344a4 4 0 015.656 0 4 4 0 010 5.656l-1.5 1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656"
        />
      </svg>
    );
  }
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d={PLATFORM_ICON_PATHS[platform]} />
    </svg>
  );
}

type ParsedProfile = { href: string; platform: PlatformKey; handle: string };

function parseProfileUrl(raw: string): ParsedProfile | null {
  let input = raw.trim();
  if (!input) return null;
  if (!/^https?:\/\//i.test(input)) {
    input = "https://" + input;
  }
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m)\./, "").toLowerCase();
  if (!host.includes(".")) return null;

  const platform = PLATFORM_HOSTS[host] ?? "other";
  const firstSegment = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] ?? "");
  // Known platforms need an actual profile path, not just the domain
  if (platform !== "other" && !firstSegment) return null;

  const handle = firstSegment
    ? firstSegment.startsWith("@")
      ? firstSegment
      : "@" + firstSegment
    : host;

  return { href: url.href, platform, handle };
}

const COUNTRY_CODES = ["DE", "AT", "CH", "US", "GB", "FR", "IT", "ES", "NL"];

function CountryDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useLocale();

  const regionNames = new Intl.DisplayNames([locale], { type: "region" });
  const countries = COUNTRY_CODES.map((code) => ({
    code,
    name: `${regionNames.of(code) ?? code} (${code})`,
  }));

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

  const selected = countries.find((c) => c.code === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-left focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all flex items-center justify-between gap-2 cursor-pointer"
      >
        <span className="truncate">{selected?.name ?? value}</span>
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
          {countries.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                role="option"
                aria-selected={c.code === value}
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between gap-2 ${
                  c.code === value
                    ? "text-brand-cyan bg-brand-cyan/10 font-semibold"
                    : "text-white/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="truncate">{c.name}</span>
                {c.code === value && (
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

export function CreatorApplicationForm() {
  const t = useTranslations("creatorApplication");
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4 | 5>(0); // 0: Intro, 1: Personal, 2: Socials, 3: Content, 4: Review, 5: Success
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [socialInput, setSocialInput] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleInputChange = (
    field: keyof FormState,
    value: string | string[]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setValidationError(null);
  };

  const detectedProfile = parseProfileUrl(socialInput);

  const handleAddSocial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socialInput.trim()) return;
    const parsed = parseProfileUrl(socialInput);
    if (!parsed) {
      setValidationError(t("errors.invalidProfileUrl"));
      return;
    }
    if (formData.social_accounts.includes(parsed.href)) {
      setValidationError(t("errors.duplicateSocial"));
      return;
    }
    handleInputChange("social_accounts", [...formData.social_accounts, parsed.href]);
    setSocialInput("");
    setValidationError(null);
  };

  const handleRemoveSocial = (index: number) => {
    const updated = formData.social_accounts.filter((_, i) => i !== index);
    handleInputChange("social_accounts", updated);
  };

  const validateStep = (currentStep: number): boolean => {
    setValidationError(null);

    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.email.trim() || !formData.phone.trim() || !formData.country.trim()) {
        setValidationError(t("errors.required"));
        return false;
      }
      if (!formData.email.includes("@")) {
        setValidationError(t("errors.invalidEmail"));
        return false;
      }
    } else if (currentStep === 2) {
      if (formData.social_accounts.length === 0) {
        setValidationError(t("errors.atLeastOneSocial"));
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.video_link.trim() || !formData.description.trim()) {
        setValidationError(t("errors.required"));
        return false;
      }
      if (!formData.video_link.startsWith("http://") && !formData.video_link.startsWith("https://")) {
        setValidationError(t("errors.invalidUrl"));
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((prev) => (prev + 1) as any);
    }
  };

  const prevStep = () => {
    setStep((prev) => (prev - 1) as any);
    setValidationError(null);
  };

  const handleSubmit = async () => {
    setStatus("loading");
    setValidationError(null);

    const payload = {
      app_slug: "jemp",
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      country: formData.country.trim(),
      social_accounts: formData.social_accounts,
      video_link: formData.video_link.trim(),
      description: formData.description.trim(),
    };

    try {
      const response = await fetch("/api/creator-application", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t("errors.submitFailed"));
      }

      setStep(5); // Success step
      setStatus("idle");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setValidationError(err.message || t("errors.submitFailed"));
    }
  };

  // Steps Progress Indicator
  const progressPercent = step === 0 ? 0 : step === 5 ? 100 : (step / 4) * 100;

  return (
    <div className="min-h-screen bg-brand-bg text-white font-sans flex flex-col relative overflow-hidden selection:bg-brand-cyan/30">
      {/* Full-bleed background photo with layered dark overlays for readability */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <Image
          src="/images/application.jpeg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_30%]"
        />
        <div className="absolute inset-0 bg-brand-bg/30" />
        <div className="absolute inset-0 bg-gradient-to-b from-brand-bg/80 via-transparent to-brand-bg/95" />
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/15 via-transparent to-blue-500/10 mix-blend-overlay" />
      </div>

      {/* Minimal Header */}
      <header className="relative z-10 border-b border-white/10 bg-brand-bg/50 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <Image src="/logo.svg" alt="JEMP" width={28} height={28} priority />
            <span className="font-black text-lg tracking-tight text-white">JEMP</span>
          </Link>
          <span className="ml-4 pl-4 border-l border-white/10 text-white/50 text-sm font-semibold tracking-wider uppercase hidden sm:inline">
            {t("title")}
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-16 px-6 relative z-10">
        <div className="w-full max-w-xl">
          {/* Progress Bar (Only visible after Intro and before Success) */}
          {step > 0 && step < 5 && (
            <div className="mb-8">
              <div className="flex justify-between text-xs text-white/60 mb-2 font-medium">
                <span>{t("progress", { step, total: 4 })}</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div
                  className="h-full bg-brand-gradient transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Form Card Container */}
          <div
            className="rounded-3xl border border-white/10 bg-brand-bg/55 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl transition-all duration-300 relative"
            style={{
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6), inset 0 1px 0 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Step 0: Intro */}
            {step === 0 && (
              <div className="text-center py-4">
                <div className="inline-block px-3 py-1 rounded-full bg-brand-cyan/10 text-brand-cyan text-sm font-bold tracking-wide uppercase mb-6 border border-brand-cyan/20 animate-pulse">
                  {t("intro.badge")}
                </div>
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-6 leading-tight bg-brand-gradient bg-clip-text text-transparent">
                  {t("intro.title")}
                </h1>
                <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-md mx-auto">
                  {t("intro.description")}
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="w-full py-4 rounded-xl bg-brand-gradient font-bold text-white text-base hover:opacity-95 active:scale-[0.99] transition-all shadow-lg shadow-brand-cyan/20 flex items-center justify-center gap-2"
                >
                  {t("intro.cta")}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            )}

            {/* Step 1: Personal Info */}
            {step === 1 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                  {t("steps.personal.title")}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                      {t("steps.personal.name")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("steps.personal.namePlaceholder")}
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                      {t("steps.personal.email")}
                    </label>
                    <input
                      type="email"
                      placeholder={t("steps.personal.emailPlaceholder")}
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                        {t("steps.personal.phone")}
                      </label>
                      <input
                        type="tel"
                        placeholder={t("steps.personal.phonePlaceholder")}
                        value={formData.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                        {t("steps.personal.country")}
                      </label>
                      <CountryDropdown
                        value={formData.country}
                        onChange={(code) => handleInputChange("country", code)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Social Media Handles */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                    {t("steps.socials.title")}
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {t("steps.socials.subtitle")}
                  </p>
                </div>

                <div>
                  <form onSubmit={handleAddSocial} className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        inputMode="url"
                        placeholder={t("steps.socials.handlePlaceholder")}
                        value={socialInput}
                        onChange={(e) => setSocialInput(e.target.value)}
                        className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-5 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.97] transition-all font-bold text-sm text-white border border-white/10"
                    >
                      {t("steps.socials.addButton")}
                    </button>
                  </form>
                  {socialInput.trim() && detectedProfile && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-cyan">
                      <PlatformIcon platform={detectedProfile.platform} className="w-3.5 h-3.5" />
                      <span>
                        {PLATFORM_LABELS[detectedProfile.platform]} · {detectedProfile.handle}
                      </span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest">
                    {t("steps.socials.listHeader")}
                  </label>
                  {formData.social_accounts.length === 0 ? (
                    <p className="text-sm text-white/30 italic">
                      {t("steps.socials.noAccounts")}
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {formData.social_accounts.map((acc, index) => {
                        const profile = parseProfileUrl(acc);
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-sm font-semibold transition-all hover:bg-brand-cyan/15 group"
                          >
                            <PlatformIcon platform={profile?.platform ?? "other"} className="w-4 h-4 shrink-0" />
                            <span>{profile?.handle ?? acc}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSocial(index)}
                              className="text-brand-cyan/50 hover:text-brand-cyan transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Portfolio & Motivation */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                  {t("steps.portfolio.title")}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                      {t("steps.portfolio.videoLabel")}
                    </label>
                    <input
                      type="url"
                      placeholder={t("steps.portfolio.videoPlaceholder")}
                      value={formData.video_link}
                      onChange={(e) => handleInputChange("video_link", e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                      {t("steps.portfolio.descLabel")}
                    </label>
                    <textarea
                      placeholder={t("steps.portfolio.descPlaceholder")}
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      rows={5}
                      className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-brand-cyan focus:bg-white/[0.07] transition-all resize-none"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review Summary */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                    {t("steps.review.title")}
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {t("steps.review.subtitle")}
                  </p>
                </div>

                <div className="space-y-4 bg-white/[0.02] border border-white/5 rounded-2xl p-5 text-sm divide-y divide-white/5">
                  <div className="pb-3 flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-2">
                    <span className="text-white/40 font-medium">{t("steps.personal.name")}</span>
                    <span className="sm:col-span-2 text-white font-semibold">{formData.name}</span>
                  </div>
                  <div className="py-3 flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-2">
                    <span className="text-white/40 font-medium">{t("steps.personal.email")}</span>
                    <span className="sm:col-span-2 text-white font-semibold break-all">{formData.email}</span>
                  </div>
                  <div className="py-3 flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-2">
                    <span className="text-white/40 font-medium">{t("steps.personal.phone")}</span>
                    <span className="sm:col-span-2 text-white font-semibold">{formData.phone}</span>
                  </div>
                  <div className="py-3 flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-2">
                    <span className="text-white/40 font-medium">{t("steps.personal.country")}</span>
                    <span className="sm:col-span-2 text-white font-semibold">{formData.country}</span>
                  </div>
                  <div className="py-3 flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-2">
                    <span className="text-white/40 font-medium">{t("steps.review.socialAccounts")}</span>
                    <div className="sm:col-span-2 flex flex-wrap gap-1.5">
                      {formData.social_accounts.map((acc, index) => {
                        const profile = parseProfileUrl(acc);
                        return (
                          <span
                            key={index}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-brand-cyan/10 text-brand-cyan text-xs font-semibold"
                          >
                            <PlatformIcon platform={profile?.platform ?? "other"} className="w-3.5 h-3.5 shrink-0" />
                            {profile?.handle ?? acc}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="py-3 flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-2">
                    <span className="text-white/40 font-medium">{t("steps.review.videoLink")}</span>
                    <a
                      href={formData.video_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sm:col-span-2 text-brand-cyan hover:underline break-all font-semibold"
                    >
                      {formData.video_link}
                    </a>
                  </div>
                  <div className="pt-3 flex flex-col gap-1 sm:grid sm:grid-cols-3 sm:gap-2">
                    <span className="text-white/40 font-medium">{t("steps.review.description")}</span>
                    <p className="sm:col-span-2 text-white/80 line-clamp-3 leading-relaxed whitespace-pre-line">
                      {formData.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Success State */}
            {step === 5 && (
              <div className="text-center py-6 space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center text-brand-cyan animate-scale-in">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="space-y-3">
                  <h2 className="text-3xl font-black tracking-tight text-white">
                    {t("steps.success.title")}
                  </h2>
                  <p className="text-white/60 leading-relaxed max-w-sm mx-auto">
                    {t("steps.success.subtitle")}
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] transition-all font-bold text-sm text-white border border-white/10"
                  >
                    {t("steps.success.backHome")}
                  </Link>
                </div>
              </div>
            )}

            {/* Validation Error Message */}
            {validationError && (
              <div className="mt-6 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium animate-fade-in">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{validationError}</span>
              </div>
            )}

            {/* Back/Next/Submit Controls (Only for steps 1-4) */}
            {step > 0 && step < 5 && (
              <div className="mt-8 pt-6 border-t border-white/5 flex gap-4">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={status === "loading"}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all font-bold text-sm text-white border border-white/5 disabled:opacity-50"
                >
                  {t("buttons.back")}
                </button>
                {step === 4 ? (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={status === "loading"}
                    className="flex-1 py-3.5 rounded-xl bg-brand-gradient font-bold text-sm text-white hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-brand-cyan/15 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {status === "loading" ? t("steps.review.submitting") : t("steps.review.submit")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex-1 py-3.5 rounded-xl bg-brand-gradient font-bold text-sm text-white hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-brand-cyan/15 flex items-center justify-center gap-2"
                  >
                    {t("buttons.next")}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
