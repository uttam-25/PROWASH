import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Briefcase, User, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/partner', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/partner/jobs', icon: Briefcase, label: 'My Jobs' },
  { to: '/partner/profile', icon: User, label: 'Profile' },
]

export default function PartnerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/partner-login')
  }

  const navLinkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-white/10 text-white'
        : 'text-white/70 hover:bg-white/5 hover:text-white',
    ].join(' ')

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed left sidebar */}
      <aside className="fixed top-0 left-0 h-full w-64 bg-[#0B1B2B] text-white flex flex-col z-40">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 shrink-0">
          <p className="font-bold text-white text-lg leading-tight">PROWASH</p>
          <p className="text-xs text-white/60 mt-0.5">Partner Portal</p>
        </div>

        {/* Partner info */}
        <div className="px-6 py-4 border-b border-white/10 shrink-0">
          <p className="text-sm font-semibold text-white truncate">{user?.name || 'Partner'}</p>
          <p className="text-xs text-white/50 mt-0.5 truncate">{user?.email}</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10 shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Fixed top bar */}
      <header className="fixed top-0 left-64 right-0 h-16 bg-white shadow-sm z-30 flex items-center justify-between px-6">
        <h1 className="font-semibold text-[#0B1B2B] text-base">Partner Portal</h1>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#147DAB] text-white flex items-center justify-center font-semibold text-xs uppercase">
            {user?.name?.charAt(0) || 'P'}
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.name}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="ml-64 pt-16 bg-background min-h-screen">
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
