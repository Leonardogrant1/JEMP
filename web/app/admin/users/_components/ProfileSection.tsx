import type { UserProfile } from '@/app/actions/users'

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold mb-3">
      {children}
    </p>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-900">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs text-right">{value ?? <span className="text-gray-600">—</span>}</span>
    </div>
  )
}

function calculateAge(birthDate: string): number {
  const today = new Date()
  const birth = new Date(birthDate)
  const age = today.getFullYear() - birth.getFullYear()
  const hasHadBirthday =
    today.getMonth() > birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() >= birth.getDate())
  return hasHadBirthday ? age : age - 1
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function ProfileSection({ profile }: { profile: UserProfile }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-lg p-5">
      <h2 className="text-sm font-semibold mb-5">Profil</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
        {/* Left: core data */}
        <div>
          <SectionTitle>Kerndaten</SectionTitle>
          <Field label="Name" value={
            [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null
          } />
          <Field label="E-Mail" value={profile.email} />
          <Field label="Alter" value={
            profile.birth_date ? `${calculateAge(profile.birth_date)} Jahre` : null
          } />
          <Field label="Geschlecht" value={profile.gender} />
          <Field label="Größe" value={profile.height_in_cm ? `${profile.height_in_cm} cm` : null} />
          <Field label="Gewicht" value={profile.weight_in_kg ? `${profile.weight_in_kg} kg` : null} />
          <Field label="Sport" value={profile.sport?.name_de ?? null} />
          <Field label="Rolle" value={profile.role} />
          <Field label="Load Score" value={`${profile.load_score} (${profile.load_profile})`} />
          <Field label="Sprache" value={profile.preferred_language} />
          <Field label="Timezone" value={profile.timezone} />
          <Field label="Onboarded" value={profile.has_onboarded ? 'Ja' : 'Nein'} />
          <Field label="Session-Dauer" value={profile.preferred_session_duration} />
          <Field label="Trainingstage" value={
            profile.preferred_workout_days?.length
              ? profile.preferred_workout_days.join(', ')
              : null
          } />
          <Field label="Erstellt am" value={formatDate(profile.created_at)} />
          <Field label="Zuletzt aktiv" value={formatDate(profile.last_active_at)} />
        </div>

        {/* Right: related data */}
        <div className="mt-6 md:mt-0">
          <SectionTitle>Umgebungen</SectionTitle>
          {profile.environments.length === 0
            ? <p className="text-xs text-gray-600 mb-4">—</p>
            : <div className="flex flex-wrap gap-1.5 mb-4">
                {profile.environments.map(e => (
                  <span key={e.slug} className="text-xs bg-gray-900 border border-gray-800 rounded px-2 py-0.5">{e.name_de}</span>
                ))}
              </div>
          }

          <SectionTitle>Equipment</SectionTitle>
          {profile.equipments.length === 0
            ? <p className="text-xs text-gray-600 mb-4">—</p>
            : <div className="flex flex-wrap gap-1.5 mb-4">
                {profile.equipments.map(e => (
                  <span key={e.slug} className="text-xs bg-gray-900 border border-gray-800 rounded px-2 py-0.5">{e.name_de}</span>
                ))}
              </div>
          }

          <SectionTitle>Fokus-Kategorien</SectionTitle>
          {profile.focus_categories.length === 0
            ? <p className="text-xs text-gray-600 mb-4">—</p>
            : <div className="flex flex-col gap-1 mb-4">
                {profile.focus_categories.map(c => (
                  <div key={c.slug} className="flex items-center justify-between">
                    <span className="text-xs">{c.name_de}</span>
                    <span className="text-xs text-gray-500">Prio {c.priority}</span>
                  </div>
                ))}
              </div>
          }

          <SectionTitle>Kategorie-Level</SectionTitle>
          {profile.category_levels.length === 0
            ? <p className="text-xs text-gray-600">—</p>
            : <div className="flex flex-col gap-2">
                {profile.category_levels.map(c => (
                  <div key={c.slug}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs">{c.name_de}</span>
                      <span className="text-xs text-gray-500">{c.level_score}</span>
                    </div>
                    <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${c.level_score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  )
}
