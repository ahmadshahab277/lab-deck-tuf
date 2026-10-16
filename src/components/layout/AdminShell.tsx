import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BookOpen, FolderOpen, LayoutDashboard, LogOut, Menu, Settings, X } from 'lucide-react'
import { useState } from 'react'
import { InstallButton } from '../pwa/InstallButton'
import { useAuth } from '../../context/AuthContext'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/classes', label: 'Classes', icon: BookOpen },
  { to: '/admin/content', label: 'Content', icon: FolderOpen },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function AdminShell() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  async function leave() {
    await signOut()
    navigate('/admin/login')
  }

  return (
    <div className="min-h-dvh bg-[#f4f1ec] md:grid md:grid-cols-[232px_1fr]">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-[#141210] px-4 py-5 text-white transition md:static md:w-auto md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] tracking-[0.28em] text-white/40">TUF</p>
            <p className="font-serif text-[1.7rem] leading-none">LabDesk</p>
          </div>
          <button type="button" className="text-white/70 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="mt-10 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 text-sm ${isActive ? 'bg-pine text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'}`
              }
            >
              <link.icon size={16} />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <p className="truncate text-sm font-medium">{profile?.full_name}</p>
          <p className="truncate text-xs text-white/45">{profile?.email}</p>
          <button type="button" onClick={() => void leave()} className="mt-4 flex items-center gap-2 text-sm text-white/55 hover:text-white">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
      {open ? <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} /> : null}
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-[#141210] px-4 py-2.5 text-white md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <p className="truncate font-mono text-[10px] tracking-[0.22em] text-white/45">INSTRUCTOR CONSOLE</p>
          </div>
          <InstallButton />
        </header>
        <main className="page-enter mx-auto max-w-6xl px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
