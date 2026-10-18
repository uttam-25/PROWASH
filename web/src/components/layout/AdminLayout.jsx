import { useNavigate } from 'react-router-dom'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  Car,
  Sparkles,
  CreditCard,
  Clock,
  BarChart2,
  Settings,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/bookings', icon: CalendarDays, label: 'Bookings' },
  { to: '/admin/customers', icon: Users, label: 'Customers' },
  { to: '/admin/vehicles', icon: Car, label: 'Vehicles' },
  { to: '/admin/services', icon: Sparkles, label: 'Services' },
  { to: '/admin/payments', icon: CreditCard, label: 'Payments' },
  { to: '/admin/schedule', icon: Clock, label: 'Schedule' },
  { to: '/admin/reports', icon: BarChart2, label: 'Reports' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
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
      <aside className="fixed top-0 left-0 h-full w-64 bg-primary-dark text-white flex flex-col z-40">

        {/* Sidebar header */}
        <div className="px-6 py-5 border-b border-white/10 shrink-0">
          <p className="font-bold text-white text-lg leading-tight">PROWASH</p>
          <p className="text-xs text-white/60 mt-0.5">Admin Panel</p>
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

        {/* Logout at bottom */}
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
        <h1 className="font-semibold text-primary-dark text-base">Admin Panel</h1>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-xs uppercase">
            {user?.name?.charAt(0) || 'A'}
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
