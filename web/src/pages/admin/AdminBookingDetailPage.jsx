import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-purple-100 text-purple-800',
}

const NEXT_STATUSES = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['in_progress', 'cancelled', 'rescheduled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  rescheduled: [],
}

export default function AdminBookingDetailPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [booking, setBooking] = useState(null)
  const [nextStatus, setNextStatus] = useState('')
  const [note, setNote] = useState('')
  const [updating, setUpdating] = useState(false)

  async function fetchBooking() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminAPI.getBooking(id)
      const b = res.data.data.booking
      setBooking(b)
      const options = NEXT_STATUSES[b.status] || []
      setNextStatus(options[0] || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load booking.')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStatus() {
    if (!nextStatus) return
    setUpdating(true)
    try {
      await adminAPI.updateBookingStatus(id, nextStatus, note)
      toast.success(`Status updated to ${nextStatus.replace('_', ' ')}.`)
      setNote('')
      fetchBooking()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status.')
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => { fetchBooking() }, [id])

  if (loading) return <Spinner message="Loading booking..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={fetchBooking}>Retry</Button>
    </div>
  )
  if (!booking) return null

  const nextOptions = NEXT_STATUSES[booking.status] || []

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <Link to="/admin/bookings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" />
        Back to Bookings
      </Link>

      {/* Header */}
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Booking Reference</p>
          <p className="text-xl font-bold font-mono text-gray-900">
            {booking.bookingReference || booking._id?.slice(-8).toUpperCase()}
          </p>
        </div>
        <span className={`badge text-base px-4 py-1.5 font-semibold ${STATUS_COLORS[booking.status] || 'bg-gray-100 text-gray-700'}`}>
          {booking.status?.replace('_', ' ')}
        </span>
      </div>

      {/* 4 Info Cards (2x2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Customer */}
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Customer</p>
          <p className="font-bold text-gray-800 text-lg">{booking.customer?.name || '—'}</p>
          <p className="text-sm text-gray-500">{booking.customer?.email || '—'}</p>
          <p className="text-sm text-gray-500">{booking.customer?.phone || '—'}</p>
        </div>

        {/* Vehicle */}
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Vehicle</p>
          <p className="font-bold text-gray-800 text-lg">{booking.vehicle?.registrationNumber || '—'}</p>
          <p className="text-sm text-gray-500">{booking.vehicle?.make} {booking.vehicle?.model}</p>
          {booking.vehicle?.vehicleType && <Badge label={booking.vehicle.vehicleType} />}
        </div>

        {/* Service */}
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Service</p>
          <p className="font-bold text-gray-800 text-lg">{booking.service?.name || '—'}</p>
          {booking.service?.category && <p className="text-sm text-gray-500">{booking.service.category}</p>}
          <p className="text-primary font-semibold">
            {booking.service?.price != null ? `₹${Number(booking.service.price).toLocaleString('en-IN')}` : '—'}
          </p>
          {booking.service?.durationMinutes && (
            <p className="text-sm text-gray-400">{booking.service.durationMinutes} min</p>
          )}
        </div>

        {/* Payment */}
        <div className="card p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payment</p>
          <div className="flex items-center gap-2">
            <Badge label={booking.paymentMethod} />
            <Badge status={booking.paymentStatus} />
          </div>
          <p className="text-xl font-bold text-gray-800">
            {booking.totalAmount != null ? `₹${Number(booking.totalAmount).toLocaleString('en-IN')}` : '—'}
          </p>
        </div>
      </div>

      {/* Status Update */}
      {nextOptions.length > 0 && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Update Status</h3>
          <p className="text-sm text-gray-500">
            Current status: <span className={`badge ${STATUS_COLORS[booking.status] || ''}`}>{booking.status?.replace('_', ' ')}</span>
          </p>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">New Status</label>
              <select
                className="input w-full sm:w-60"
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
              >
                {nextOptions.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Note (optional)</label>
              <textarea
                className="input w-full resize-none"
                rows={3}
                placeholder="Add a note about this status change..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
            <Button loading={updating} onClick={handleUpdateStatus} disabled={!nextStatus}>
              Update Status
            </Button>
          </div>
        </div>
      )}

      {/* Status History Timeline */}
      {booking.statusHistory && booking.statusHistory.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Status History</h3>
          <ol className="relative border-l-2 border-gray-200 space-y-5 ml-2">
            {booking.statusHistory.map((entry, idx) => (
              <li key={idx} className="relative pl-6">
                <span
                  className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-white ${
                    STATUS_COLORS[entry.status]?.split(' ')[0] || 'bg-gray-400'
                  }`}
                />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <Badge status={entry.status} className="self-start" />
                  {entry.note && <p className="text-sm text-gray-600 sm:ml-2">— {entry.note}</p>}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {entry.timestamp ? format(parseISO(entry.timestamp), 'dd MMM yyyy, hh:mm a') : ''}
                  {entry.changedBy && <span className="ml-2">by {entry.changedBy}</span>}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
