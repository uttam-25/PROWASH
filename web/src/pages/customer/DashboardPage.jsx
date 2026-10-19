import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle, Clock, Car, Bike, Zap, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { bookingsAPI } from '../../api/bookings'
import { vehiclesAPI } from '../../api/vehicles'
import { servicesAPI } from '../../api/services'
import StatsCard from '../../components/ui/StatsCard'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const VEHICLE_CARDS = [
  { type: 'Car',    icon: Car,  label: 'Car Wash',    gradient: 'from-blue-500 to-blue-700' },
  { type: 'Bike',   icon: Bike, label: 'Bike Wash',   gradient: 'from-green-500 to-green-700' },
  { type: 'Scooty', icon: Zap,  label: 'Scooty Wash', gradient: 'from-purple-500 to-purple-700' },
]

const ACTIVE_STATUSES = ['pending', 'confirmed', 'searching_partner', 'partner_assigned', 'partner_on_way', 'partner_arrived', 'in_progress']

const LIVE_STATUS_LABELS = {
  pending:           '⏳ Pending',
  confirmed:         '✅ Confirmed',
  searching_partner: '🔍 Finding a Partner...',
  partner_assigned:  '✅ Partner Assigned',
  partner_on_way:    '🚗 Partner on the Way',
  partner_arrived:   '📍 Partner Arrived',
  in_progress:       '🧹 Cleaning in Progress',
  completed:         '✨ Completed',
}

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [services, setServices] = useState([])
  const [locationLabel, setLocationLabel] = useState(
    () => localStorage.getItem('prowash_location_label') || ''
  )

  async function fetchAll() {
    setLoading(true)
    setError(null)
    try {
      const [bRes, vRes, sRes] = await Promise.all([
        bookingsAPI.getMyBookings(),
        vehiclesAPI.getMyVehicles(),
        servicesAPI.getServices(),
      ])
      setBookings(bRes.data.data.bookings || [])
      setVehicles(vRes.data.data?.vehicles || vRes.data.data || [])
      setServices(sRes.data.data.services || [])
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  function detectLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const label = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
        localStorage.setItem('prowash_location_label', label)
        setLocationLabel(label)
        toast.success('Location detected.')
      },
      () => toast.error('Could not detect location. Please type your address.')
    )
  }

  useEffect(() => { fetchAll() }, [])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const totalBookings = bookings.length
  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const upcomingBookings = bookings.filter(b => ACTIVE_STATUSES.includes(b.status)).length

  const upcomingBooking = bookings.find(b => ACTIVE_STATUSES.includes(b.status))
  const recentCompleted = bookings.filter(b => b.status === 'completed').slice(0, 3)
  const popularServices = services.slice(0, 4)
  const previewVehicles = vehicles.slice(0, 4)

  if (loading) return <Spinner message="Loading dashboard..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={fetchAll}>Retry</Button>
    </div>
  )

  return (
    <div className="p-6 space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {getGreeting()}, {firstName} 👋
        </h1>
        <p className="text-gray-500 mt-1">Professional Vehicle Care at Your Doorstep.</p>
      </div>

      {/* Location Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Enter your location..."
            value={locationLabel}
            onChange={(e) => {
              setLocationLabel(e.target.value)
              localStorage.setItem('prowash_location_label', e.target.value)
            }}
            className="input pl-9 w-full"
          />
        </div>
        <button
          onClick={detectLocation}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-[#147DAB] text-[#147DAB] text-sm font-medium hover:bg-[#147DAB] hover:text-white transition-all whitespace-nowrap"
        >
          <MapPin className="w-4 h-4" />
          Use My Location
        </button>
      </div>

      {/* Vehicle Type Cards */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">What do you need washed?</h2>
        <div className="grid grid-cols-3 gap-3">
          {VEHICLE_CARDS.map(({ type, icon: Icon, label, gradient }) => (
            <Link
              key={type}
              to={`/dashboard/book?vehicleType=${type}`}
              className={`rounded-2xl p-5 bg-gradient-to-br ${gradient} text-white flex flex-col items-center gap-3 hover:shadow-lg hover:scale-[1.02] transition-all`}
            >
              <Icon className="w-10 h-10" />
              <span className="font-semibold text-sm">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming Booking Card */}
      {upcomingBooking && (
        <div className="card p-5 border-l-4 border-[#147DAB] bg-blue-50/40">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Active Booking</p>
              </div>
              <p className="font-bold text-gray-800">
                {upcomingBooking.service?.name || upcomingBooking.serviceNameSnapshot || '—'}
              </p>
              <p className="text-sm text-gray-500">
                {upcomingBooking.vehicle?.registrationNumber || upcomingBooking.vehicleId?.registrationNumber || '—'}
              </p>
              {upcomingBooking.startAt && (
                <p className="text-xs text-gray-400">
                  {format(parseISO(upcomingBooking.startAt), 'dd MMM yyyy, hh:mm a')}
                </p>
              )}
              <p className="text-sm font-semibold text-[#147DAB]">
                {LIVE_STATUS_LABELS[upcomingBooking.status] || upcomingBooking.status}
              </p>
            </div>
            <Link to={`/dashboard/bookings/${upcomingBooking._id}`}>
              <Button size="sm">View Details</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={CalendarDays} label="Total Bookings" value={totalBookings} bg="bg-blue-50" color="text-primary" />
        <StatsCard icon={CheckCircle} label="Completed" value={completedBookings} bg="bg-green-50" color="text-green-600" />
        <StatsCard icon={Clock} label="Active" value={upcomingBookings} bg="bg-yellow-50" color="text-yellow-600" />
      </div>

      {/* CTA Card */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-[#147DAB] to-[#1a9fd4] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Ready for a clean ride?</h2>
          <p className="text-white/80 mt-1">Schedule a wash for your vehicle in minutes.</p>
        </div>
        <button
          onClick={() => navigate('/dashboard/book')}
          className="bg-white text-[#147DAB] font-semibold px-6 py-2.5 rounded-xl hover:bg-white/90 transition-colors whitespace-nowrap"
        >
          Book a Wash Now
        </button>
      </div>

      {/* Popular Packages (horizontal scroll) */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Popular Packages</h2>
        {popularServices.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No services available" />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {popularServices.map(s => (
              <div key={s._id} className="card p-4 flex-shrink-0 w-52 flex flex-col gap-2">
                <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                <p className="text-xs text-gray-500">{s.category} · {s.duration} min</p>
                <p className="text-xl font-bold text-primary mt-auto">
                  ₹{s.price?.toLocaleString('en-IN')}
                </p>
                <button
                  onClick={() => navigate(`/dashboard/book?serviceId=${s._id}`)}
                  className="btn btn-primary btn-sm mt-1"
                >
                  Book
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">My Vehicles</h2>
          <Link to="/dashboard/vehicles" className="text-sm text-primary hover:underline">
            + Add Vehicle
          </Link>
        </div>
        {previewVehicles.length === 0 ? (
          <EmptyState
            icon={Car}
            title="No vehicles yet"
            subtitle="Add your first vehicle to get started."
            action={<Link to="/dashboard/vehicles"><Button size="sm">Add Vehicle</Button></Link>}
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {previewVehicles.map(v => (
              <div key={v._id} className="card p-4 flex flex-col items-center text-center gap-2">
                {v.vehicleType === 'Bike' || v.vehicleType === 'Scooty' ? (
                  <Bike className="w-8 h-8 text-primary" />
                ) : (
                  <Car className="w-8 h-8 text-primary" />
                )}
                <p className="font-bold text-gray-800 text-sm">{v.registrationNumber}</p>
                <p className="text-xs text-gray-500">{v.make} {v.model}</p>
                {v.color && <span className="text-xs text-gray-400">{v.color}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      {recentCompleted.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Activity</h2>
            <Link to="/dashboard/bookings" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Service</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentCompleted.map(b => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-700">
                      {b.bookingReference || b._id?.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{b.service?.name || b.serviceNameSnapshot || '—'}</td>
                    <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                      {b.startAt ? format(parseISO(b.startAt), 'dd MMM yyyy HH:mm') : '—'}
                    </td>
                    <td className="py-3">
                      <Badge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
