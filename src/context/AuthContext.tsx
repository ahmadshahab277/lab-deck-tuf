import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { authErrorMessage, claimAdminProfile, loadProfile } from '../lib/admin'
import { supabaseConfigured } from '../lib/env'
import { getSupabase } from '../lib/supabase'
import type { AdminProfile } from '../types'

type AuthState = {
  ready: boolean
  session: Session | null
  profile: AdminProfile | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!supabaseConfigured())
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)

  useEffect(() => {
    if (!supabaseConfigured()) return
    const supabase = getSupabase()
    let active = true

    async function hydrate(next: Session | null) {
      if (!next) {
        if (active) {
          setSession(null)
          setProfile(null)
          setReady(true)
        }
        return
      }
      let row = await loadProfile(next.user.id)
      if (!row || row.role !== 'admin') {
        row = await claimAdminProfile()
      }
      if (!active) return
      if (!row || row.role !== 'admin') {
        await supabase.auth.signOut()
        setSession(null)
        setProfile(null)
        setReady(true)
        return
      }
      setSession(next)
      setProfile(row as AdminProfile)
      setReady(true)
    }

    supabase.auth.getSession().then(({ data }) => hydrate(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      void hydrate(next)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      profile,
      async signIn(email, password) {
        const { error } = await getSupabase().auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (error) throw new Error(authErrorMessage(error))
        const { data } = await getSupabase().auth.getSession()
        if (!data.session) throw new Error('Unable to sign in with those credentials.')
        let row = await loadProfile(data.session.user.id)
        if (!row || row.role !== 'admin') {
          row = await claimAdminProfile()
        }
        if (!row || row.role !== 'admin') {
          await getSupabase().auth.signOut()
          throw new Error(
            'ahmedshahab.cs@tuf.edu.pk is a valid Auth user, but it is not an admin yet. In Supabase go to SQL Editor, paste supabase/migrations/003_seed_ahmad_admin.sql, click Run, then sign in again.',
          )
        }
        setSession(data.session)
        setProfile(row as AdminProfile)
      },
      async signOut() {
        await getSupabase().auth.signOut()
        setSession(null)
        setProfile(null)
      },
    }),
    [profile, ready, session],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider is missing.')
  return value
}
