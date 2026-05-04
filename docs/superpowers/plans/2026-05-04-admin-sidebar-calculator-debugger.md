# Admin Sidebar + Score Calculator Debugger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible sidebar to the admin panel with two tabs — Exercises (existing content) and a Score Calculator Debugger tool.

**Architecture:** The admin `layout.tsx` gets a flex-based shell that wraps a client-side `AdminSidebar` on the left and the existing `children` content area on the right. A new route `/admin/calculator` hosts the debugger page. The sidebar persists its collapsed state in localStorage.

**Tech Stack:** Next.js 16 App Router, React (client components), Tailwind CSS, score-calculator functions from `lib/score-calculators/`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `web/app/admin/layout.tsx` | Add flex shell + AdminSidebar |
| Create | `web/app/admin/_components/AdminSidebar.tsx` | Collapsible sidebar with Exercises / Calculator tabs |
| Create | `web/app/admin/calculator/page.tsx` | Route wrapper for the debugger |
| Create | `web/app/admin/_components/ScoreCalculatorDebugger.tsx` | Full calculator UI — selector, inputs, live output |

---

## Task 1: Update admin layout to flex shell

**Files:**
- Modify: `web/app/admin/layout.tsx`

- [ ] **Step 1: Update layout.tsx**

Replace the `<main>` wrapper with a flex shell that places `AdminSidebar` left and content right. The sidebar import is a forward reference — it will be created in Task 2.

```tsx
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { supabase as adminClient } from '@/lib/supabase'
import { SignOutButton } from './_components/SignOutButton'
import { AdminSidebar } from './_components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: profile } = await adminClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/sign-in')

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between shrink-0">
        <Link href="/admin" className="text-lg font-semibold hover:opacity-80">
          JEMP Admin
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-400">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify the page still compiles (import error expected since AdminSidebar doesn't exist yet)**

```bash
cd web && npx tsc --noEmit 2>&1 | grep AdminSidebar
```

Expected: error about missing module (that's fine — confirms the import is wired up correctly).

---

## Task 2: Create AdminSidebar component

**Files:**
- Create: `web/app/admin/_components/AdminSidebar.tsx`

- [ ] **Step 1: Create the sidebar**

The sidebar has two states: expanded (220px) and collapsed (64px). State lives in localStorage under the key `admin-sidebar-collapsed`. It shows icon + label when expanded, icon only when collapsed. Active tab is determined by `usePathname`.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

const STORAGE_KEY = 'admin-sidebar-collapsed'

type Tab = {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  matchPrefix: string
}

const TABS: Tab[] = [
  {
    id: 'exercises',
    label: 'Exercises',
    href: '/admin',
    matchPrefix: '/admin',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5M3.75 6h16.5M3.75 18h16.5" />
      </svg>
    ),
  },
  {
    id: 'calculator',
    label: 'Calculator',
    href: '/admin/calculator',
    matchPrefix: '/admin/calculator',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm2.25-4.5h.008v.008H10.5v-.008zm0 2.25h.008v.008H10.5V13.5zm0 2.25h.008v.008H10.5v-.008zm2.25-4.5h.008v.008H12.75v-.008zm0 2.25h.008v.008H12.75V13.5zm0 2.25h.008v.008H12.75v-.008zM6.75 19.5h10.5a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0017.25 4.5H6.75A2.25 2.25 0 004.5 6.75v10.5A2.25 2.25 0 006.75 19.5z" />
      </svg>
    ),
  },
]

export function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setCollapsed(stored === 'true')
  }, [])

  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  function isActive(tab: Tab) {
    if (tab.id === 'exercises') {
      // Active on /admin and /admin/[id] but NOT /admin/calculator
      return pathname === '/admin' || (pathname.startsWith('/admin/') && !pathname.startsWith('/admin/calculator'))
    }
    return pathname.startsWith(tab.matchPrefix)
  }

  return (
    <aside
      className="shrink-0 border-r border-gray-800 bg-gray-950 flex flex-col transition-all duration-200"
      style={{ width: collapsed ? 64 : 220 }}
    >
      {/* Toggle button */}
      <button
        onClick={toggle}
        className="flex items-center justify-center h-12 border-b border-gray-800 text-gray-400 hover:text-white transition-colors"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {collapsed
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7M19 19l-7-7 7-7" />
          }
        </svg>
      </button>

      {/* Nav tabs */}
      <nav className="flex flex-col gap-1 p-2">
        {TABS.map(tab => {
          const active = isActive(tab)
          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.href)}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-left w-full
                ${active
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
                }`}
              title={collapsed ? tab.label : undefined}
            >
              <span className="shrink-0">{tab.icon}</span>
              {!collapsed && <span className="truncate">{tab.label}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Start dev server and verify sidebar renders on /admin**

```bash
cd web && npm run dev
```

Open `http://localhost:3000/admin`. You should see a narrow sidebar on the left with two icon buttons and the exercises table on the right. Clicking the toggle arrow should expand/collapse the sidebar. Labels appear when expanded.

- [ ] **Step 3: Verify active state**

Navigate between `/admin` and click the Calculator tab (will 404 for now — that's expected). Exercises tab should be highlighted when on `/admin`.

---

## Task 3: Create calculator route page

**Files:**
- Create: `web/app/admin/calculator/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
import { ScoreCalculatorDebugger } from '../_components/ScoreCalculatorDebugger'

export default function CalculatorPage() {
  return <ScoreCalculatorDebugger />
}
```

---

## Task 4: Create ScoreCalculatorDebugger component

**Files:**
- Create: `web/app/admin/_components/ScoreCalculatorDebugger.tsx`

This is the main calculator UI. It has:
- A category selector at the top (Jumps / Lower Body Plyo / Upper Body Plyo / Bodyweight Strength / 1RM Strength / Mobility)
- Below: a two-column layout — inputs left, result right
- Result updates live as inputs change (no submit button)

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState, useMemo } from 'react'
import {
  jumpLevel, type JumpExercise,
  lowerBodyPlyometricsLevel, type LowerBodyPlyometricsExercise,
  upperBodyPlyometricsLevel, type UpperBodyPlyometricsExercise,
  bodyweightStrengthLevel, type BodyweightExercise,
  oneRmLevel, type OneRmExercise,
  mobilityEaseLevel,
} from '@/lib/score-calculators'

type Category =
  | 'jumps'
  | 'lower_plyo'
  | 'upper_plyo'
  | 'bodyweight'
  | 'one_rm'
  | 'mobility'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'jumps',      label: 'Jumps' },
  { id: 'lower_plyo', label: 'Lower Body Plyo' },
  { id: 'upper_plyo', label: 'Upper Body Plyo' },
  { id: 'bodyweight', label: 'Bodyweight Strength' },
  { id: 'one_rm',     label: '1RM Strength' },
  { id: 'mobility',   label: 'Mobility' },
]

const JUMP_EXERCISES: JumpExercise[] = ['vertical_jump', 'broad_jump', 'box_jump']
const LOWER_PLYO_EXERCISES: LowerBodyPlyometricsExercise[] = ['10m_sprint', '30m_sprint', '10m_sprint_flying', '505_agility']
const UPPER_PLYO_EXERCISES: UpperBodyPlyometricsExercise[] = ['mb_chest_throw_cm', 'mb_rotational_throw_cm', 'mb_overhead_throw_cm', 'clap_push_ups']
const BODYWEIGHT_EXERCISES: BodyweightExercise[] = ['pushup', 'pullup', 'dips']
const ONE_RM_EXERCISES: OneRmExercise[] = ['back_squat', 'hip_thrust', 'romanian_deadlift', 'bench_press', 'weighted_pullups']

function LabeledInput({
  label, value, onChange, min, max, step = 1, unit,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">{label}{unit && ` (${unit})`}</label>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={e => onChange(Number(e.target.value))}
        className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-gray-500"
      />
    </div>
  )
}

function GenderSelect({ value, onChange }: { value: 'male' | 'female'; onChange: (v: 'male' | 'female') => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">Gender</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as 'male' | 'female')}
        className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-gray-500"
      >
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>
    </div>
  )
}

function ExerciseSelect<T extends string>({
  value, options, onChange,
}: {
  value: T
  options: T[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400">Exercise</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value as T)}
        className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:border-gray-500"
      >
        {options.map(o => (
          <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>
        ))}
      </select>
    </div>
  )
}

function ScoreDisplay({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-green-400' :
    score >= 50 ? 'text-yellow-400' :
    score >= 25 ? 'text-orange-400' :
    'text-red-400'

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-2">
      <p className="text-xs text-gray-400 uppercase tracking-wider">Score</p>
      <p className={`text-7xl font-bold tabular-nums ${color}`}>{score}</p>
      <p className="text-xs text-gray-500">out of 100</p>
      <div className="w-full mt-4 bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            score >= 75 ? 'bg-green-400' :
            score >= 50 ? 'bg-yellow-400' :
            score >= 25 ? 'bg-orange-400' :
            'bg-red-400'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

export function ScoreCalculatorDebugger() {
  const [category, setCategory] = useState<Category>('jumps')

  // Shared inputs
  const [age, setAge] = useState(25)
  const [bodyWeight, setBodyWeight] = useState(75)
  const [gender, setGender] = useState<'male' | 'female'>('male')

  // Jumps
  const [jumpExercise, setJumpExercise] = useState<JumpExercise>('vertical_jump')
  const [jumpDistance, setJumpDistance] = useState(50)
  const [bodyHeight, setBodyHeight] = useState(180)

  // Lower plyo
  const [lowerPlyoExercise, setLowerPlyoExercise] = useState<LowerBodyPlyometricsExercise>('10m_sprint')
  const [timeSeconds, setTimeSeconds] = useState(1.8)

  // Upper plyo
  const [upperPlyoExercise, setUpperPlyoExercise] = useState<UpperBodyPlyometricsExercise>('mb_chest_throw_cm')
  const [throwValue, setThrowValue] = useState(550)

  // Bodyweight
  const [bwExercise, setBwExercise] = useState<BodyweightExercise>('pushup')
  const [reps, setReps] = useState(20)
  const [additionalWeight, setAdditionalWeight] = useState(0)

  // 1RM
  const [ormExercise, setOrmExercise] = useState<OneRmExercise>('back_squat')
  const [liftedWeight, setLiftedWeight] = useState(100)

  // Mobility
  const [mobilityRating, setMobilityRating] = useState(7)

  const score = useMemo(() => {
    switch (category) {
      case 'jumps':
        return jumpLevel(jumpDistance, bodyHeight, bodyWeight, age, gender, jumpExercise)
      case 'lower_plyo':
        return lowerBodyPlyometricsLevel(timeSeconds, bodyWeight, age, gender, lowerPlyoExercise)
      case 'upper_plyo':
        return upperBodyPlyometricsLevel(throwValue, bodyWeight, age, gender, upperPlyoExercise)
      case 'bodyweight':
        return bodyweightStrengthLevel(reps, bodyWeight, age, gender, bwExercise, additionalWeight)
      case 'one_rm':
        return oneRmLevel(liftedWeight, bodyWeight, age, gender, ormExercise)
      case 'mobility':
        return mobilityEaseLevel(mobilityRating)
    }
  }, [
    category, age, bodyWeight, gender,
    jumpExercise, jumpDistance, bodyHeight,
    lowerPlyoExercise, timeSeconds,
    upperPlyoExercise, throwValue,
    bwExercise, reps, additionalWeight,
    ormExercise, liftedWeight,
    mobilityRating,
  ])

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Score Calculator Debugger</h1>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${
              category === c.id
                ? 'bg-white text-gray-950 font-medium'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-2 gap-8 max-w-3xl">
        {/* Inputs */}
        <div className="flex flex-col gap-4">

          {/* Category-specific exercise selector + primary input */}
          {category === 'jumps' && (
            <>
              <ExerciseSelect value={jumpExercise} options={JUMP_EXERCISES} onChange={setJumpExercise} />
              <LabeledInput label="Distance / Height" value={jumpDistance} onChange={setJumpDistance} min={0} max={300} unit="cm" />
              <LabeledInput label="Body Height" value={bodyHeight} onChange={setBodyHeight} min={140} max={220} unit="cm" />
            </>
          )}

          {category === 'lower_plyo' && (
            <>
              <ExerciseSelect value={lowerPlyoExercise} options={LOWER_PLYO_EXERCISES} onChange={setLowerPlyoExercise} />
              <LabeledInput label="Time" value={timeSeconds} onChange={setTimeSeconds} min={0.5} max={10} step={0.01} unit="s" />
            </>
          )}

          {category === 'upper_plyo' && (
            <>
              <ExerciseSelect value={upperPlyoExercise} options={UPPER_PLYO_EXERCISES} onChange={setUpperPlyoExercise} />
              <LabeledInput
                label={upperPlyoExercise === 'clap_push_ups' ? 'Reps' : 'Distance'}
                value={throwValue}
                onChange={setThrowValue}
                min={0}
                max={upperPlyoExercise === 'clap_push_ups' ? 50 : 1500}
                unit={upperPlyoExercise === 'clap_push_ups' ? 'reps' : 'cm'}
              />
            </>
          )}

          {category === 'bodyweight' && (
            <>
              <ExerciseSelect value={bwExercise} options={BODYWEIGHT_EXERCISES} onChange={setBwExercise} />
              <LabeledInput label="Reps" value={reps} onChange={setReps} min={0} max={200} />
              <LabeledInput label="Additional Weight" value={additionalWeight} onChange={setAdditionalWeight} min={0} max={100} unit="kg" />
            </>
          )}

          {category === 'one_rm' && (
            <>
              <ExerciseSelect value={ormExercise} options={ONE_RM_EXERCISES} onChange={setOrmExercise} />
              <LabeledInput label="Lifted Weight" value={liftedWeight} onChange={setLiftedWeight} min={0} max={500} unit="kg" />
            </>
          )}

          {category === 'mobility' && (
            <LabeledInput label="Ease Rating" value={mobilityRating} onChange={setMobilityRating} min={1} max={10} />
          )}

          {/* Shared inputs (hidden for mobility — not used) */}
          {category !== 'mobility' && (
            <>
              <div className="border-t border-gray-800 pt-4 flex flex-col gap-4">
                <LabeledInput label="Age" value={age} onChange={setAge} min={10} max={80} />
                <LabeledInput label="Body Weight" value={bodyWeight} onChange={setBodyWeight} min={30} max={200} unit="kg" />
                <GenderSelect value={gender} onChange={setGender} />
              </div>
            </>
          )}
        </div>

        {/* Score */}
        <div className="bg-gray-900 rounded-xl px-8 py-6 border border-gray-800">
          <ScoreDisplay score={score} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Open the dev server and navigate to `/admin/calculator`**

```bash
cd web && npm run dev
```

Open `http://localhost:3000/admin/calculator`. Verify:
- Category buttons at top switch between calculator types
- Inputs update the score live
- Score bar fills/changes color based on value
- Sidebar shows Calculator tab as active

- [ ] **Step 3: Test edge cases**
  - Set age to extreme values (e.g. 18, 60) — score should shift noticeably
  - Switch between male/female — score should change
  - Bodyweight: add `additionalWeight > 0` — should switch to weighted norms
  - Mobility: rating 1 → score 10, rating 10 → score 100
  - Exercises tab in sidebar should be active on `/admin` and `/admin/[id]`, not on `/admin/calculator`

---

## Task 5: Verify sidebar collapse persistence

- [ ] **Step 1: Expand sidebar, reload page**

In the browser at `/admin`, click the toggle button to expand the sidebar. Reload the page. The sidebar should still be expanded.

- [ ] **Step 2: Collapse, reload**

Collapse the sidebar. Reload. Should remain collapsed.

- [ ] **Step 3: Verify no layout shift on load**

The sidebar initializes collapsed (`useState(true)`) and reads localStorage in `useEffect`. This means there may be a brief flash from collapsed→expanded on first load if the user had it expanded. This is acceptable — no fix needed unless it's visually jarring. Just note it.
