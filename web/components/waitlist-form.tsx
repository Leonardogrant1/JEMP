"use client";

import { useState } from "react";

export function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setState(res.ok ? "success" : "error");
  }

  if (state === "success") {
    return (
      <p className="text-brand-cyan font-semibold text-lg">
        Du bist auf der Liste. Wir melden uns! 🎯
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
      <input
        type="email"
        required
        placeholder="deine@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-brand-cyan"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="px-6 py-3 rounded-xl bg-brand-gradient font-bold text-white disabled:opacity-50 whitespace-nowrap"
      >
        {state === "loading" ? "..." : "Frühen Zugang sichern"}
      </button>
      {state === "error" && (
        <p className="text-red-400 text-sm mt-2">
          Etwas ist schiefgelaufen. Versuch es nochmal.
        </p>
      )}
    </form>
  );
}
