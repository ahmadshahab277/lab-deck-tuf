export type OcrWord = {
  text: string
  x: number
  y: number
  w: number
  h: number
}

export type ParsedSlot = {
  day: number
  start: string
  end: string
  title: string
  courseCode: string
  room: string
  section: string
  classId: string | null
}

export type ScheduleSlot = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  title: string
  course_code: string
  room: string
  section: string
  class_id: string | null
}

export type SlotPhase = 'now' | 'next' | 'later' | 'done'

const DAY_LOOKUP: Record<string, number> = {
  sunday: 0,
  sun: 0,
  monday: 1,
  mon: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  wednesday: 3,
  wed: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  friday: 5,
  fri: 5,
  saturday: 6,
  sat: 6,
}

const DAY_NAMES = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const RANGE_PATTERN = String.raw`(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to)\s*(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?`
const IGNORED = new Set(['free', 'break', 'lunch', 'recess', 'off', 'nil', 'vacant', 'empty', 'none', 'na', 'holiday'])

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

type Line = { y: number; words: OcrWord[] }
type Range = { start: number; end: number }
type Pending = { day: number; start: number; end: number | null; title: string }

export function parseTimetableWords(words: OcrWord[]): ParsedSlot[] {
  const lines = clusterLines(prepareWords(words)).map(glueDays)
  const columns = parseDaysAsColumns(lines)
  const rows = parseDaysAsRows(lines)
  const grid = columns.length >= rows.length ? columns : rows
  if (grid.length > 0) return grid
  return parseLooseLines(lines)
}

export function linkSlotsToClasses<T extends Pick<ParsedSlot, 'courseCode' | 'section' | 'title' | 'classId'>>(
  slots: T[],
  classes: { id: string; course_code: string; section: string; title: string }[],
): T[] {
  return slots.map((slot) => {
    const code = compact(slot.courseCode) || extractCourseCode(slot.title)
    const candidates = classes.filter((course) => {
      const courseCode = compact(course.course_code)
      if (courseCode.length < 4) return false
      return courseCode === code || compact(slot.title).includes(courseCode) || compact(slot.courseCode).includes(courseCode)
    })
    const section = compact(slot.section)
    const narrowed = section ? candidates.filter((course) => compact(course.section) === section) : candidates
    const chosen = narrowed.length === 1 ? narrowed[0] : !section && candidates.length === 1 ? candidates[0] : null
    return {
      ...slot,
      classId: chosen?.id ?? null,
      courseCode: slot.courseCode || chosen?.course_code || code,
    }
  })
}

export function formatClock(value: string): string {
  const [hourText, minuteText] = value.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const twelve = hour % 12 || 12
  return `${twelve}:${String(minute).padStart(2, '0')} ${suffix}`
}

export function formatClockRange(start: string, end: string): string {
  return `${formatClock(start)}–${formatClock(end)}`
}

export function zonedWeekday(date = new Date(), timeZone = 'Asia/Karachi'): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date)
  return DAY_LOOKUP[name.toLowerCase()] ?? 0
}

export function zonedMinutes(date = new Date(), timeZone = 'Asia/Karachi'): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  return (hour % 24) * 60 + minute
}

export function annotateToday<T extends ScheduleSlot>(slots: T[], day: number, minutes: number): (T & { phase: SlotPhase })[] {
  const today = slots
    .filter((slot) => slot.day_of_week === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  let markedNext = false
  return today.map((slot) => {
    const start = clockToMinutes(slot.start_time)
    const end = clockToMinutes(slot.end_time)
    let phase: SlotPhase
    if (minutes >= start && minutes < end) phase = 'now'
    else if (end <= minutes) phase = 'done'
    else if (!markedNext) {
      phase = 'next'
      markedNext = true
    } else phase = 'later'
    return { ...slot, phase }
  })
}

export function nextUpcoming<T extends ScheduleSlot>(slots: T[], day: number, minutes: number): T | null {
  const laterToday = slots
    .filter((slot) => slot.day_of_week === day && clockToMinutes(slot.start_time) > minutes)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
  if (laterToday[0]) return laterToday[0]
  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDay = (day + offset) % 7
    const found = slots
      .filter((slot) => slot.day_of_week === nextDay)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
    if (found[0]) return found[0]
  }
  return null
}

export function timingsForClass<T extends ScheduleSlot>(
  slots: T[],
  course: { id: string; course_code: string; section: string },
): T[] {
  return slots
    .filter((slot) => matchesClass(slot, course))
    .sort((a, b) => weekdayRank(a.day_of_week) - weekdayRank(b.day_of_week) || a.start_time.localeCompare(b.start_time))
}

export function weekdayRank(day: number): number {
  const rank = WEEKDAY_ORDER.indexOf(day)
  return rank === -1 ? day : rank
}

function matchesClass(slot: ScheduleSlot, course: { id: string; course_code: string; section: string }): boolean {
  if (slot.class_id) return slot.class_id === course.id
  const slotCode = compact(slot.course_code)
  const courseCode = compact(course.course_code)
  if (!slotCode || slotCode !== courseCode) return false
  if (!slot.section) return true
  return compact(slot.section) === compact(course.section)
}

function prepareWords(words: OcrWord[]): OcrWord[] {
  return words
    .map((word) => ({ ...word, text: word.text.replace(/[|]/g, '').trim() }))
    .filter((word) => word.text && !/^[-–—_.,]+$/.test(word.text))
}

function clusterLines(words: OcrWord[]): Line[] {
  const sorted = [...words].sort((a, b) => a.y - b.y || a.x - b.x)
  const heights = sorted.map((word) => word.h).sort((a, b) => a - b)
  const median = heights[Math.floor(heights.length / 2)] ?? 16
  const threshold = Math.max(10, median * 0.65)
  const lines: Line[] = []
  for (const word of sorted) {
    const center = word.y + word.h / 2
    const line = lines.find((item) => Math.abs(item.y - center) <= threshold)
    if (line) line.words.push(word)
    else lines.push({ y: center, words: [word] })
  }
  for (const line of lines) line.words.sort((a, b) => a.x - b.x)
  return lines.sort((a, b) => a.y - b.y)
}

function glueDays(line: Line): Line {
  const words: OcrWord[] = []
  for (let index = 0; index < line.words.length; index += 1) {
    const current = line.words[index]
    const following = line.words[index + 1]
    const left = current.text.toLowerCase().replace(/[^a-z]/g, '')
    const right = following ? following.text.toLowerCase().replace(/[^a-z]/g, '') : ''
    const joined = left && right ? `${left}${right}` : ''
    if (following && DAY_NAMES.includes(joined)) {
      words.push({
        text: joined,
        x: current.x,
        y: Math.min(current.y, following.y),
        w: following.x + following.w - current.x,
        h: Math.max(current.h, following.h),
      })
      index += 1
    } else {
      words.push(current)
    }
  }
  return { ...line, words }
}

function parseDaysAsColumns(lines: Line[]): ParsedSlot[] {
  const header = lines.reduce<{ index: number; days: { day: number; x: number }[] } | null>((best, line, index) => {
    const days = uniqueDays(line)
    const other = line.words.filter((word) => tokenDay(word.text) === null && !isTimeToken(word.text)).length
    if (days.length < 2 || other > days.length) return best
    if (!best || days.length > best.days.length) return { index, days }
    return best
  }, null)
  if (!header) return []
  const pending: Pending[] = []
  lines.slice(header.index + 1).forEach((line) => {
    const text = lineText(line)
    const range = allRanges(text)[0]
    const start = range?.start ?? firstTime(text.replace(new RegExp(RANGE_PATTERN, 'gi'), ' '))
    if (start === null) return
    const groups = new Map<number, OcrWord[]>()
    line.words.forEach((word) => {
      if (isTimeToken(word.text) || tokenDay(word.text) !== null) return
      const day = assignBand(word.x + word.w / 2, header.days, (item) => item.x)?.day
      if (day === undefined) return
      groups.set(day, [...(groups.get(day) ?? []), word])
    })
    groups.forEach((group, day) => {
      const title = group.map((word) => word.text).join(' ')
      if (!usableTitle(title)) return
      pending.push({ day, start, end: range?.end ?? null, title })
    })
  })
  return finalize(pending)
}

function parseDaysAsRows(lines: Line[]): ParsedSlot[] {
  const dayRows = lines.flatMap((line) => {
    const word = line.words.find((item) => tokenDay(item.text) !== null)
    const day = word ? tokenDay(word.text) : null
    if (!word || day === null) return []
    return [{ line, day, x: word.x + word.w / 2 }]
  })
  if (dayRows.length < 2) return []
  const xs = dayRows.map((row) => row.x).sort((a, b) => a - b)
  const medianX = xs[Math.floor(xs.length / 2)] ?? 0
  const aligned = dayRows.filter((row) => Math.abs(row.x - medianX) < 90)
  if (aligned.length < 2) return []
  const top = Math.min(...aligned.map((row) => row.line.y))
  let anchors: { start: number; end: number; x: number }[] = []
  ;[...lines].reverse().forEach((line) => {
    if (anchors.length >= 2 || line.y >= top - 4) return
    const found = timeAnchors(line)
    if (found.length >= 2) anchors = found
  })
  if (anchors.length < 2) return []
  const pending: Pending[] = []
  aligned.forEach((row) => {
    const groups = new Map<number, OcrWord[]>()
    row.line.words.forEach((word) => {
      if (tokenDay(word.text) !== null || isTimeToken(word.text)) return
      const anchor = assignBand(word.x + word.w / 2, anchors, (item) => item.x)
      if (!anchor) return
      groups.set(anchor.start, [...(groups.get(anchor.start) ?? []), word])
    })
    groups.forEach((group, start) => {
      const anchor = anchors.find((item) => item.start === start)
      const title = group.map((word) => word.text).join(' ')
      if (!anchor || !usableTitle(title)) return
      pending.push({ day: row.day, start: anchor.start, end: anchor.end, title })
    })
  })
  return finalize(pending)
}

function parseLooseLines(lines: Line[]): ParsedSlot[] {
  const pending: Pending[] = []
  let currentDay: number | null = null
  lines.forEach((line) => {
    const text = lineText(line)
    const day = firstDayInText(text)
    if (day !== null) currentDay = day
    const ranges = allRanges(text)
    if (currentDay === null || ranges.length === 0) return
    const title = cleanupTitle(text)
    if (!usableTitle(title)) return
    ranges.forEach((range) => pending.push({ day: currentDay as number, start: range.start, end: range.end, title }))
  })
  return finalize(pending)
}

function finalize(rows: Pending[]): ParsedSlot[] {
  const byDay = new Map<number, Pending[]>()
  rows.forEach((row) => byDay.set(row.day, [...(byDay.get(row.day) ?? []), row]))
  const slots: ParsedSlot[] = []
  byDay.forEach((list, day) => {
    list.sort((a, b) => a.start - b.start)
    list.forEach((item, index) => {
      const next = list[index + 1]
      const end = item.end ?? (next && next.start > item.start ? next.start : item.start + 60)
      slots.push(makeSlot(day, normalizeRange(item.start, end), item.title))
    })
  })
  return dedupe(slots)
}

function makeSlot(day: number, range: Range, rawTitle: string): ParsedSlot {
  return {
    day,
    start: formatHm(range.start),
    end: formatHm(range.end),
    title: cleanupTitle(rawTitle).slice(0, 180) || 'Class',
    courseCode: extractCourseCode(rawTitle),
    room: extractRoom(rawTitle),
    section: extractSection(rawTitle),
    classId: null,
  }
}

function dedupe(slots: ParsedSlot[]): ParsedSlot[] {
  const seen = new Set<string>()
  return slots
    .filter((slot) => {
      const key = `${slot.day}|${slot.start}|${compact(slot.title)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => weekdayRank(a.day) - weekdayRank(b.day) || a.start.localeCompare(b.start))
}

function uniqueDays(line: Line): { day: number; x: number }[] {
  const days = new Map<number, { day: number; x: number }>()
  line.words.forEach((word) => {
    const day = tokenDay(word.text)
    if (day === null || days.has(day)) return
    days.set(day, { day, x: word.x + word.w / 2 })
  })
  return [...days.values()].sort((a, b) => a.x - b.x)
}

function timeAnchors(line: Line): { start: number; end: number; x: number }[] {
  const anchors: { start: number; end: number; x: number }[] = []
  const used = new Set<number>()
  line.words.forEach((word, index) => {
    if (used.has(index)) return
    const window = line.words.slice(index, index + 5)
    let built = ''
    let consumed = 0
    for (const item of window) {
      built = built ? `${built} ${item.text}` : item.text
      consumed += 1
      if (allRanges(built).length > 0) break
    }
    const range = allRanges(built)[0]
    if (!range) return
    for (let step = 0; step < consumed; step += 1) used.add(index + step)
    anchors.push({ ...range, x: word.x + word.w / 2 })
  })
  return anchors
}

function assignBand<T>(x: number, items: T[], center: (item: T) => number): T | null {
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => center(a) - center(b))
  const centers = sorted.map(center)
  const gap = centers.length > 1 ? Math.max(80, centers[1] - centers[0]) : 140
  if (x < centers[0] - gap * 0.45) return null
  for (let index = 0; index < centers.length; index += 1) {
    const next = centers[index + 1]
    const right = next === undefined ? centers[index] + gap : (centers[index] + next) / 2
    if (x < right) return sorted[index]
  }
  return sorted[sorted.length - 1]
}

function lineText(line: Line): string {
  return line.words.map((word) => word.text).join(' ')
}

function tokenDay(text: string): number | null {
  const token = text.toLowerCase().replace(/[^a-z]/g, '')
  return token ? DAY_LOOKUP[token] ?? null : null
}

function firstDayInText(text: string): number | null {
  const tokens = text.toLowerCase().split(/[^a-z]+/).filter(Boolean)
  for (const token of tokens) {
    if (DAY_LOOKUP[token] !== undefined) return DAY_LOOKUP[token]
  }
  return null
}

function allRanges(text: string): Range[] {
  return [...text.matchAll(new RegExp(RANGE_PATTERN, 'gi'))].flatMap((match) => {
    const range = parseRangeMatch(match)
    return range ? [range] : []
  })
}

function parseRangeMatch(match: RegExpMatchArray): Range | null {
  const startHour = Number(match[1])
  const startMinute = Number(match[2])
  const endHour = Number(match[4])
  const endMinute = Number(match[5])
  if ([startHour, endHour].some((hour) => hour > 23) || [startMinute, endMinute].some((minute) => minute > 59)) return null
  const startMark = readMeridiem(match[3])
  const endMark = readMeridiem(match[6])
  return normalizeRange(
    toMinutes(startHour, startMinute, startMark ?? endMark),
    toMinutes(endHour, endMinute, endMark ?? startMark),
  )
}

function firstTime(text: string): number | null {
  const match = text.match(/(\d{1,2})[:.](\d{2})\s*(a\.?m\.?|p\.?m\.?)?/i)
  if (!match) return null
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return null
  return toMinutes(hour, minute, readMeridiem(match[3]))
}

function readMeridiem(value: string | undefined): 'am' | 'pm' | null {
  if (!value) return null
  return value.toLowerCase().includes('p') ? 'pm' : 'am'
}

function toMinutes(hour: number, minute: number, meridiem: 'am' | 'pm' | null): number {
  let next = hour
  if (meridiem === 'pm' && next < 12) next += 12
  if (meridiem === 'am' && next === 12) next = 0
  return next * 60 + minute
}

function normalizeRange(start: number, end: number): Range {
  let nextEnd = end
  if (nextEnd <= start && nextEnd < 12 * 60 && start >= 7 * 60) nextEnd += 12 * 60
  if (nextEnd <= start) nextEnd = Math.min(start + 60, 23 * 60 + 59)
  return { start, end: nextEnd }
}

function formatHm(minutes: number): string {
  const clamped = Math.max(0, Math.min(minutes, 23 * 60 + 59))
  const hour = Math.floor(clamped / 60)
  const minute = clamped % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function clockToMinutes(value: string): number {
  const [hour, minute] = value.split(':').map(Number)
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0
  return hour * 60 + minute
}

function isTimeToken(text: string): boolean {
  const value = text.trim()
  if (/^(?:-|–|—|to|am|pm|a\.m\.|p\.m\.)$/i.test(value)) return true
  if (/^\d{1,2}[:.]\d{2}(?:\s*(?:a\.?m\.?|p\.?m\.?))?$/i.test(value)) return true
  return new RegExp(`^${RANGE_PATTERN}$`, 'i').test(value)
}

function usableTitle(text: string): boolean {
  const title = cleanupTitle(text)
  if (!title) return false
  return !IGNORED.has(title.toLowerCase().replace(/[^a-z]/g, ''))
}

function cleanupTitle(text: string): string {
  const withoutSchedule = text
    .replace(new RegExp(RANGE_PATTERN, 'gi'), ' ')
    .replace(/\b\d{1,2}[:.]\d{2}\s*(?:a\.?m\.?|p\.?m\.?)?\b/gi, ' ')
    .replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const withoutPlace = withoutSchedule
    .replace(/\b(?:section|sec|sect)\.?\s*[A-Z0-9]{1,3}\b/gi, ' ')
    .replace(/\b(?:room|rm|hall|lh|cr)\.?\s*[-:#]?\s*[A-Z0-9]{1,6}\b/gi, ' ')
    .replace(/\blab\s*[-:#]?\s*\d+[A-Z0-9]*\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return withoutPlace || withoutSchedule
}

function extractCourseCode(text: string): string {
  const match = text.toUpperCase().match(/\b([A-Z]{2,6})\s*[-/]?\s*(\d{3}[A-Z]?)\b/)
  return match ? `${match[1]}${match[2]}` : ''
}

function extractRoom(text: string): string {
  const match = text.match(/\b(?:room|rm|hall|lh|cr|lab)\.?\s*[-:#]?\s*([A-Z0-9]{1,6})\b/i)
  if (!match) return ''
  if (/^lab$/i.test(match[0].split(/\s|[-:#]/)[0] ?? '') && /^[A-Z]$/i.test(match[1])) return ''
  return match[1].toUpperCase()
}

function extractSection(text: string): string {
  const match = text.match(/\b(?:section|sec|sect)\.?\s*([A-Z0-9]{1,3})\b/i)
  return match ? match[1].toUpperCase() : ''
}

function compact(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '')
}
