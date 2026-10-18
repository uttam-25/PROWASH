import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CalendarDays } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import StatsCard from '../../components/ui/StatsCard'
import EmptyState from '../../components/ui/EmptyState'
import { CheckCircle, Clock, XCircle, CalendarCheck } from 'lucide-react'

export default function AdminCustomerDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customer, setCustomer] = useState(null)

  async function fetchCustomer() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminAPI.getCustomer(id)
      setCustomer(res.data.data.customer)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customer.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomer() }, [id])

  if (loading) return <Spinner message="Loading customer..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={fetchCustomer}>Retry</Button>
    </div>
  )
  if (!customer) return null

  const bookings = customer.bookings || []
  const vehicles = customer.vehicles || []
  const stats = customer.stats || {}

  const totalCount = stats.total ?? bookings.length
  const completedCount = stats.completed ?? bookings.filter((b) => b.status === 'completed').length
  const pendingCount = stats.pending ?? bookings.filter((b) => b.status === 'pending').length
  const cancelledCount = stats.cancelled ?? bookings.filter((b) => b.status === 'cancelled').length

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link to="/admin/customers" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" />
        Back to Customers
      </Link>

      {/* Profile Card */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <Avatar name={customer.name} size="xl" />
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">{customer.name}</h2>
          <p className="text-gray-500">{customer.email}</p>
          <p className="text-gray-500">{customer.phone || '—'}</p>
          <p className="text-xs text-gray-400">
            Joined {customer.createdAt ? format(parseISO(customer.createdAt), 'dd MMM yyyy') : '—'}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatsCard icon={CalendarCheck} label="Total" value={totalCount} color="text-blue-600" bg="bg-blue-50" />
        <StatsCard icon={CheckCircle} label="Completed" value={completedCount} color="text-green-600" bg="bg-green-50" />
        <StatsCard icon={Clock} label="Pending" value={pendingCount} color="text-yellow-600" bg="bg-yellow-50" />
        <StatsCard icon={XCircle} label="Cancelled" value={cancelledCount} color="text-red-600" bg="bg-red-50" />
      </div>

      {/* Vehicles */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Vehicles</h3>
        {vehicles.length === 0 ? (
          <p className="text-gray-400 text-sm">No vehicles registered.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.map((v) => (
              <div key={v._id} className="border border-gray-100 rounded-xl p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-800">{v.registrationNumber}</p>
                  <Badge label={v.vehicleType} />
                </div>
                <p className="text-sm text-gray-500">{v.make} {v.model}</p>
                {v.color && (
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-gray-200 inline-block"
                      style={{ background: v.color.toLowerCase() }}
                    />
                    <span className="text-xs text-gray-400">{v.color}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking History */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Booking History</h3>
        {bookings.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No bookings yet" subtitle="This customer has not made any bookings." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Reference</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Service</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs text-gray-700">
                      {b.bookingReference || b._id?.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-2 px-3 text-gray-600">{b.service?.name || '—'}</td>
                    <td className="py-2 px-3 text-gray-500 text-xs">
                      {b.startAt ? format(parseISO(b.startAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-2 px-3">
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
