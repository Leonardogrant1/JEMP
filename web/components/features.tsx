const FEATURES = [
  {
    icon: "🥊",
    title: "Sportart-spezifisch",
    description:
      "Ob Boxer, Sprinter oder Basketballer — dein Plan ist auf deine Sportart zugeschnitten.",
  },
  {
    icon: "📈",
    title: "Level-adaptiv",
    description:
      "Das System bewertet dein aktuelles Level und skaliert mit dir mit.",
  },
  {
    icon: "🏋️",
    title: "Dein Equipment",
    description:
      "Nur Übungen, die du mit dem Equipment machen kannst, das du wirklich hast.",
  },
];

export function Features() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto grid sm:grid-cols-3 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="font-bold text-lg mb-2">{f.title}</h3>
            <p className="text-white/50 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
