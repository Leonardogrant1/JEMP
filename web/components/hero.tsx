import { WaitlistForm } from "./waitlist-form";

export function Hero() {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="inline-block px-3 py-1 rounded-full bg-white/10 text-sm text-white/60 mb-6 border border-white/10">
        Bald verfügbar für iOS & Android
      </div>
      <h1 className="text-5xl sm:text-7xl font-black tracking-tight mb-6 max-w-3xl leading-tight">
        Trainiere wie ein{" "}
        <span className="bg-brand-gradient bg-clip-text text-transparent">
          Profi-Athlet.
        </span>
      </h1>
      <p className="text-white/60 text-xl max-w-xl mb-10 leading-relaxed">
        JEMP erstellt deinen persönlichen Trainingsplan — abgestimmt auf deine Sportart, dein Level und dein Equipment.
      </p>
      <WaitlistForm />
    </section>
  );
}
