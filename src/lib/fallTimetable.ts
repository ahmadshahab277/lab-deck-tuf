import { getSupabase } from './supabase'
import { linkSlotsToClasses, type ParsedSlot } from './timetable'
import { installTimetable, loadTimetable } from './timetableStore'
import type { TimetableSlot, TimetableSource } from '../types'

const HIDDEN_KEY = 'labdesk.timetable.hidden'

/** Fall 2026 timetable for Mr. Ahmed Shahab, Department of Computer Sciences. */
export const FALL_2026_SLOTS: ParsedSlot[] = [
  { day: 1, start: '08:00', end: '10:00', title: 'Programming Fundamentals', courseCode: 'CS-111', room: '216', section: 'BSCYS-1B', classId: null },
  { day: 1, start: '14:00', end: '17:00', title: 'HCI and Computer Graphics Lab', courseCode: 'CS-321', room: '113', section: 'BSSE-5A', classId: null },
  { day: 2, start: '11:00', end: '14:00', title: 'Programming Fundamentals', courseCode: 'CS-111', room: '215', section: 'BSCS-1A', classId: null },
  { day: 3, start: '17:00', end: '20:00', title: 'Object Oriented Analysis and Design', courseCode: 'CS-303', room: '102', section: 'BSCS-5B', classId: null },
  { day: 4, start: '08:00', end: '11:00', title: 'Applications of Information Communication Technologies (ICT)', courseCode: 'CS-102', room: '110', section: 'BSCYS-1C', classId: null },
  { day: 4, start: '11:00', end: '14:00', title: 'Programming Fundamentals', courseCode: 'CS-111', room: '103', section: 'BSCS-1B', classId: null },
]

export const FALL_2026_SOURCE = 'Fall 2026 timetable'

export function timetableIsHidden(): boolean {
  return window.localStorage.getItem(HIDDEN_KEY) === '1'
}

export function hideTimetable(): void {
  window.localStorage.setItem(HIDDEN_KEY, '1')
}

export function showTimetable(): void {
  window.localStorage.removeItem(HIDDEN_KEY)
}

export function localFallTimetable(classes: { id: string; course_code: string; section: string; title: string }[] = []): TimetableSlot[] {
  return linkSlotsToClasses(FALL_2026_SLOTS, classes).map((slot) => ({
    id: `fall26-${slot.day}-${slot.start}`,
    owner_id: '',
    day_of_week: slot.day,
    start_time: slot.start,
    end_time: slot.end,
    title: slot.title,
    course_code: slot.courseCode,
    room: slot.room,
    section: slot.section,
    class_id: slot.classId,
    created_at: '',
  }))
}

let ensuring: Promise<{ slots: TimetableSlot[]; source: TimetableSource | null }> | null = null

export function ensureFallTimetable(
  classes: { id: string; course_code: string; section: string; title: string }[],
): Promise<{ slots: TimetableSlot[]; source: TimetableSource | null }> {
  if (!ensuring) {
    ensuring = loadOrInstall(classes).finally(() => {
      ensuring = null
    })
  }
  return ensuring
}

async function loadOrInstall(
  classes: { id: string; course_code: string; section: string; title: string }[],
): Promise<{ slots: TimetableSlot[]; source: TimetableSource | null }> {
  if (timetableIsHidden()) return { slots: [], source: null }
  const linked = linkSlotsToClasses(FALL_2026_SLOTS, classes)
  try {
    const current = await loadTimetable()
    if (current.slots.length > 0) return current
    const { data } = await getSupabase().auth.getUser()
    if (!data.user) return { slots: localFallTimetable(classes), source: null }
    const slots = await installTimetable(data.user.id, linked, FALL_2026_SOURCE)
    return {
      slots,
      source: {
        owner_id: data.user.id,
        storage_path: 'builtin/fall-2026',
        file_name: FALL_2026_SOURCE,
        slot_count: slots.length,
        updated_at: new Date().toISOString(),
      },
    }
  } catch {
    return { slots: localFallTimetable(classes), source: null }
  }
}
