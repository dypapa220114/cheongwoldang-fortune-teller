'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Clock, MessageCircle } from 'lucide-react'
import { type Pillar, type Reading } from '@/lib/saju-data'

type SajuApiResponse = {
  name: string
  pillars: Pillar[]
  zodiac: string
  yearGapja: string
  readings: Reading[]
}

const SHAMAN_BG = '/images/shaman-bg.png'
const COUPANG_PARTNER_URL = 'https://link.coupang.com/a/gAqKj5oPfM'

// Step model ---------------------------------------------------------------

type StepKind = 'input' | 'loading' | 'pillars' | 'reading' | 'share'

type StepDef = {
  kind: StepKind
  readingIndex?: number
}

const READING_COUNT = 7

// input (0-7) -> loading (8) -> pillars (9) -> readings (10-16) -> share (17)
const steps: StepDef[] = [
  { kind: 'input' }, // 0 name
  { kind: 'input' }, // 1 birthdate
  { kind: 'input' }, // 2 birthtime
  { kind: 'input' }, // 3 relationship
  { kind: 'input' }, // 4 gender
  { kind: 'input' }, // 5 occupation
  { kind: 'input' }, // 6 topics
  { kind: 'input' }, // 7 worry
  { kind: 'loading' }, // 8
  { kind: 'pillars' }, // 9
  ...Array.from({ length: READING_COUNT }, (_, i) => ({ kind: 'reading' as const, readingIndex: i })), // 10-16
  { kind: 'share' }, // 17
]

const TOTAL = steps.length

const YEARS = Array.from({ length: 96 }, (_, i) => 2025 - i)
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

const OCCUPATIONS = ['학생', '직장인', '자영업/사업', '프리랜서', '전문직', '주부', '구직중', '기타']
const TOPICS = ['타고난 성향', '직업운', '재물운', '애정운', '건강운', '인간관계']

export function SajuWizard() {
  const [step, setStep] = useState(0)

  // form state
  const [name, setName] = useState('')
  const [calendar, setCalendar] = useState<'solar' | 'lunar'>('solar')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [time, setTime] = useState('')
  const [unknownTime, setUnknownTime] = useState(false)
  const [relationship, setRelationship] = useState('')
  const [gender, setGender] = useState('')
  const [occupation, setOccupation] = useState('')
  const [topics, setTopics] = useState<string[]>([])
  const [worry, setWorry] = useState('')
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [readings, setReadings] = useState<Reading[]>([])
  const [zodiac, setZodiac] = useState('')
  const [yearGapja, setYearGapja] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sajuError, setSajuError] = useState<string | null>(null)

  const def = steps[step]

  function next() {
    if (step >= TOTAL - 1) return
    setStep((s) => s + 1)
    scrollTop()
  }

  useEffect(() => {
    if (step !== 8 || readings.length > 0) return

    let cancelled = false

    async function fetchSaju() {
      setIsLoading(true)
      setSajuError(null)
      try {
        const res = await fetch('/api/saju', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            buildSajuPayload({
              name,
              calendar,
              year,
              month,
              day,
              time,
              unknownTime,
              relationship,
              gender,
              occupation,
              topics,
              worry,
            }),
          ),
        })
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) {
          const message = data.error ?? '사주 풀이에 실패했습니다.'
          setSajuError(message)
          return
        }
        setPillars(data.pillars)
        setReadings(data.readings)
        setZodiac(data.zodiac)
        setYearGapja(data.yearGapja)
        setStep(9)
        scrollTop()
      } catch {
        if (!cancelled) {
          setSajuError('네트워크 오류가 발생했습니다. 다시 시도해 주세요.')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchSaju()
    return () => {
      cancelled = true
    }
  }, [
    step,
    readings.length,
    name,
    calendar,
    year,
    month,
    day,
    time,
    unknownTime,
    relationship,
    gender,
    occupation,
    topics,
    worry,
  ])

  function prev() {
    if (step <= 0) return
    setStep((s) => s - 1)
    scrollTop()
  }

  function scrollTop() {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }

  function toggleTopic(t: string) {
    setTopics((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  }

  function askAgain() {
    setTopics([])
    setWorry('')
    setReadings([])
    setPillars([])
    setSajuError(null)
    setIsLoading(false)
    setStep(6)
    scrollTop()
  }

  const bgImage = def.kind === 'input' ? SHAMAN_BG : '/images/altar-bg.png'
  const showBack = step > 0 && step < 8

  return (
    <main className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-[#241d16]">
      {/* Header */}
      <header className="relative z-20 flex items-center justify-center bg-white px-4 py-4">
        {showBack && (
          <button
            type="button"
            onClick={prev}
            aria-label="이전 단계"
            className="absolute left-4 text-neutral-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="font-display text-lg tracking-tight text-neutral-900">
          소름돋는 무료사주 청월당
        </h1>
      </header>

      {/* Stage */}
      <div className="relative flex-1 overflow-y-auto">
        {/* background */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${bgImage}')` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-black/25" aria-hidden />

        {/* content per step */}
        <div key={step} className="animate-in fade-in relative z-10 flex h-full min-h-full flex-col duration-500">
          {def.kind === 'input' && (
            <InputStep
              step={step}
              onNext={next}
              state={{
                name,
                setName,
                calendar,
                setCalendar,
                year,
                setYear,
                month,
                setMonth,
                day,
                setDay,
                time,
                setTime,
                unknownTime,
                setUnknownTime,
                relationship,
                setRelationship,
                gender,
                setGender,
                occupation,
                setOccupation,
                topics,
                toggleTopic,
                worry,
                setWorry,
              }}
            />
          )}

          {def.kind === 'loading' && (
            <LoadingStep onNext={next} isLoading={isLoading} error={sajuError} />
          )}

          {def.kind === 'pillars' && (
            <PillarsStep
              onNext={next}
              name={name}
              pillars={pillars}
              zodiac={zodiac}
              yearGapja={yearGapja}
              loading={isLoading && pillars.length === 0}
            />
          )}

          {def.kind === 'reading' && (
            <ReadingStep
              index={def.readingIndex!}
              onNext={next}
              onPrev={prev}
              isLast={step === 10 + READING_COUNT - 1}
              readings={readings}
              loading={isLoading && readings.length === 0}
            />
          )}

          {def.kind === 'share' && <ShareStep onAskAgain={askAgain} />}
        </div>
      </div>
    </main>
  )
}

// Shared bits --------------------------------------------------------------

function SpeechBubble({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="px-4 pt-6">
      <div className="rounded-3xl rounded-tl-md bg-white px-5 py-4 shadow-lg">
        <p className="text-[15px] font-medium leading-relaxed text-neutral-900">{children}</p>
      </div>
      {sub && <p className="mt-3 px-2 text-sm font-medium text-white/90 drop-shadow">{sub}</p>}
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-shaman-green py-4 font-display text-lg text-[#0f2e22] transition active:scale-[0.99] disabled:opacity-50"
    >
      {children}
    </button>
  )
}

function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto">
      <div className="rounded-t-3xl bg-[#3a322c]/85 px-5 pb-6 pt-5 shadow-[0_-8px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
        {children}
      </div>
    </div>
  )
}

// Input steps --------------------------------------------------------------

type InputState = {
  name: string
  setName: (v: string) => void
  calendar: 'solar' | 'lunar'
  setCalendar: (v: 'solar' | 'lunar') => void
  year: string
  setYear: (v: string) => void
  month: string
  setMonth: (v: string) => void
  day: string
  setDay: (v: string) => void
  time: string
  setTime: (v: string) => void
  unknownTime: boolean
  setUnknownTime: (v: boolean) => void
  relationship: string
  setRelationship: (v: string) => void
  gender: string
  setGender: (v: string) => void
  occupation: string
  setOccupation: (v: string) => void
  topics: string[]
  toggleTopic: (t: string) => void
  worry: string
  setWorry: (v: string) => void
}

function InputStep({
  step,
  onNext,
  state,
}: {
  step: number
  onNext: () => void
  state: InputState
}) {
  if (step === 0) {
    return (
      <>
        <SpeechBubble>어여 오게, 이 늙은이가 봐줄 테니 이리 앉어.</SpeechBubble>
        <BottomSheet>
          <label className="mb-2 block text-sm font-medium text-white/90">이름이 뭐라고 했능가?</label>
          <input
            value={state.name}
            onChange={(e) => state.setName(e.target.value)}
            placeholder="예: 홍길동"
            className="mb-4 w-full rounded-2xl bg-white px-4 py-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          <PrimaryButton onClick={onNext} disabled={!state.name.trim()}>
            다음으로
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (step === 1) {
    return (
      <>
        <SpeechBubble>생년월일이 어떻게 되나?</SpeechBubble>
        <BottomSheet>
          <div className="mb-3 flex gap-2">
            <CalToggle active={state.calendar === 'solar'} onClick={() => state.setCalendar('solar')}>
              양력
            </CalToggle>
            <CalToggle active={state.calendar === 'lunar'} onClick={() => state.setCalendar('lunar')}>
              음력
            </CalToggle>
          </div>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <SelectBox value={state.year} onChange={state.setYear} placeholder="연도">
              {YEARS.map((y) => (
                <option key={y} value={y}>{`${y}년`}</option>
              ))}
            </SelectBox>
            <SelectBox value={state.month} onChange={state.setMonth} placeholder="월">
              {MONTHS.map((m) => (
                <option key={m} value={m}>{`${m}월`}</option>
              ))}
            </SelectBox>
            <SelectBox value={state.day} onChange={state.setDay} placeholder="일">
              {DAYS.map((d) => (
                <option key={d} value={d}>{`${d}일`}</option>
              ))}
            </SelectBox>
          </div>
          <PrimaryButton onClick={onNext} disabled={!state.year || !state.month || !state.day}>
            다음으로
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (step === 2) {
    return (
      <>
        <SpeechBubble>태어난 시는 아는가?</SpeechBubble>
        <BottomSheet>
          <div className="relative mb-3">
          <input
              type="time"
              value={state.time}
              disabled={state.unknownTime}
              onChange={(e) => state.setTime(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="w-full rounded-2xl bg-neutral-800 border border-neutral-700 px-4 py-4 text-base text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
            />
            <Clock className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
          </div>
          <label className="mb-4 flex items-center gap-2 text-sm text-white/85">
            <input
              type="checkbox"
              checked={state.unknownTime}
              onChange={(e) => state.setUnknownTime(e.target.checked)}
              className="h-4 w-4 accent-shaman-green"
            />
            모르면 모른다 혀도 괜찮혀.
          </label>
          <PrimaryButton onClick={onNext} disabled={!state.time && !state.unknownTime}>
            다음으로
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (step === 3) {
    return (
      <>
        <SpeechBubble>지금 만나는 사람은 있고?</SpeechBubble>
        <BottomSheet>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {['싱글', '연애 중', '기혼'].map((r) => (
              <ChipButton key={r} active={state.relationship === r} onClick={() => state.setRelationship(r)}>
                {r}
              </ChipButton>
            ))}
          </div>
          <PrimaryButton onClick={onNext} disabled={!state.relationship}>
            다음으로
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (step === 4) {
    return (
      <>
        <SpeechBubble>아들인가 딸인가?</SpeechBubble>
        <BottomSheet>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {['아들', '딸'].map((g) => (
              <ChipButton key={g} active={state.gender === g} onClick={() => state.setGender(g)}>
                {g}
              </ChipButton>
            ))}
          </div>
          <PrimaryButton onClick={onNext} disabled={!state.gender}>
            다음으로
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (step === 5) {
    return (
      <>
        <SpeechBubble sub="먹고사는 일은 뭘로 하고 있능가?">지금 사는 얘기도 좀 해보게.</SpeechBubble>
        <BottomSheet>
          <div className="mb-4 flex flex-wrap gap-2">
            {OCCUPATIONS.map((o) => (
              <ChipButton
                key={o}
                active={state.occupation === o}
                onClick={() => state.setOccupation(o)}
                inline
              >
                {o}
              </ChipButton>
            ))}
          </div>
          <PrimaryButton onClick={onNext} disabled={!state.occupation}>
            다음으로
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (step === 6) {
    return (
      <>
        <SpeechBubble sub="궁금한 것만 콕 짚어서 봐줄 테니, 골라보게.">뭐가 그리 궁금해서 왔능가?</SpeechBubble>
        <BottomSheet>
          <div className="mb-4 flex flex-wrap gap-2">
            {TOPICS.map((t) => (
              <ChipButton key={t} active={state.topics.includes(t)} onClick={() => state.toggleTopic(t)} inline>
                {t}
              </ChipButton>
            ))}
          </div>
          <PrimaryButton onClick={onNext} disabled={state.topics.length === 0}>
            다음으로
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  // step 7 worry
  return (
    <>
      <SpeechBubble>속에 담아둔 근심이 있으면 말해보게</SpeechBubble>
      <BottomSheet>
        <label className="mb-2 block text-sm text-white/85">적어주시면 그 고민에 맞춰 풀이해드려요 (선택)</label>
        <textarea
          value={state.worry}
          onChange={(e) => state.setWorry(e.target.value)}
          placeholder="예: 요새 하는 일이 계속 잘 될지 모르겠어유"
          rows={5}
          className="mb-4 w-full resize-none rounded-2xl border-2 border-shaman-green bg-white px-4 py-4 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
        <PrimaryButton onClick={onNext}>점 봐주오</PrimaryButton>
      </BottomSheet>
    </>
  )
}

function CalToggle({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-5 py-2 text-sm font-medium transition ${
        active ? 'bg-shaman-green/20 text-shaman-green ring-2 ring-shaman-green' : 'bg-white/85 text-neutral-700'
      }`}
    >
      {children}
    </button>
  )
}

function SelectBox({
  value,
  onChange,
  placeholder,
  children,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-2xl bg-white px-3 py-4 text-sm focus:outline-none ${
        value ? 'text-neutral-900' : 'text-neutral-400'
      } ${value ? '' : 'ring-2 ring-shaman-green'}`}
    >
      <option value="" disabled>
        {placeholder}
      </option>
      {children}
    </select>
  )
}

function ChipButton({
  active,
  onClick,
  children,
  inline,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  inline?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl py-3 text-sm font-medium transition ${inline ? 'px-4' : 'w-full'} ${
        active
          ? 'bg-shaman-green/20 text-shaman-green ring-2 ring-shaman-green'
          : 'bg-white/80 text-neutral-700'
      }`}
    >
      {children}
    </button>
  )
}

// Loading step -------------------------------------------------------------

type LoadingFormData = {
  name: string
  calendar: 'solar' | 'lunar'
  year: string
  month: string
  day: string
  time: string
  unknownTime: boolean
  relationship: string
  gender: string
  occupation: string
  topics: string[]
  worry: string
}

function buildSajuPayload(formData: LoadingFormData) {
  return {
    name: formData.name.trim(),
    calendar: formData.calendar,
    year: formData.year,
    month: formData.month,
    day: formData.day,
    time: formData.unknownTime ? undefined : formData.time,
    unknownTime: formData.unknownTime,
    relationship: formData.relationship,
    gender: formData.gender,
    occupation: formData.occupation,
    topics: formData.topics,
    worry: formData.worry.trim(),
  }
}

function LoadingStep({
  onNext,
  isLoading,
  error,
}: {
  onNext: () => void
  isLoading: boolean
  error: string | null
}) {
  return (
    <div className="flex flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-3 self-center rounded-3xl rounded-tr-md bg-white/85 px-6 py-4 text-center shadow-lg">
        <p
          className={`text-[15px] font-medium text-neutral-900 ${
            !error ? 'animate-pulse' : ''
          }`}
        >
          {error
            ? '이런, 신령님이 잠시 머뭇거리시는구먼...'
            : '가만있어봐... 신령님이 오시는 중이니께...'}
        </p>
        {isLoading && !error && (
          <p className="mt-2 animate-pulse text-sm text-neutral-500">
            만세력을 펼치고 점괘를 읽는 중이로다...
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      <div className="rounded-3xl bg-white/80 px-5 py-6 text-center shadow-lg backdrop-blur">
        {error ? (
          <button
            type="button"
            onClick={onNext}
            className="w-full rounded-2xl bg-[#1f2430] py-4 font-display text-base text-white active:scale-[0.99]"
          >
            일단 넘어가기
          </button>
        ) : (
          isLoading && (
            <a
              href={COUPANG_PARTNER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-2xl bg-[#1f2430] py-4 font-display text-base text-white active:scale-[0.99]"
            >
              기다리는 동안 오늘의 혜택 챙겨가기
            </a>
          )
        )}
        <p className="mt-5 text-xs leading-relaxed text-neutral-500">
          이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
        </p>
      </div>
    </div>
  )
}

// Pillars step -------------------------------------------------------------

function PillarsStep({
  onNext,
  name,
  pillars,
  zodiac,
  yearGapja,
  loading,
}: {
  onNext: () => void
  name: string
  pillars: Pillar[]
  zodiac?: string
  yearGapja?: string
  loading?: boolean
}) {
  const displayName = name.trim() || '손님'
  const zodiacLabel = zodiac ? `${zodiac}띠` : '띠'
  const gapjaLabel = yearGapja ?? ''
  return (
    <div className="flex flex-1 flex-col justify-end p-4">
      <div className="rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="font-display text-xl text-shaman-green-dark">{displayName}님의 사주 네 기둥</h2>
        <p className="mt-1 text-xs text-neutral-500">70대 할머니 무당의 풀이</p>
        <p className="mt-4 font-display text-2xl text-neutral-900">
          {loading ? '사주를 계산하는 중...' : [zodiacLabel, gapjaLabel].filter(Boolean).join(' · ')}
        </p>

        <div className="mt-5 grid grid-cols-4 gap-2">
          {pillars.length > 0 ? (
            pillars.map((p) => (
              <div key={p.label} className="rounded-2xl bg-neutral-100 py-4 text-center">
                <p className="text-xs text-neutral-500">{p.label}</p>
                <p className="mt-1 font-display text-xl text-neutral-900">{p.value}</p>
              </div>
            ))
          ) : (
            <p className="col-span-4 py-6 text-center text-sm text-neutral-500">
              {loading ? '사주를 계산하는 중...' : '사주 데이터를 불러오지 못했습니다.'}
            </p>
          )}
        </div>

        <p className="mt-4 text-xs text-neutral-400">
          ※ 절기·태양시 보정까지 반영한 만세력 계산값이에요.
        </p>

        <div className="mt-5">
          <PrimaryButton onClick={onNext} disabled={loading || pillars.length === 0}>
            다음
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}

// Reading steps ------------------------------------------------------------

function ReadingStep({
  index,
  onNext,
  onPrev,
  isLast,
  readings,
  loading,
}: {
  index: number
  onNext: () => void
  onPrev: () => void
  isLast: boolean
  readings: Reading[]
  loading?: boolean
}) {
  const reading = readings[index]

  if (!reading) {
    return (
      <div className="flex flex-1 flex-col justify-end p-4">
        <div className="rounded-3xl bg-white p-6 shadow-2xl text-center">
          <p className="text-[15px] text-neutral-600">
            {loading ? '신령님이 풀이를 적는 중이로다...' : '풀이 결과를 불러오지 못했습니다.'}
          </p>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onPrev}
            className="rounded-2xl bg-neutral-300/90 px-6 py-4 font-display text-base text-neutral-700 active:scale-[0.99]"
          >
            이전
          </button>
          <div className="flex-1">
            <PrimaryButton onClick={onNext} disabled={loading}>
              {isLast ? '결과 공유하기' : '다음'}
            </PrimaryButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col justify-end p-4">
      <div className="rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="font-display text-lg text-shaman-green-dark">{reading.title}</h2>
        <div className="mt-3 space-y-4">
          {reading.paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-relaxed text-neutral-800">
              {p}
            </p>
          ))}
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-2xl bg-neutral-300/90 px-6 py-4 font-display text-base text-neutral-700 active:scale-[0.99]"
        >
          이전
        </button>
        <div className="flex-1">
          <PrimaryButton onClick={onNext}>{isLast ? '결과 공유하기' : '다음'}</PrimaryButton>
        </div>
      </div>
    </div>
  )
}

// Share step ---------------------------------------------------------------

function ShareStep({ onAskAgain }: { onAskAgain: () => void }) {
  async function handleShare() {
    const url = window.location.href

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: '소름돋는 무료사주 청월당',
          text: '단 3분 만에 무료로 확인하는 AI 사주풀이!',
          url,
        })
      } catch {
        // 사용자가 공유를 취소한 경우
      }
      return
    }

    await navigator.clipboard.writeText(url)
    alert('사주 공유 링크가 복사되었습니다!')
  }

  return (
    <div className="flex flex-1 flex-col justify-end p-4 pb-6">
      <div className="space-y-3">
        <button
          type="button"
          onClick={handleShare}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-kakao py-4 font-display text-lg text-kakao-foreground active:scale-[0.99]"
        >
          <MessageCircle className="h-5 w-5 fill-kakao-foreground" />
          카카오톡으로 친구에게 공유하기
        </button>
        <button
          type="button"
          onClick={onAskAgain}
          className="flex w-full items-center justify-center gap-1 rounded-2xl bg-white/85 py-4 font-display text-base text-neutral-700 active:scale-[0.99]"
        >
          다른 궁금증 물어보기
        </button>
      </div>
    </div>
  )
}
