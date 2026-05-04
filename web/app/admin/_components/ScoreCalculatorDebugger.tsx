'use client'

import type {
  BodyweightExercise,
  JumpExercise,
  LowerBodyPlyometricsExercise,
  OneRmExercise,
  UpperBodyPlyometricsExercise,
} from '@/lib/score-calculators'
import { ageFactor, toLevel } from '@/lib/score-calculators/shared'
import { useEffect, useMemo, useState } from 'react'

// ─── Norm defaults (mirrors the calculator files) ─────────────

const JUMP_NORMS: Record<JumpExercise, { male: { mean: number; std: number }; female: { mean: number; std: number } }> = {
  vertical_jump: { male: { mean: 28, std: 7 }, female: { mean: 20, std: 5 } },
  broad_jump: { male: { mean: 125, std: 18 }, female: { mean: 110, std: 16 } },
  box_jump: { male: { mean: 65, std: 20 }, female: { mean: 40, std: 15 } },
}
const JUMP_USES_HEIGHT_NORM: Record<JumpExercise, boolean> = {
  vertical_jump: true,
  broad_jump: true,
  box_jump: false,
}

const LOWER_PLYO_NORMS: Record<LowerBodyPlyometricsExercise, { male: { mean: number; std: number }; female: { mean: number; std: number } }> = {
  '10m_sprint': { male: { mean: 1.80, std: 0.15 }, female: { mean: 2.10, std: 0.18 } },
  '30m_sprint': { male: { mean: 4.20, std: 0.35 }, female: { mean: 4.90, std: 0.40 } },
  '10m_sprint_flying': { male: { mean: 1.50, std: 0.12 }, female: { mean: 1.75, std: 0.15 } },
  '505_agility': { male: { mean: 2.40, std: 0.20 }, female: { mean: 2.65, std: 0.22 } },
}

const UPPER_PLYO_NORMS: Record<UpperBodyPlyometricsExercise, { male: { mean: number; std: number }; female: { mean: number; std: number } }> = {
  mb_chest_throw_cm: { male: { mean: 550, std: 120 }, female: { mean: 350, std: 90 } },
  mb_rotational_throw_cm: { male: { mean: 600, std: 130 }, female: { mean: 400, std: 100 } },
  mb_overhead_throw_cm: { male: { mean: 700, std: 150 }, female: { mean: 450, std: 110 } },
  clap_push_ups: { male: { mean: 10, std: 5 }, female: { mean: 4, std: 3 } },
}

const BODYWEIGHT_DEFAULTS: Record<BodyweightExercise, {
  weightMultiplier: number
  norms: { male: { mean: number; std: number }; female: { mean: number; std: number } }
  normsWeighted: { male: { mean: number; std: number }; female: { mean: number; std: number } }
}> = {
  pushup: {
    weightMultiplier: 1.0,
    norms: { male: { mean: 35, std: 15 }, female: { mean: 20, std: 10 } },
    normsWeighted: { male: { mean: 1.3, std: 0.25 }, female: { mean: 1.15, std: 0.2 } },
  },
  pullup: {
    weightMultiplier: 1.3,
    norms: { male: { mean: 12, std: 6 }, female: { mean: 4, std: 4 } },
    normsWeighted: { male: { mean: 1.5, std: 0.3 }, female: { mean: 1.1, std: 0.25 } },
  },
  dips: {
    weightMultiplier: 1.15,
    norms: { male: { mean: 15, std: 7 }, female: { mean: 6, std: 3 } },
    normsWeighted: { male: { mean: 1.4, std: 0.3 }, female: { mean: 1.2, std: 0.25 } },
  },
}

const ONE_RM_NORMS: Record<OneRmExercise, { male: { mean: number; std: number }; female: { mean: number; std: number } }> = {
  back_squat: { male: { mean: 1.4, std: 0.3 }, female: { mean: 1.0, std: 0.25 } },
  hip_thrust: { male: { mean: 1.8, std: 0.4 }, female: { mean: 1.4, std: 0.35 } },
  romanian_deadlift: { male: { mean: 1.7, std: 0.35 }, female: { mean: 1.2, std: 0.3 } },
  bench_press: { male: { mean: 0.9, std: 0.3 }, female: { mean: 0.6, std: 0.22 } },
  weighted_pullups: { male: { mean: 1.5, std: 0.3 }, female: { mean: 1.1, std: 0.25 } },
}

// ─── Types ────────────────────────────────────────────────────

type Category = 'jumps' | 'lower_plyo' | 'upper_plyo' | 'bodyweight' | 'one_rm' | 'mobility'

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'jumps', label: 'Jumps' },
  { id: 'lower_plyo', label: 'Lower Body Plyo' },
  { id: 'upper_plyo', label: 'Upper Body Plyo' },
  { id: 'bodyweight', label: 'Bodyweight Strength' },
  { id: 'one_rm', label: '1RM Strength' },
  { id: 'mobility', label: 'Mobility' },
]

const JUMP_EXERCISES: JumpExercise[] = ['vertical_jump', 'broad_jump', 'box_jump']
const LOWER_PLYO_EXERCISES: LowerBodyPlyometricsExercise[] = ['10m_sprint', '30m_sprint', '10m_sprint_flying', '505_agility']
const UPPER_PLYO_EXERCISES: UpperBodyPlyometricsExercise[] = ['mb_chest_throw_cm', 'mb_rotational_throw_cm', 'mb_overhead_throw_cm', 'clap_push_ups']
const BODYWEIGHT_EXERCISES: BodyweightExercise[] = ['pushup', 'pullup', 'dips']
const ONE_RM_EXERCISES: OneRmExercise[] = ['back_squat', 'hip_thrust', 'romanian_deadlift', 'bench_press', 'weighted_pullups']

// ─── UI helpers ───────────────────────────────────────────────

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

function ExerciseSelect<T extends string>({ value, options, onChange }: {
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">{children}</p>
  )
}

function ScoreDisplay({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-green-400' :
      score >= 50 ? 'text-yellow-400' :
        score >= 25 ? 'text-orange-400' :
          'text-red-400'

  const barColor =
    score >= 75 ? 'bg-green-400' :
      score >= 50 ? 'bg-yellow-400' :
        score >= 25 ? 'bg-orange-400' :
          'bg-red-400'

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[160px] gap-2">
      <p className="text-xs text-gray-400 uppercase tracking-wider">Score</p>
      <p className={`text-7xl font-bold tabular-nums ${color}`}>{score}</p>
      <p className="text-xs text-gray-500">out of 100</p>
      <div className="w-full mt-4 bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────

export function ScoreCalculatorDebugger() {
  const [category, setCategory] = useState<Category>('jumps')

  // Athlete inputs
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

  // ── Editable formula variables ──
  const [normMean, setNormMean] = useState(JUMP_NORMS.vertical_jump.male.mean)
  const [normStd, setNormStd] = useState(JUMP_NORMS.vertical_jump.male.std)
  // bodyweight weighted norms (only used when additionalWeight > 0)
  const [normMeanWeighted, setNormMeanWeighted] = useState(BODYWEIGHT_DEFAULTS.pushup.normsWeighted.male.mean)
  const [normStdWeighted, setNormStdWeighted] = useState(BODYWEIGHT_DEFAULTS.pushup.normsWeighted.male.std)
  // formula-specific vars
  const [refWeight, setRefWeight] = useState(75)  // reference weight in sqrt(ref/bodyWeight)
  const [weightMultiplier, setWeightMultiplier] = useState(1.0) // bodyweight only

  // ── Reset norms when exercise or gender changes ──
  function resetVars() {
    switch (category) {
      case 'jumps': {
        const n = JUMP_NORMS[jumpExercise][gender]
        setNormMean(n.mean); setNormStd(n.std)
        setRefWeight(75)
        break
      }
      case 'lower_plyo': {
        const n = LOWER_PLYO_NORMS[lowerPlyoExercise][gender]
        setNormMean(n.mean); setNormStd(n.std)
        setRefWeight(75)
        break
      }
      case 'upper_plyo': {
        const n = UPPER_PLYO_NORMS[upperPlyoExercise][gender]
        setNormMean(n.mean); setNormStd(n.std)
        break
      }
      case 'bodyweight': {
        const cfg = BODYWEIGHT_DEFAULTS[bwExercise]
        const n = cfg.norms[gender]
        const nw = cfg.normsWeighted[gender]
        setNormMean(n.mean); setNormStd(n.std)
        setNormMeanWeighted(nw.mean); setNormStdWeighted(nw.std)
        setWeightMultiplier(cfg.weightMultiplier)
        setRefWeight(75)
        break
      }
      case 'one_rm': {
        const n = ONE_RM_NORMS[ormExercise][gender]
        setNormMean(n.mean); setNormStd(n.std)
        break
      }
    }
  }

  useEffect(() => { resetVars() }, [category, gender, jumpExercise, lowerPlyoExercise, upperPlyoExercise, bwExercise, ormExercise])

  // ── Inline calculation using editable vars ──
  const score = useMemo(() => {
    switch (category) {
      case 'jumps': {
        const base = JUMP_USES_HEIGHT_NORM[jumpExercise] ? (jumpDistance / bodyHeight) * 100 : jumpDistance
        const weightAdj = base * Math.sqrt(refWeight / bodyWeight)
        const ageAdj = weightAdj / ageFactor(age)
        return toLevel((ageAdj - normMean) / normStd)
      }
      case 'lower_plyo': {
        const weightAdj = timeSeconds * Math.sqrt(refWeight / bodyWeight)
        const ageAdj = weightAdj * ageFactor(age)
        return toLevel((normMean - ageAdj) / normStd)
      }
      case 'upper_plyo': {
        const ageAdj = throwValue / ageFactor(age)
        return toLevel((ageAdj - normMean) / normStd)
      }
      case 'bodyweight': {
        const isWeighted = additionalWeight > 0
        const strengthIndex = isWeighted
          ? (bodyWeight + additionalWeight) / bodyWeight
          : reps * (bodyWeight / refWeight) * weightMultiplier
        const mean = isWeighted ? normMeanWeighted : normMean
        const std = isWeighted ? normStdWeighted : normStd
        const ageAdj = strengthIndex / ageFactor(age)
        return toLevel((ageAdj - mean) / std)
      }
      case 'one_rm': {
        const rel = liftedWeight / bodyWeight
        const ageAdj = rel / ageFactor(age)
        return toLevel((ageAdj - normMean) / normStd)
      }
      case 'mobility':
        return Math.round(mobilityRating * 10)
    }
  }, [
    category, age, bodyWeight, gender, refWeight,
    jumpExercise, jumpDistance, bodyHeight, normMean, normStd,
    lowerPlyoExercise, timeSeconds,
    upperPlyoExercise, throwValue,
    bwExercise, reps, additionalWeight, weightMultiplier, normMeanWeighted, normStdWeighted,
    ormExercise, liftedWeight,
    mobilityRating,
  ])

  const isWeightedBW = category === 'bodyweight' && additionalWeight > 0

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Score Calculator Debugger</h1>

      {/* Category selector */}
      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-4 py-2 rounded-md text-sm transition-colors ${category === c.id
                ? 'bg-white text-gray-950 font-medium'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-[1fr,1fr,200px] gap-6 max-w-4xl">

        {/* Col 1: Athlete inputs */}
        <div className="flex flex-col gap-4">
          <SectionLabel>Athlete</SectionLabel>

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

          {category !== 'mobility' && (
            <div className="border-t border-gray-800 pt-4 flex flex-col gap-4">
              <LabeledInput label="Age" value={age} onChange={setAge} min={10} max={80} />
              <LabeledInput label="Body Weight" value={bodyWeight} onChange={setBodyWeight} min={30} max={200} unit="kg" />
              <GenderSelect value={gender} onChange={setGender} />
            </div>
          )}
        </div>

        {/* Col 2: Formula variables */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <SectionLabel>Variables</SectionLabel>
            <button
              onClick={resetVars}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset to defaults
            </button>
          </div>

          {category !== 'mobility' && (
            <>
              {/* Norm values */}
              {isWeightedBW ? (
                <>
                  <p className="text-xs text-gray-600 italic">Weighted mode (additionalWeight &gt; 0)</p>
                  <LabeledInput label="Norm mean (weighted)" value={normMeanWeighted} onChange={setNormMeanWeighted} step={0.01} />
                  <LabeledInput label="Norm std (weighted)" value={normStdWeighted} onChange={setNormStdWeighted} step={0.01} />
                </>
              ) : (
                <>
                  <LabeledInput label="Norm mean" value={normMean} onChange={setNormMean} step={0.01} />
                  <LabeledInput label="Norm std" value={normStd} onChange={setNormStd} step={0.01} />
                </>
              )}

              {/* Formula-specific vars */}
              {(category === 'jumps' || category === 'lower_plyo' || category === 'bodyweight') && (
                <div className="border-t border-gray-800 pt-4 flex flex-col gap-4">
                  <LabeledInput
                    label="Reference weight"
                    value={refWeight}
                    onChange={setRefWeight}
                    min={1} max={200} unit="kg"
                  />
                  <p className="text-xs text-gray-600">
                    Used in <code className="text-gray-500">√(ref / bodyWeight)</code>
                  </p>
                </div>
              )}

              {category === 'bodyweight' && !isWeightedBW && (
                <LabeledInput
                  label="Weight multiplier"
                  value={weightMultiplier}
                  onChange={setWeightMultiplier}
                  step={0.01}
                />
              )}

              {category === 'jumps' && (
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-xs text-gray-500">
                    Height norm: <span className="text-gray-300">{JUMP_USES_HEIGHT_NORM[jumpExercise] ? 'yes — (distance / height) × 100' : 'no — raw distance'}</span>
                  </p>
                </div>
              )}
            </>
          )}

          {category === 'mobility' && (
            <p className="text-xs text-gray-600 italic">No adjustable variables.<br />Formula: rating × 10</p>
          )}
        </div>

        {/* Col 3: Score */}
        <div className="bg-gray-900 rounded-xl px-6 py-6 border border-gray-800">
          <ScoreDisplay score={score} />
        </div>
      </div>
    </div>
  )
}
