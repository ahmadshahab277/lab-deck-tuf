import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Bell, BookMarked, BookOpen, ClipboardList, FileText, Home, Menu, Printer, Search, Settings, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useClassSession } from '../../context/ClassSessionContext'
import { revokeLocalClassSession } from '../../lib/classAccess'
import { searchClassContent } from '../../lib/search'

const links = [
  { to: '', label: 'Overview', icon: Home, end: true },
  { to: 'outline', label: 'Course Outline', icon: BookOpen },
  { to: 'resources', label: 'Lectures & Resources', icon: FileText },
  { to: 'labs', label: 'Lab Manuals', icon: BookMarked },
  { to: 'tasks', label: 'Tasks & Deadlines', icon: ClipboardList },
  { to: 'announcements', label: 'Announcements', icon: Bell },
  { to: 'guidelines', label: 'Submission Guidelines', icon: Printer },
  { to: 'settings', label: 'Settings', icon: Settings },
]

export function StudentShell() {
  const { slug } = useParams()
  const { data, reload } = useClassSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const base = `/c/${slug}`

  const hits = useMemo(() => {
    if (!data || !slug) return []
    return searchClassContent(query, { ...data, slug })
  }, [data, query, slug])

  async function leave() {
    await revokeLocalClassSession()
    await reload()
    navigate(`/c/${slug}`)
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[250px_1fr]">
      <aside className={`glass fixed inset-y-0 left-0 z-40 w-72 p-4 transition md:static md:w-auto md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <p className="text-[11px] tracking-[0.18em] text-muted uppercase">Class</p>
        <p className="font-serif text-2xl leading-tight">{data?.course.title ?? 'LabDesk'}</p>
        <p className="mt-1 text-xs text-muted">
          {data?.course.course_code} · {data?.course.section}
        </p>
        <nav className="mt-6 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to ? `${base}/${link.to}` : base}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${isActive ? 'bg-white text-pine' : 'text-muted hover:bg-white/70'}`
              }
            >
              <link.icon size={16} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <button type="button" onClick={() => void leave()} className="absolute inset-x-4 bottom-4 text-left text-sm text-muted">
          Leave class
        </button>
      </aside>
      <div className="min-w-0 pb-16 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button type="button" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <div className="relative min-w-0 flex-1">
              <Search size={15} className="absolute top-2.5 left-3 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search labs, lectures, tasks..."
                className="w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm outline-none"
              />
            </div>
            {open ? (
              <button type="button" className="md:hidden" onClick={() => setOpen(false)}>
                <X size={18} />
              </button>
            ) : null}
          </div>
          {hits.length > 0 ? (
            <div className="glass mt-2 max-h-72 overflow-auto rounded-xl p-2">
              {hits.map((hit) => (
                <button
                  key={`${hit.kind}-${hit.id}`}
                  type="button"
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white"
                  onClick={() => {
                    setQuery('')
                    navigate(hit.href)
                  }}
                >
                  <p className="text-sm font-medium">{hit.title}</p>
                  <p className="truncate text-xs text-muted">{hit.subtitle}</p>
                </button>
              ))}
            </div>
          ) : null}
        </header>
        <main className="page-enter mx-auto max-w-5xl px-4 py-6">
          <Outlet />
        </main>
      </div>
      <nav className="glass fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-2xl p-1 md:hidden">
        {links.slice(0, 5).map((link) => {
          const href = link.to ? `${base}/${link.to}` : base
          const active = link.end ? location.pathname === href : location.pathname.startsWith(href)
          return (
            <NavLink key={link.to} to={href} className={`grid place-items-center rounded-xl py-2 ${active ? 'bg-white text-pine' : 'text-muted'}`}>
              <link.icon size={16} />
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
