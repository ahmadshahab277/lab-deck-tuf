import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { storedClassSession } from '../lib/classAccess'
import { loadStudentBundle } from '../lib/student'
import type {
  StudentAnnouncement,
  StudentAssignment,
  StudentClass,
  StudentGuideline,
  StudentLab,
  StudentResource,
} from '../types'

type StudentBundle = {
  course: StudentClass
  resources: StudentResource[]
  labs: StudentLab[]
  assignments: StudentAssignment[]
  announcements: StudentAnnouncement[]
  guidelines: StudentGuideline[]
}

type ClassSessionState = {
  ready: boolean
  token: string | null
  slug: string | null
  error: string | null
  data: StudentBundle | null
  reload: () => Promise<void>
}

const ClassSessionContext = createContext<ClassSessionState | null>(null)

export function ClassSessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<StudentBundle | null>(null)

  const reload = async () => {
    const stored = storedClassSession()
    if (!stored) {
      setToken(null)
      setSlug(null)
      setData(null)
      setError(null)
      setReady(true)
      return
    }
    try {
      const bundle = await loadStudentBundle(stored.token)
      setToken(stored.token)
      setSlug(stored.slug)
      setData(bundle)
      setError(null)
    } catch (err) {
      setToken(null)
      setData(null)
      setError(err instanceof Error ? err.message : 'Session expired.')
    } finally {
      setReady(true)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const value = useMemo(
    () => ({ ready, token, slug, error, data, reload }),
    [data, error, ready, slug, token],
  )

  return <ClassSessionContext.Provider value={value}>{children}</ClassSessionContext.Provider>
}

export function useClassSession() {
  const value = useContext(ClassSessionContext)
  if (!value) throw new Error('ClassSessionProvider is missing.')
  return value
}
