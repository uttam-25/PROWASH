import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, DollarSign, Star, ToggleLeft, ToggleRight, MapPin } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { partnerAPI } from '../../api/partner'
import { useAuth } from '../../hooks/useAuth'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function PartnerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [requests, setRequests] = useState([])
  const [activeJobs, setActiveJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [accepting, setAccepting] = useState(null)
  const socketRef = useRef(null)

  async function loadData() {
    try {
      const [profileRes, requestsRes, jobsRes] = await Promise.all([
        partnerAPI.getProfile(),
        partnerAPI.getNearbyRequests(),
        partnerAPI.getJobs({ status: 'partner_assigned,partner_on_way,partner_arrived,in_progress' }),
      ])
      setProfile(profileRes.data.data.profile)
      setRequests(requestsRes.data.data.requests || [])
      setActiveJobs(jobsRes.data.data.jobs || [])
    } catch (err) {
      toast.error(err.message || 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleAvailability() {
    setToggling(true)
    try {
      const res = await partnerAPI.toggleAvailability()
      setProfile(res.data.data.profile)
      toast.success(res.data.data.profile.isAvailable ? 'You are now available' : 'You are now unavailable')
    } catch (err) {
      toast.error(err.message || 'Failed to update availability.')
    } finally {
      setToggling(false)
    }
  }

  async function handleAccept(bookingId) {
    setAccepting(bookingId)
    try {
      await partnerAPI.acceptRequest(bookingId)
      toast.success('Job accepted!')
      loadData()
    } catch (err) {
      toast.error(err.message || 'Failed to accept job.')
    } finally {
      setAccepting(null)
    }
  }

  async function handleReject(bookingId) {
    try {
      await partnerAPI.rejectRequest(bookingId)
      setRequests((prev) => prev.filter((r) => r._id !== bookingId))
    } catch (err) {
      toast.error(err.message || 'Failed to reject.')
    }
  }

  // Socket.IO for real-time new:request events
  useEffect(() => {
    let socket
    import('socket.io-client').then(({ io }) => {
      const apiUrl = import.meta.env.VITE_API_URL || window.location.origin
      socket = io(apiUrl, { path: '/socket.io', transports: ['websocket', 'polling'] })
      socketRef.current = socket
      if (user?._id) {
        socket.emit('join:partner', { partnerId: user._id })
        socket.emit('join:partners')
      }
      socket.on('new:request', () => {
        partnerAPI.getNearbyRequests()
          .then((res) => setRequests(res.data.data.requests || []))
          .catch(() => {})
      })
    }).catch(() => {})

    return () => {
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [user?._id])

  useEffect(() => { loadData() }, [])

  if (loading) return <Spinner message="Loading dashboard..." />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Partner Dashboard</h1>
        <p className="text-gray-500 mt-1">Manage your availability and jobs.</p>
      </div>

      {/* Availability Toggle */}
      <div className="card p-5 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800">Availability</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {profile?.isAvailable ? 'You are currently available for jobs' : 'You are currently offline'}
          </p>
        </div>
        <button
          onClick={handleToggleAvailability}
          disabled={toggling}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
            profile?.isAvailable
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {profile?.isAvailable ? (
            <><ToggleRight className="w-5 h-5" /> Online</>
          ) : (
            <><ToggleLeft className="w-5 h-5" /> Offline</>
          )}
        </button>
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Completed Jobs</p>
              <p className="text-xl font-bold text-gray-800">{profile.completedJobs || 0}</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Earnings</p>
              <p className="text-xl font-bold text-gray-800">
                ₹{(profile.totalEarnings || 0).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4">
            <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Rating</p>
              <p className="text-xl font-bold text-gray-800">
                {profile.rating?.average ? profile.rating.average.toFixed(1) : '—'}
                {profile.rating?.count > 0 && (
                  <span className="text-sm font-normal text-gray-400 ml-1">({profile.rating.count})</span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Job */}
      {activeJobs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Active Job</h2>
          <div className="card p-5 border-l-4 border-[#147DAB]">
            {activeJobs.slice(0, 1).map((job) => (
              <div key={job._id} className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-800">
                    {job.serviceId?.name || job.serviceNameSnapshot}
                  </p>
                  <p className="text-sm text-gray-500">
                    {job.vehicleId?.make} {job.vehicleId?.model} · {job.vehicleId?.licensePlate}
                  </p>
                  {job.startAt && (
                    <p className="text-xs text-gray-400">
                      {format(parseISO(job.startAt), 'dd MMM yyyy, hh:mm a')}
                    </p>
                  )}
                  <Badge status={job.status} />
                </div>
                <Button size="sm" onClick={() => navigate(`/partner/jobs/${job._id}`)}>
                  Manage Job
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nearby Requests */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Nearby Requests
          {requests.length > 0 && (
            <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {requests.length}
            </span>
          )}
        </h2>
        {requests.length === 0 ? (
          <div className="card p-8 text-center text-gray-400">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No nearby requests right now</p>
            <p className="text-sm mt-1">New requests will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req._id} className="card p-5 flex items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <p className="font-semibold text-gray-800">
                    {req.serviceId?.name || req.serviceNameSnapshot}
                  </p>
                  <p className="text-sm text-gray-500">
                    {req.vehicleId?.make} {req.vehicleId?.model}
                  </p>
                  {req.customerLocation?.address && (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {req.customerLocation.address}
                    </p>
                  )}
                  <p className="text-lg font-bold text-[#147DAB]">
                    ₹{req.priceAtBooking?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  <Button
                    size="sm"
                    loading={accepting === req._id}
                    onClick={() => handleAccept(req._id)}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleReject(req._id)}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
