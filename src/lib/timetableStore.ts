import { sanitizeFileName } from './preview'
import { getSupabase } from './supabase'
import type { ParsedSlot } from './timetable'
import type { TimetableSlot, TimetableSource } from '../types'

const SETUP_MESSAGE = 'Timetable storage is not set up yet. Run supabase/migrations/006_timetable.sql in the Supabase SQL editor, then try again.'

function raise(error: { message: string } | null): void {
  if (!error) return
  const text = error.message.toLowerCase()
  if (text.includes('timetable_') || (text.includes('schema cache') && text.includes('timetable'))) {
    throw new Error(SETUP_MESSAGE)
  }
  throw new Error(error.message)
}

export async function loadTimetable(): Promise<{ slots: TimetableSlot[]; source: TimetableSource | null }> {
  const supabase = getSupabase()
  const [slotsResult, sourceResult] = await Promise.all([
    supabase.from('timetable_slots').select('*').order('day_of_week').order('start_time'),
    supabase.from('timetable_sources').select('*').maybeSingle(),
  ])
  raise(slotsResult.error)
  raise(sourceResult.error)
  return {
    slots: (slotsResult.data ?? []) as TimetableSlot[],
    source: (sourceResult.data ?? null) as TimetableSource | null,
  }
}

export async function timetablePreviewUrl(path: string): Promise<string | null> {
  const { data, error } = await getSupabase().storage.from('class-files').createSignedUrl(path, 60 * 60)
  if (error) return null
  return data.signedUrl
}

export async function saveTimetable(ownerId: string, file: File, slots: ParsedSlot[]): Promise<TimetableSlot[]> {
  if (slots.length === 0) throw new Error('No class times were found in that picture.')
  const supabase = getSupabase()
  const path = `timetables/${ownerId}/${Date.now()}-${sanitizeFileName(file.name)}`
  const { error: uploadError } = await supabase.storage.from('class-files').upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (uploadError) {
    const message = uploadError.message.toLowerCase()
    if (message.includes('bucket not found') || message.includes('not found')) {
      throw new Error('File storage is not set up yet. Run supabase/migrations/005_storage_downloads.sql in the SQL editor, then try again.')
    }
    throw new Error(uploadError.message)
  }

  const { data: previous } = await supabase.from('timetable_sources').select('storage_path').eq('owner_id', ownerId).maybeSingle()
  const { data, error } = await supabase
    .from('timetable_slots')
    .insert(slots.map((slot) => ({
      owner_id: ownerId,
      day_of_week: slot.day,
      start_time: slot.start,
      end_time: slot.end,
      title: slot.title,
      course_code: slot.courseCode,
      room: slot.room,
      section: slot.section,
      class_id: slot.classId,
    })))
    .select('*')
  if (error) {
    await supabase.storage.from('class-files').remove([path])
    raise(error)
  }

  const saved = (data ?? []) as TimetableSlot[]
  const ids = saved.map((slot) => slot.id)
  if (ids.length > 0) {
    const { error: cleanupError } = await supabase.from('timetable_slots').delete().eq('owner_id', ownerId).not('id', 'in', `(${ids.join(',')})`)
    raise(cleanupError)
  }

  const { error: sourceError } = await supabase.from('timetable_sources').upsert({
    owner_id: ownerId,
    storage_path: path,
    file_name: file.name,
    slot_count: saved.length,
    updated_at: new Date().toISOString(),
  })
  if (sourceError) raise(sourceError)

  if (previous?.storage_path && previous.storage_path !== path) {
    await supabase.storage.from('class-files').remove([previous.storage_path])
  }
  return saved
}

export async function installTimetable(ownerId: string, slots: ParsedSlot[], sourceName: string): Promise<TimetableSlot[]> {
  if (slots.length === 0) throw new Error('No classes to add.')
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('timetable_slots')
    .insert(slots.map((slot) => ({
      owner_id: ownerId,
      day_of_week: slot.day,
      start_time: slot.start,
      end_time: slot.end,
      title: slot.title,
      course_code: slot.courseCode,
      room: slot.room,
      section: slot.section,
      class_id: slot.classId,
    })))
    .select('*')
  if (error) raise(error)

  const saved = (data ?? []) as TimetableSlot[]
  const ids = saved.map((slot) => slot.id)
  if (ids.length > 0) {
    const { error: cleanupError } = await supabase.from('timetable_slots').delete().eq('owner_id', ownerId).not('id', 'in', `(${ids.join(',')})`)
    raise(cleanupError)
  }

  const { error: sourceError } = await supabase.from('timetable_sources').upsert({
    owner_id: ownerId,
    storage_path: 'builtin/fall-2026',
    file_name: sourceName,
    slot_count: saved.length,
    updated_at: new Date().toISOString(),
  })
  if (sourceError) raise(sourceError)
  return saved
}

export async function clearTimetable(ownerId: string): Promise<void> {
  const supabase = getSupabase()
  const { data: source } = await supabase.from('timetable_sources').select('storage_path').eq('owner_id', ownerId).maybeSingle()
  const { error: slotsError } = await supabase.from('timetable_slots').delete().eq('owner_id', ownerId)
  raise(slotsError)
  const { error: sourceError } = await supabase.from('timetable_sources').delete().eq('owner_id', ownerId)
  raise(sourceError)
  if (source?.storage_path) await supabase.storage.from('class-files').remove([source.storage_path])
}
