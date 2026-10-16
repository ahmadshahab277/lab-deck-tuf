import { describe, expect, it } from 'vitest'
import { FALL_2026_SLOTS } from './fallTimetable'
import {
  annotateToday,
  formatClockRange,
  linkSlotsToClasses,
  nextUpcoming,
  parseTimetableWords,
  timingsForClass,
  type OcrWord,
  type ScheduleSlot,
} from './timetable'

function word(text: string, x: number, y: number, w = Math.max(24, text.length * 8)): OcrWord {
  return { text, x, y, w, h: 16 }
}

describe('timetable parsing', () => {
  it('reads a grid with days across the top', () => {
    const slots = parseTimetableWords([
      word('Mon', 200, 10),
      word('Tue', 420, 10),
      word('Wed', 640, 10),
      word('08:00-09:30', 20, 50, 90),
      word('CS101', 190, 50),
      word('Sec', 250, 50, 28),
      word('A', 290, 50, 16),
      word('MA201', 410, 50),
      word('Break', 630, 50),
      word('09:30-11:00', 20, 90, 90),
      word('Lab', 190, 90),
      word('3', 230, 90, 16),
      word('Physics', 410, 90),
    ])

    expect(slots.map((slot) => [slot.day, slot.start, slot.end, slot.title, slot.courseCode, slot.section, slot.room])).toEqual([
      [1, '08:00', '09:30', 'CS101', 'CS101', 'A', ''],
      [1, '09:30', '11:00', 'Lab 3', '', '', '3'],
      [2, '08:00', '09:30', 'MA201', 'MA201', '', ''],
      [2, '09:30', '11:00', 'Physics', '', '', ''],
    ])
  })

  it('reads a grid with days down the side', () => {
    const slots = parseTimetableWords([
      word('08:00-09:30', 220, 10, 100),
      word('11:00-12:30', 480, 10, 100),
      word('Monday', 20, 50),
      word('CS-101', 230, 50),
      word('Room', 310, 50),
      word('12', 330, 50, 20),
      word('Tuesday', 20, 90),
      word('Chemistry', 470, 90),
    ])

    expect(slots).toEqual([
      expect.objectContaining({ day: 1, start: '08:00', end: '09:30', title: 'CS-101', courseCode: 'CS101', room: '12' }),
      expect.objectContaining({ day: 2, start: '11:00', end: '12:30', title: 'Chemistry' }),
    ])
  })

  it('reads a simple list when the picture is not a grid', () => {
    const slots = parseTimetableWords([
      word('Monday', 10, 10),
      word('8:00-9:30', 90, 10),
      word('Data', 190, 10),
      word('Structures', 240, 10),
      word('Tuesday', 10, 48),
      word('10:00', 90, 48),
      word('to', 140, 48),
      word('11:30', 170, 48),
      word('AM', 220, 48),
      word('Networks', 270, 48),
    ])

    expect(slots).toEqual([
      expect.objectContaining({ day: 1, start: '08:00', end: '09:30', title: 'Data Structures' }),
      expect.objectContaining({ day: 2, start: '10:00', end: '11:30', title: 'Networks' }),
    ])
  })

  it('links a read class to an existing course', () => {
    const [slot] = linkSlotsToClasses(
      [{ day: 1, start: '08:00', end: '09:30', title: 'Programming', courseCode: 'CS101', room: '', section: 'A', classId: null }],
      [{ id: 'class-1', course_code: 'CS-101', section: 'A', title: 'Programming' }],
    )
    expect(slot.classId).toBe('class-1')
  })
})

describe('fall 2026 timetable', () => {
  it('includes the six classes from the Fall 2026 sheet', () => {
    expect(FALL_2026_SLOTS.map((slot) => [slot.day, slot.start, slot.end, slot.courseCode, slot.section, slot.room])).toEqual([
      [1, '08:00', '10:00', 'CS-111', 'BSCYS-1B', '216'],
      [1, '14:00', '17:00', 'CS-321', 'BSSE-5A', '113'],
      [2, '11:00', '14:00', 'CS-111', 'BSCS-1A', '215'],
      [3, '17:00', '20:00', 'CS-303', 'BSCS-5B', '102'],
      [4, '08:00', '11:00', 'CS-102', 'BSCYS-1C', '110'],
      [4, '11:00', '14:00', 'CS-111', 'BSCS-1B', '103'],
    ])
    expect(FALL_2026_SLOTS.filter((slot) => slot.day === 5 || slot.day === 6)).toHaveLength(0)
  })
})

describe('today schedule', () => {
  const slots: ScheduleSlot[] = [
    { id: '1', day_of_week: 1, start_time: '08:00', end_time: '09:30', title: 'CS101', course_code: 'CS101', room: '', section: 'A', class_id: 'class-1' },
    { id: '2', day_of_week: 1, start_time: '11:00', end_time: '12:30', title: 'Lab', course_code: 'CS101', room: '3', section: 'A', class_id: 'class-1' },
    { id: '3', day_of_week: 3, start_time: '09:00', end_time: '10:30', title: 'Physics', course_code: 'PHY101', room: '', section: 'B', class_id: null },
  ]

  it('marks the class happening now and the one after it', () => {
    const today = annotateToday(slots, 1, 8 * 60 + 15)
    expect(today.map((slot) => slot.phase)).toEqual(['now', 'next'])
    expect(formatClockRange('08:00', '09:30')).toBe('8:00 AM–9:30 AM')
  })

  it('finds the next class when today is empty', () => {
    expect(nextUpcoming(slots, 2, 15 * 60)?.title).toBe('Physics')
  })

  it('shows weekly timings for a matching class', () => {
    expect(timingsForClass(slots, { id: 'class-1', course_code: 'CS101', section: 'A' }).map((slot) => slot.start_time)).toEqual(['08:00', '11:00'])
  })
})
