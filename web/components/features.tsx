const FEATURES = [
  {
    icon: "/Basketball.svg",
    title: "Sportart-spezifisch",
    description:
      "Ob Boxer, Sprinter oder Basketballer — dein Plan ist auf deine Sportart zugeschnitten.",
  },
  {
    icon: "/Chart.svg",
    title: "Level-adaptiv",
    description:
      "Das System bewertet dein aktuelles Level und skaliert mit dir mit.",
  },
  {
    icon: "/Gym.svg",
    title: "Dein Equipment",
    description:
      "Nur Übungen, die du mit dem Equipment machen kannst, das du wirklich hast.",
  },
];

function GradientIcon({ src, alt }: { src: string; alt: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      style={{
        maskImage: `url(${src})`,
        maskSize: "contain",
        maskRepeat: "no-repeat",
        maskPosition: "center",
        background: "linear-gradient(135deg, #14b8a6, #3b82f6)",
        width: 32,
        height: 32,
      }}
    />
  );
}

export function Features() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="mb-4">
              <GradientIcon src={f.icon} alt={f.title} />
            </div>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
