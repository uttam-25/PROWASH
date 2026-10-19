import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, Camera } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { partnerAPI } from '../../api/partner'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const STATUS_BUTTON_MAP = {
  partner_assigned: { label: 'Head to Location', next: 'partner_on_way' },
  partner_on_way:   { label: 'Mark Arrived',     next: 'partner_arrived' },
  partner_arrived:  { label: 'Start Service',    next: 'in_progress' },
  in_progress:      { label: 'Complete Service', next: 'completed' },
}

export default function PartnerJobPage() {
  const { id } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const socketRef = useRef(null)

  async function loadJob() {
    try {
      const res = await partnerAPI.getJobs()
      const jobs = res.data.data.jobs || []
      const found = jobs.find((j) => j._id === id)
      if (found) setBooking(found)
      else toast.error('Job not found.')
    } catch (err) {
      toast.error(err.message || 'Failed to load job.')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusUpdate() {
    const next = STATUS_BUTTON_MAP[booking?.status]?.next
    if (!next) return
    setUpdating(true)
    try {
      const res = await partnerAPI.updateJobStatus(id, next)
      setBooking(res.data.data.booking)
      toast.success('Status updated.')
    } catch (err) {
      toast.error(err.message || 'Failed to update status.')
    } finally {
      setUpdating(false)
    }
  }

  // Socket.IO — listen for status updates on this booking
  useEffect(() => {
    let socket
    import('socket.io-client').then(({ io }) => {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin
      socket = io(apiUrl, { path: '/socket.io', transports: ['websocket', 'polling'] })
      socketRef.current = socket
      socket.emit('join:booking', { bookingId: id })
      socket.on('booking:status_update', (data) => {
        if (data.bookingId === id || data.bookingId?.toString() === id) {
          setBooking((prev) => prev ? { ...prev, status: data.status } : prev)
        }
      })
    }).catch(() => {})
    return () => {
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [id])

  useEffect(() => { loadJob() }, [id])

  if (loading) return <Spinner message="Loading job..." />
  if (!booking) return (
    <div className="p-6 text-center">
      <p className="text-gray-500 mb-4">Job not found.</p>
      <Link to="/partner/jobs"><Button variant="outline">Back to Jobs</Button></Link>
    </div>
  )

  const nextAction = STATUS_BUTTON_MAP[booking.status]

  return (
    <div className="space-y-6 max-w-2xl">
      <Link to="/partner/jobs" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" />
        Back to Jobs
      </Link>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Booking Reference</p>
            <p className="font-bold font-mono text-gray-800">
              {booking.bookingReference || booking._id?.slice(-8).toUpperCase()}
            </p>
          </div>
          <Badge status={booking.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Service</p>
          <p className="font-bold text-gray-800">{booking.serviceId?.name || booking.serviceNameSnapshot}</p>
          <p className="text-lg font-bold text-[#147DAB]">₹{booking.priceAtBooking?.toLocaleString('en-IN')}</p>
        </div>
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vehicle</p>
          <p className="font-bold text-gray-800">
            {booking.vehicleId?.make} {booking.vehicleId?.model}
          </p>
          <p className="text-sm text-gray-500">{booking.vehicleId?.licensePlate}</p>
        </div>
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</p>
          <p className="font-bold text-gray-800">{booking.customerId?.name || '—'}</p>
          <p className="text-sm text-gray-500">{booking.customerId?.phone || '—'}</p>
        </div>
        <div className="card p-5 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled</p>
          {booking.startAt ? (
            <>
              <p className="font-bold text-gray-800">{format(parseISO(booking.startAt), 'EEEE, dd MMM yyyy')}</p>
              <p className="text-sm text-gray-500">{format(parseISO(booking.startAt), 'hh:mm a')}</p>
            </>
          ) : <p className="text-gray-400">—</p>}
        </div>
      </div>

      {/* Location */}
      {booking.customerLocation?.address && (
        <div className="card p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Customer Location</p>
          <p className="text-gray-800">{booking.customerLocation.address}</p>
        </div>
      )}

      {/* Status progression button */}
      {nextAction && booking.status !== 'completed' && (
        <Button
          className="w-full"
          size="lg"
          loading={updating}
          onClick={handleStatusUpdate}
        >
          {nextAction.label}
        </Button>
      )}

      {booking.status === 'completed' && (
        <div className="card p-5 text-center text-green-700 bg-green-50">
          <p className="font-semibold">✓ Job Completed</p>
        </div>
      )}

      {/* Photo upload section */}
      {['partner_arrived', 'in_progress', 'completed'].includes(booking.status) && (
        <PhotoUploadSection bookingId={booking._id} onUploaded={loadJob} />
      )}
    </div>
  )
}

function PhotoUploadSection({ bookingId, onUploaded }) {
  const [uploading, setUploading] = useState(false)
  const [type, setType] = useState('before')

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setUploading(true)
    try {
      // For now, use placeholder URLs — real upload would call a storage service
      const urls = files.map((f) => URL.createObjectURL(f))
      await partnerAPI.uploadPhotos(bookingId, { type, urls })
      toast.success(`${type} photos saved.`)
      if (onUploaded) onUploaded()
    } catch (err) {
      toast.error(err.message || 'Failed to upload photos.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Camera className="w-5 h-5 text-[#147DAB]" />
        <p className="font-semibold text-gray-800">Upload Photos</p>
      </div>
      <div className="flex gap-3">
        {['before', 'after'].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all capitalize ${
              type === t
                ? 'border-[#147DAB] bg-[#147DAB] text-white'
                : 'border-gray-300 text-gray-600 hover:border-[#147DAB]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
        uploading ? 'opacity-60 cursor-not-allowed' : 'border-gray-300 hover:border-[#147DAB] text-gray-500 hover:text-[#147DAB]'
      }`}>
        <Camera className="w-4 h-4" />
        <span className="text-sm font-medium">{uploading ? 'Uploading...' : `Upload ${type} photos`}</span>
        <input type="file" accept="image/*" multiple className="hidden" disabled={uploading} onChange={handleUpload} />
      </label>
    </div>
  )
}
