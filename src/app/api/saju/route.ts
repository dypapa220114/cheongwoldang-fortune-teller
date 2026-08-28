import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { calculateSaju } from '@/lib/saju-calc'
import { readings as fallbackReadings, type Reading } from '@/lib/saju-data'

export const runtime = 'nodejs'

type SajuRequestBody = {
  name?: string
  calendar?: 'solar' | 'lunar'
  year?: number | string
  month?: number | string
  day?: number | string
  time?: string
  unknownTime?: boolean
  isIntercalation?: boolean
  relationship?: string
  gender?: string
  occupation?: string
  topics?: string[]
  worry?: string
}

const READING_SPECS = [
  { key: 'first', title: '첫인상' },
  { key: 'nature', title: '타고난 성향' },
  { key: 'job', title: '직업운' },
  { key: 'wealth', title: '재물운' },
  { key: 'love', title: '애정운' },
  { key: 'health', title: '건강운' },
  { key: 'relations', title: '인간관계' },
] as const

function parseNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

function parseTime(time?: string): { hour?: number; minute?: number } {
  if (!time) return {}
  const match = time.match(/^(\d{1,2})(?::(\d{2}))?$/)
  if (!match) return {}
  const hour = Number(match[1])
  const minute = match[2] !== undefined ? Number(match[2]) : 0
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return {}
  return { hour, minute }
}

function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(candidate)
}

function isReading(value: unknown): value is Reading {
  if (!value || typeof value !== 'object') return false
  const r = value as Reading
  return (
    typeof r.key === 'string' &&
    typeof r.title === 'string' &&
    Array.isArray(r.paragraphs) &&
    r.paragraphs.every((p) => typeof p === 'string')
  )
}

function normalizeReadings(raw: unknown): Reading[] | null {
  if (!raw || typeof raw !== 'object') return null
  const list = (raw as { readings?: unknown }).readings
  if (!Array.isArray(list) || list.length !== READING_SPECS.length) return null
  if (!list.every(isReading)) return null
  return list
}

async function generateReadings(input: {
  name: string
  gender: string
  worry: string
  relationship: string
  occupation: string
  topics: string[]
  pillars: { label: string; value: string }[]
  zodiac: string
  yearGapja: string
  solarDate: { year: number; month: number; day: number }
  lunarDate: { year: number; month: number; day: number }
}): Promise<Reading[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY가 설정되지 않았습니다.')
  }

  const pillarsText = input.pillars.map((p) => `${p.label} ${p.value}`).join(' · ')
  const readingTemplate = READING_SPECS.map((r) => ({
    key: r.key,
    title: r.title,
    paragraphs: ['문단1', '문단2'],
  }))

  const prompt = `당신은 "청월당 영험한 신할머니"입니다. 70대 무당 할머니가 사주를 풀이합니다.
말투: "~하느니라", "~이로다", "~겄어", "~구먼", "~혀", "~느니라" 등 사투리·고어체를 자연스럽게 쓰세요.

[사주 팔자]
${pillarsText}
띠: ${input.zodiac}띠 (${input.yearGapja})
양력: ${input.solarDate.year}년 ${input.solarDate.month}월 ${input.solarDate.day}일
음력: ${input.lunarDate.year}년 ${input.lunarDate.month}월 ${input.lunarDate.day}일

[상담자 정보]
이름: ${input.name || '미입력'}
성별: ${input.gender || '미입력'}
연애/결혼: ${input.relationship || '미입력'}
직업: ${input.occupation || '미입력'}
궁금한 주제: ${input.topics.length > 0 ? input.topics.join(', ') : '미입력'}
고민: ${input.worry || '없음'}

아래 JSON 형식으로만 응답하세요. readings는 정확히 7개, key/title은 고정, paragraphs는 항목마다 1~2개(각 3~5문장).
사주 팔자와 상담자 고민을 반영해 구체적으로 풀이하세요.

${JSON.stringify({ readings: readingTemplate }, null, 2)}`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: 'gemini-3.6-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.85,
    },
  })

  const result = await model.generateContent(prompt)
  const parsed = extractJson(result.response.text())
  const readings = normalizeReadings(parsed)
  if (!readings) {
    throw new Error('AI 응답 형식이 올바르지 않습니다.')
  }
  return readings
}

export async function POST(request: NextRequest) {
  let body: SajuRequestBody

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const year = parseNumber(body.year)
  const month = parseNumber(body.month)
  const day = parseNumber(body.day)

  if (!year || !month || !day) {
    return NextResponse.json({ error: '생년월일을 입력해 주세요.' }, { status: 400 })
  }

  const { hour, minute } = body.unknownTime ? {} : parseTime(body.time)
  const result = calculateSaju({
    calendar: body.calendar ?? 'solar',
    year,
    month,
    day,
    hour,
    minute,
    unknownTime: body.unknownTime,
    isIntercalation: body.isIntercalation,
  })

  if (!result) {
    return NextResponse.json({ error: '유효하지 않은 날짜입니다.' }, { status: 400 })
  }

  const meta = {
    relationship: body.relationship ?? '',
    gender: body.gender ?? '',
    occupation: body.occupation ?? '',
    topics: body.topics ?? [],
    worry: body.worry ?? '',
  }

  let readings: Reading[]
  try {
    readings = await generateReadings({
      name: body.name?.trim() ?? '',
      gender: meta.gender,
      worry: meta.worry,
      relationship: meta.relationship,
      occupation: meta.occupation,
      topics: meta.topics,
      pillars: result.pillars,
      zodiac: result.zodiac,
      yearGapja: result.yearGapja,
      solarDate: result.solarDate,
      lunarDate: result.lunarDate,
    })
  } catch (err) {
    console.error('[saju] Gemini error:', err)
    readings = fallbackReadings
  }

  // 👇 [추가] 선택한 topics가 있을 경우 해당 항목만 결과에서 필터링
  if (Array.isArray(meta.topics) && meta.topics.length > 0) {
    readings = readings.filter((item: any) => 
      meta.topics.includes(item.topic) || 
      meta.topics.includes(item.title) || 
      meta.topics.includes(item.category)
    );
  }
  
  return NextResponse.json({
    name: body.name?.trim() ?? '',
    pillars: result.pillars,
    zodiac: result.zodiac,
    yearGapja: result.yearGapja,
    solarDate: result.solarDate,
    lunarDate: result.lunarDate,
    readings,
    meta,
  })
}
