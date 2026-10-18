import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, CheckCircle, Clock, Car, Bike } from 'lucide-react'
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

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [services, setServices] = useState([])

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
      setVehicles(vRes.data.data.vehicles || [])
      setServices(sRes.data.data.services || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const totalBookings = bookings.length
  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'pending').length
  const recentBookings = [...bookings].slice(0, 3)
  const previewVehicles = vehicles.slice(0, 4)
  const popularServices = services.slice(0, 4)

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
        <p className="text-gray-500 mt-1">Here's what's happening with your vehicles.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard icon={CalendarDays} label="Total Bookings" value={totalBookings} bg="bg-blue-50" color="text-primary" />
        <StatsCard icon={CheckCircle} label="Completed" value={completedBookings} bg="bg-green-50" color="text-green-600" />
        <StatsCard icon={Clock} label="Upcoming" value={upcomingBookings} bg="bg-yellow-50" color="text-yellow-600" />
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
                {v.color && (
                  <span className="text-xs text-gray-400">{v.color}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Popular Services */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Popular Services</h2>
        {popularServices.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No services available" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {popularServices.map(s => (
              <div key={s._id} className="card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                  <Badge label={s.vehicleType} />
                </div>
                <p className="text-xs text-gray-500">{s.category}</p>
                <p className="text-lg font-bold text-primary">
                  ₹{s.price?.toLocaleString('en-IN')}
                </p>
                <button
                  onClick={() => navigate(`/dashboard/book?serviceId=${s._id}`)}
                  className="btn btn-primary btn-sm mt-auto"
                >
                  Book
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Bookings */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Bookings</h2>
          <Link to="/dashboard/bookings" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {recentBookings.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No bookings yet" subtitle="Book your first wash to see it here." />
        ) : (
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
                {recentBookings.map(b => (
                  <tr key={b._id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-700">
                      {b.bookingReference || b._id?.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{b.service?.name || '—'}</td>
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
        )}
      </div>
    </div>
  )
}
