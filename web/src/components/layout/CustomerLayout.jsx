import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Bell, Menu, X, ChevronDown, User, LogOut } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { notificationsAPI } from '../../api/notifications'

export default function CustomerLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    notificationsAPI.getAll()
      .then(res => {
        const notifications = res.data?.data?.notifications || res.data?.data || []
        setUnreadCount(notifications.filter(n => !n.read).length)
      })
      .catch(() => setUnreadCount(0))
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', end: true },
    { to: '/dashboard/services', label: 'Services' },
    { to: '/dashboard/bookings', label: 'My Bookings' },
    { to: '/dashboard/vehicles', label: 'Vehicles' },
  ]

  const navLinkClass = ({ isActive }) =>
    isActive
      ? 'text-primary font-semibold text-sm'
      : 'text-gray-600 hover:text-primary text-sm transition-colors'

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed top navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">

          {/* Left: Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div>
              <p className="font-bold text-primary-dark leading-tight">PROWASH</p>
              <p className="text-xs text-gray-500 leading-tight">Clean cars. Happy rides.</p>
            </div>
          </div>

          {/* Center: Nav links (desktop) */}
          <div className="hidden md:flex items-center gap-8">
            {navItems.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={navLinkClass}
              >
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Right: Bell + Avatar */}
          <div className="hidden md:flex items-center gap-4">
            {/* Bell with badge */}
            <button
              className="relative p-2 text-gray-600 hover:text-primary transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* User avatar dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(prev => !prev)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary transition-colors"
                aria-haspopup="true"
                aria-expanded={dropdownOpen}
              >
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-xs uppercase">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="font-medium">{user?.name}</span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {dropdownOpen && (
                <>
                  {/* Click-outside overlay */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1">
                    <NavLink
                      to="/dashboard/profile"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </NavLink>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-gray-600 hover:text-primary transition-colors"
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile slide-down menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 shadow-md">
            <div className="flex flex-col gap-3">
              {navItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={navLinkClass}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </NavLink>
              ))}
              <hr className="border-gray-100" />
              <NavLink
                to="/dashboard/profile"
                className="text-sm text-gray-700 hover:text-primary transition-colors"
                onClick={() => setMobileOpen(false)}
              >
                Profile
              </NavLink>
              <button
                onClick={handleLogout}
                className="text-left text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main content — clears fixed navbar */}
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  )
}
