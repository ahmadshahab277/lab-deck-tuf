import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { listClasses } from '../../lib/admin'
import { ensureFallTimetable, FALL_2026_SOURCE, hideTimetable, showTimetable, timetableIsHidden } from '../../lib/fallTimetable'
import { linkSlotsToClasses, parseTimetableWords, WEEKDAY_ORDER, WEEKDAYS, formatClockRange } from '../../lib/timetable'
import { readTimetableImage, validateTimetableImage } from '../../lib/timetableOcr'
import { clearTimetable, loadTimetable, saveTimetable, timetablePreviewUrl } from '../../lib/timetableStore'
import type { TimetableSlot, TimetableSource } from '../../types'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/EmptyState'

export function TimetableSettings() {
  const { profile } = useAuth()
  const { push } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [source, setSource] = useState<TimetableSource | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listClasses()
      .then((classes) => ensureFallTimetable(classes))
      .then(async (result) => {
        if (!active) return
        setSlots(result.slots)
        setSource(result.source)
        if (result.source && !result.source.storage_path.startsWith('builtin/')) {
          setPreview(await timetablePreviewUrl(result.source.storage_path))
        }
      })
      .catch((error: unknown) => {
        if (active) setNote(error instanceof Error ? error.message : 'Unable to load the timetable.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function onFile(file: File) {
    if (!profile) return
    const invalid = validateTimetableImage(file)
    if (invalid) {
      push(invalid, 'error')
      return
    }
    showTimetable()
    setBusy('Preparing the timetable reader…')
    try {
      const words = await readTimetableImage(file, setBusy)
      const classes = await listClasses()
      const parsed = linkSlotsToClasses(parseTimetableWords(words), classes)
      if (parsed.length === 0) {
        push('No class times were found. Use a clearer photo where the days and times are readable.', 'error')
        return
      }
      setBusy('Saving timetable…')
      const saved = await saveTimetable(profile.id, file, parsed)
      setSlots(saved)
      setSource({
        owner_id: profile.id,
        storage_path: '',
        file_name: file.name,
        slot_count: saved.length,
        updated_at: new Date().toISOString(),
      })
      const refreshed = await loadTimetable()
      setSource(refreshed.source)
      setPreview(refreshed.source ? await timetablePreviewUrl(refreshed.source.storage_path) : null)
      setNote(null)
      push(`Timetable updated. ${saved.length} ${saved.length === 1 ? 'class' : 'classes'} added to your schedule.`)
    } catch (error: unknown) {
      push(error instanceof Error ? error.message : 'Unable to read that timetable.', 'error')
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!profile) return
    setBusy('Removing timetable…')
    try {
      await clearTimetable(profile.id)
      hideTimetable()
      setSlots([])
      setSource(null)
      setPreview(null)
      push('Timetable removed.')
    } catch (error: unknown) {
      push(error instanceof Error ? error.message : 'Unable to remove the timetable.', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5">
      <p className="font-mono text-[11px] tracking-[0.14em] text-muted uppercase">Timetable</p>
      <h2 className="mt-1 font-serif text-3xl tracking-tight">Weekly schedule</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Fall 2026 is on your schedule. Upload a new photo when the week changes and LabDesk will read the days and class times again.
      </p>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void onFile(file)
        }}
      />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button disabled={Boolean(busy)} onClick={() => fileRef.current?.click()}>
          {slots.length > 0 ? 'Replace timetable' : 'Upload timetable'}
        </Button>
        {slots.length === 0 && timetableIsHidden() ? (
          <Button
            variant="secondary"
            disabled={Boolean(busy)}
            onClick={() => {
              showTimetable()
              setLoading(true)
              void listClasses()
                .then((classes) => ensureFallTimetable(classes))
                .then((result) => {
                  setSlots(result.slots)
                  setSource(result.source)
                  setNote(null)
                  push('Fall 2026 timetable added.')
                })
                .catch((error: unknown) => push(error instanceof Error ? error.message : 'Unable to add the timetable.', 'error'))
                .finally(() => setLoading(false))
            }}
          >
            Add Fall 2026 timetable
          </Button>
        ) : null}
        {slots.length > 0 ? (
          <Button variant="secondary" disabled={Boolean(busy)} onClick={() => void remove()}>
            Remove
          </Button>
        ) : null}
      </div>
      {busy ? <p className="mt-3 text-sm text-muted">{busy}</p> : null}
      {note ? <p className="mt-3 text-sm text-danger">{note}</p> : null}
      {loading ? <Spinner label="Loading timetable" /> : null}
      {(source || slots.length > 0) && !loading ? (
        <p className="mt-3 text-xs text-muted">
          {source?.file_name ?? FALL_2026_SOURCE} · {slots.length} {slots.length === 1 ? 'class' : 'classes'}
        </p>
      ) : null}
      {preview ? <img src={preview} alt="Uploaded timetable" className="mt-4 max-h-64 rounded-xl border border-line object-contain" /> : null}
      {slots.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {WEEKDAY_ORDER.map((day) => {
            const daySlots = slots.filter((slot) => slot.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
            if (daySlots.length === 0) return null
            return (
              <div key={day} className="rounded-xl border border-line px-3 py-2.5">
                <p className="text-sm font-medium">{WEEKDAYS[day]}</p>
                <ul className="mt-2 space-y-1.5">
                  {daySlots.map((slot) => (
                    <li key={slot.id} className="text-sm">
                      <span className="font-mono text-xs text-muted">{formatClockRange(slot.start_time, slot.end_time)}</span>
                      <span className="mt-0.5 block">{slot.title}</span>
                      <span className="block text-xs text-muted">
                        {[slot.course_code, slot.section, slot.room ? `Room ${slot.room}` : ''].filter(Boolean).join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
