import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { bookingsAPI } from '../../api/bookings'
import Tabs from '../../components/ui/Tabs'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const TAB_LIST = [
  { label: 'All', value: '' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Pending', value: 'pending' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Partner Assigned', value: 'partner_assigned' },
  { label: 'Partner Accepted', value: 'partner_accepted' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function MyBookingsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  async function fetchBookings(status) {
    setLoading(true)
    setError(null)
    try {
      const params = status ? { status } : {}
      const res = await bookingsAPI.getMyBookings(params)
      setBookings(res.data.data?.bookings || res.data.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBookings(activeTab) }, [activeTab])
  useEffect(() => {
    const interval = setInterval(() => fetchBookings(activeTab), 30000)
    return () => clearInterval(interval)
  }, [activeTab])

  async function handleCancel() {
    setCancelling(true)
    try {
      await bookingsAPI.cancelBooking(cancelTarget._id)
      toast.success('Booking cancelled.')
      setCancelTarget(null)
      fetchBookings(activeTab)
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking.')
    } finally {
      setCancelling(false)
    }
  }

  const canCancel = (status) => status === 'pending' || status === 'confirmed'

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-500 mt-1">View and manage all your wash bookings.</p>
      </div>

      <Tabs tabs={TAB_LIST} active={activeTab} onChange={val => setActiveTab(val)} />

      {loading ? (
        <Spinner message="Loading bookings..." />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchBookings(activeTab)}>Retry</Button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No bookings found"
          subtitle="Book your first wash to see it here."
          action={<Button onClick={() => navigate('/dashboard/book')}>Book a Wash</Button>}
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4 font-medium">Reference</th>
                <th className="pb-3 pr-4 font-medium">Vehicle</th>
                <th className="pb-3 pr-4 font-medium">Service</th>
                <th className="pb-3 pr-4 font-medium">Service Address</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Price</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Partner</th>
                <th className="pb-3 pr-4 font-medium">Payment</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {bookings.map(b => (
                <tr key={b._id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-700 whitespace-nowrap">
                    {b.bookingReference || b._id?.slice(-8).toUpperCase()}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <p className="font-medium text-gray-800">{b.vehicleId?.licensePlate || '—'}</p>
                    <p className="text-xs text-gray-500">{b.vehicleId?.type} {b.vehicleId?.make} {b.vehicleId?.model}</p>
                  </td>
                  <td className="py-3 pr-4 text-gray-700">{b.serviceId?.name || b.serviceNameSnapshot || '—'}</td>
                  <td className="py-3 pr-4 text-gray-700 min-w-56">
                    <p>{b.customerLocation?.address || '—'}</p>
                    {b.locationMatchStatus === 'location_required' && (
                      <p className="mt-1 text-xs text-amber-700">
                        Nearby matching needs a valid location.
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                    {b.startAt ? format(parseISO(b.startAt), 'dd MMM yyyy, hh:mm a') : '—'}
                  </td>
                  <td className="py-3 pr-4 text-gray-700 whitespace-nowrap">
                    ₹{b.priceAtBooking?.toLocaleString('en-IN') || b.service?.price?.toLocaleString('en-IN') || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge status={b.status} />
                  </td>
                  <td className="py-3 pr-4">
                    {b.partnerId?.name ? (
                      <div>
                        <p className="font-medium text-gray-800">{b.partnerId.name}</p>
                        {b.partnerId.phone && <p className="text-xs text-gray-500">{b.partnerId.phone}</p>}
                        {b.partnerDistanceKm != null && (
                          <p className="text-xs text-gray-500">{Number(b.partnerDistanceKm).toFixed(2)} km away</p>
                        )}
                      </div>
                    ) : <span className="text-gray-400">Pending assignment</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge status={b.paymentStatus} label={b.paymentMethod} />
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/bookings/${b._id}`)}>
                        View
                      </Button>
                      {canCancel(b.status) && (
                        <Button size="sm" variant="danger" onClick={() => setCancelTarget(b)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancel}
        title="Cancel Booking"
        message={`Cancel booking ${cancelTarget?.bookingReference || cancelTarget?._id?.slice(-8).toUpperCase()}? This cannot be undone.`}
        confirmLabel="Cancel Booking"
        loading={cancelling}
      />
    </div>
  )
}
