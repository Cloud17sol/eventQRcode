import { CalendarDays, LayoutGrid, LogOut, Plus } from 'lucide-react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/common/Logo'
import { useAuth } from '@/hooks/useAuth'

const links = [
  { to: '/dashboard', label: 'Home', icon: LayoutGrid },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/events/new', label: 'Create event', icon: Plus },
]

function linkActive(pathname: string, to: string) {
  if (to === '/events') {
    return pathname === '/events' || (pathname.startsWith('/events/') && pathname !== '/events/new')
  }
  return pathname === to
}

export function OrganizerLayout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const displayName = profile?.full_name?.trim() || user?.email || 'Organizer'

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="hidden bg-ink text-white lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-5 lg:py-6">
        <Logo inverted to="/dashboard" />
        <nav className="mt-10 grid gap-1" aria-label="Organizer">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={() =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                  linkActive(pathname, link.to)
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/6 hover:text-white'
                }`
              }
            >
              <link.icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <p className="truncate px-3 text-sm font-medium">{displayName}</p>
          <p className="truncate px-3 text-xs text-white/50">{user?.email}</p>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/70 transition-colors duration-200 hover:bg-white/6 hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md lg:hidden">
          <Logo to="/dashboard" />
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="cursor-pointer text-sm font-medium text-muted"
          >
            Sign out
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-6 lg:px-10 lg:py-10 lg:pb-10">
          <Outlet />
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-line bg-card/95 px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden"
          aria-label="Organizer mobile"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to !== '/events'}
              className={() =>
                `flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium ${
                  linkActive(pathname, link.to) ? 'text-admit' : 'text-muted'
                }`
              }
            >
              <link.icon className="h-4 w-4" aria-hidden="true" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
