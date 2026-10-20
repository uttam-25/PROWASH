import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock } from 'lucide-react'
import { format, parseISO, addDays } from 'date-fns'
import toast from 'react-hot-toast'
import { bookingsAPI } from '../../api/bookings'
import { availabilityAPI } from '../../api/availability'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-purple-100 text-purple-800',
}

export default function BookingDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [booking, setBooking] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Reschedule state
  const [rescheduleDate, setRescheduleDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [rescheduling, setRescheduling] = useState(false)

  const next14Days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

  async function fetchBooking() {
    setLoading(true)
    setError(null)
    try {
      const res = await bookingsAPI.getBooking(id)
      setBooking(res.data.data.booking)
    } catch (err) {
      setError(err.message || 'Failed to load booking.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSlots(date) {
    if (!booking?.service?._id && !booking?.service) return
    setSlotsLoading(true)
    setSlotsError(null)
    setSelectedSlot(null)
    try {
      const serviceId = booking.service?._id || booking.service
      const dateStr = format(date, 'yyyy-MM-dd')
      const res = await availabilityAPI.getSlots(serviceId, dateStr)
      setSlots(res.data.data.slots || [])
    } catch {
      setSlotsError('Failed to load available slots.')
    } finally {
      setSlotsLoading(false)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await bookingsAPI.cancelBooking(id)
      toast.success('Booking cancelled.')
      setCancelOpen(false)
      navigate('/dashboard/bookings')
    } catch (err) {
      toast.error(err.message || 'Failed to cancel booking.')
    } finally {
      setCancelling(false)
    }
  }

  async function handleReschedule() {
    if (!selectedSlot) return
    setRescheduling(true)
    try {
      await bookingsAPI.rescheduleBooking(id, selectedSlot.startAt)
      toast.success('Booking rescheduled!')
      setRescheduleDate(null)
      setSelectedSlot(null)
      fetchBooking()
    } catch (err) {
      toast.error(err.message || 'Failed to reschedule.')
    } finally {
      setRescheduling(false)
    }
  }

  useEffect(() => { fetchBooking() }, [id])
  useEffect(() => { if (rescheduleDate) fetchSlots(rescheduleDate) }, [rescheduleDate])

  if (loading) return <Spinner message="Loading booking..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={fetchBooking}>Retry</Button>
    </div>
  )
  if (!booking) return null

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Link to="/dashboard/bookings" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
          Back to My Bookings
        </Link>
        {canCancel && (
          <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
            Cancel Booking
          </Button>
        )}
      </div>

      {/* Booking Header */}
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

      {/* 2x2 Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Service */}
        <div className="card p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</p>
          <p className="font-bold text-gray-800 text-lg">{booking.service?.name || '—'}</p>
          {booking.service?.category && <Badge label={booking.service.category} />}
          <div className="flex items-center gap-4 pt-1">
            <p className="text-xl font-bold text-primary">
              ₹{(booking.priceAtBooking ?? booking.service?.price)?.toLocaleString('en-IN')}
            </p>
            {booking.service?.durationMinutes && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {booking.service.durationMinutes} min
              </div>
            )}
          </div>
        </div>

        {/* Vehicle */}
        <div className="card p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</p>
          <p className="font-bold text-gray-800 text-lg">{booking.vehicle?.registrationNumber || '—'}</p>
          <p className="text-sm text-gray-500">
            {booking.vehicle?.make} {booking.vehicle?.model}
          </p>
          {booking.vehicle?.vehicleType && <Badge label={booking.vehicle.vehicleType} />}
          {booking.vehicle?.color && <p className="text-sm text-gray-400">{booking.vehicle.color}</p>}
        </div>

        {/* Appointment */}
        <div className="card p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Appointment</p>
          {booking.startAt ? (
            <>
              <p className="font-bold text-gray-800">{format(parseISO(booking.startAt), 'EEEE, dd MMMM yyyy')}</p>
              <p className="text-lg text-gray-600">{format(parseISO(booking.startAt), 'hh:mm a')}</p>
              {booking.service?.durationMinutes && (
                <p className="text-sm text-gray-400">{booking.service.durationMinutes} min duration</p>
              )}
            </>
          ) : <p className="text-gray-400">—</p>}
        </div>

        {/* Payment */}
        <div className="card p-5 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</p>
          <div className="flex items-center gap-2">
            <Badge label={booking.paymentMethod} />
            <Badge status={booking.paymentStatus} />
          </div>
          <p className="text-xl font-bold text-gray-800">
            ₹{(booking.priceAtBooking ?? booking.service?.price)?.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Status Timeline */}
      {booking.statusHistory && booking.statusHistory.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Status History</h3>
          <ol className="relative border-l-2 border-gray-200 space-y-5 ml-2">
            {booking.statusHistory.map((entry, idx) => (
              <li key={idx} className="relative pl-6">
                <span className={`absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-2 border-white ${STATUS_COLORS[entry.status]?.split(' ')[0] || 'bg-gray-400'}`} />
                <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                  <Badge status={entry.status} className="self-start" />
                  {entry.note && <p className="text-sm text-gray-600 sm:ml-2">— {entry.note}</p>}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {entry.changedAt ? format(parseISO(entry.changedAt), 'dd MMM yyyy, hh:mm a') : ''}
                  {entry.changedBy?.name && <span className="ml-2">by {entry.changedBy.name}</span>}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Reschedule Section */}
      {booking.status === 'confirmed' && (
        <div className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Reschedule</h3>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {next14Days.map(day => {
              const isSelected = rescheduleDate && format(day, 'yyyy-MM-dd') === format(rescheduleDate, 'yyyy-MM-dd')
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setRescheduleDate(day)}
                  className={`flex flex-col items-center px-3 py-2 rounded-xl border-2 flex-shrink-0 transition-all ${
                    isSelected ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:border-primary text-gray-700'
                  }`}
                >
                  <span className="text-xs font-medium">{format(day, 'EEE')}</span>
                  <span className="text-lg font-bold">{format(day, 'dd')}</span>
                  <span className="text-xs">{format(day, 'MMM')}</span>
                </button>
              )
            })}
          </div>

          {rescheduleDate && (
            <div>
              {slotsLoading ? (
                <Spinner message="Loading slots..." />
              ) : slotsError ? (
                <div className="text-center py-4">
                  <p className="text-red-600 mb-2">{slotsError}</p>
                  <Button size="sm" onClick={() => fetchSlots(rescheduleDate)}>Retry</Button>
                </div>
              ) : slots.length === 0 ? (
                <EmptyState icon={Clock} title="No slots available" subtitle="Try a different date." />
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {slots.map(slot => {
                    const isSelected = selectedSlot?.startAt === slot.startAt
                    return (
                      <button
                        key={slot.startAt}
                        onClick={() => setSelectedSlot(slot)}
                        disabled={!slot.available}
                        className={`py-2 px-3 rounded-xl text-sm font-medium border-2 transition-all ${
                          !slot.available ? 'border-gray-100 text-gray-300 bg-gray-50 cursor-not-allowed'
                          : isSelected ? 'border-primary bg-primary text-white'
                          : 'border-gray-200 hover:border-primary text-gray-700'
                        }`}
                      >
                        {format(parseISO(slot.startAt), 'hh:mm a')}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {selectedSlot && (
            <div className="flex justify-end">
              <Button loading={rescheduling} onClick={handleReschedule}>
                Reschedule to {format(parseISO(selectedSlot.startAt), 'dd MMM, hh:mm a')}
              </Button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancel}
        title="Cancel Booking"
        message={`Cancel booking ${booking.bookingReference || booking._id?.slice(-8).toUpperCase()}? This cannot be undone.`}
        confirmLabel="Cancel Booking"
        loading={cancelling}
      />
    </div>
  )
}
