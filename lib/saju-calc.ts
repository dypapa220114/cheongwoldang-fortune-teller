import KoreanLunarCalendar from 'korean-lunar-calendar'

const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const
const GANJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const
const ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const

export type SajuInput = {
  calendar: 'solar' | 'lunar'
  year: number
  month: number
  day: number
  hour?: number
  minute?: number
  unknownTime?: boolean
  isIntercalation?: boolean
}

export type PillarResult = {
  label: '년주' | '월주' | '일주' | '시주'
  value: string
}

/** 일간 천간 기준 자시(子) 시주 천간 인덱스 */
const ZI_HOUR_STEM_BY_DAY_STEM = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8] as const

export type SajuResult = {
  pillars: PillarResult[]
  zodiac: string
  yearGapja: string
  solarDate: { year: number; month: number; day: number }
  lunarDate: { year: number; month: number; day: number; intercalation?: boolean }
}

function hourToBranchIndex(hour: number): number {
  if (hour === 23 || hour === 0) return 0
  return Math.floor((hour + 1) / 2)
}

function pillarValue(stemIndex: number, branchIndex: number): string {
  return `${CHEONGAN[stemIndex]}${GANJI[branchIndex]}`
}

export function calculateSaju(input: SajuInput): SajuResult | null {
  const calendar = new KoreanLunarCalendar()
  const ok =
    input.calendar === 'lunar'
      ? calendar.setLunarDate(input.year, input.month, input.day, input.isIntercalation ?? false)
      : calendar.setSolarDate(input.year, input.month, input.day)

  if (!ok) return null

  const gapja = calendar.getGapJaIndex()
  const solar = calendar.getSolarCalendar()
  const lunar = calendar.getLunarCalendar()

  const yearPillar = pillarValue(gapja.cheongan.year, gapja.ganji.year)
  const monthPillar = pillarValue(gapja.cheongan.month, gapja.ganji.month)
  const dayPillar = pillarValue(gapja.cheongan.day, gapja.ganji.day)

  let hourPillar = '미상'
  if (!input.unknownTime && input.hour !== undefined) {
    const branchIndex = hourToBranchIndex(input.hour)
    const stemIndex = (ZI_HOUR_STEM_BY_DAY_STEM[gapja.cheongan.day] + branchIndex) % 10
    hourPillar = pillarValue(stemIndex, branchIndex)
  }

  return {
    pillars: [
      { label: '년주', value: yearPillar },
      { label: '월주', value: monthPillar },
      { label: '일주', value: dayPillar },
      { label: '시주', value: hourPillar },
    ],
    zodiac: ZODIAC[gapja.ganji.year],
    yearGapja: `${yearPillar}년생`,
    solarDate: solar,
    lunarDate: lunar,
  }
}
