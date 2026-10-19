import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, DollarSign, Briefcase } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

export default function AdminPartnerDetailPage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  async function loadPartner() {
    try {
      const res = await adminAPI.getPartner(id)
      setData(res.data.data)
    } catch (err) {
      toast.error(err.message || 'Failed to load partner.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    setVerifying(true)
    try {
      await adminAPI.verifyPartner(id)
      toast.success('Partner verified.')
      loadPartner()
    } catch (err) {
      toast.error(err.message || 'Failed to verify.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleDeactivate() {
    if (!window.confirm('Deactivate this partner account? They will not be able to login.')) return
    setDeactivating(true)
    try {
      await adminAPI.deactivatePartner(id)
      toast.success('Partner deactivated.')
      loadPartner()
    } catch (err) {
      toast.error(err.message || 'Failed to deactivate.')
    } finally {
      setDeactivating(false)
    }
  }

  useEffect(() => { loadPartner() }, [id])

  if (loading) return <Spinner message="Loading partner..." />
  if (!data) return (
    <div className="p-6 text-center">
      <p className="text-gray-500 mb-4">Partner not found.</p>
      <Link to="/admin/partners"><Button variant="outline">Back to Partners</Button></Link>
    </div>
  )

  const { partner, profile, recentJobs, stats } = data

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <Link to="/admin/partners" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" />
        Back to Partners
      </Link>

      {/* Header */}
      <div className="card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{partner.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{partner.email}</p>
          <p className="text-gray-400 text-xs mt-1">Joined {partner.createdAt ? format(parseISO(partner.createdAt), 'dd MMM yyyy') : '—'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {profile?.isVerified ? (
            <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-3 py-1 rounded-full text-sm font-medium">
              <CheckCircle className="w-4 h-4" /> Verified
            </span>
          ) : (
            <Button size="sm" loading={verifying} onClick={handleVerify}>
              Verify Partner
            </Button>
          )}
          {partner.isActive ? (
            <Button size="sm" variant="danger" loading={deactivating} onClick={handleDeactivate}>
              Deactivate
            </Button>
          ) : (
            <span className="text-xs text-red-700 bg-red-100 px-3 py-1 rounded-full font-medium">Deactivated</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Briefcase className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Completed Jobs</p>
            <p className="text-xl font-bold text-gray-800">{stats.completedJobs}</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Earnings</p>
            <p className="text-xl font-bold text-gray-800">₹{stats.totalEarnings.toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      {profile && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Profile Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Phone</p>
              <p className="font-medium text-gray-800">{profile.phone || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Service Categories</p>
              <p className="font-medium text-gray-800">
                {profile.serviceCategories?.join(', ') || '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Service Radius</p>
              <p className="font-medium text-gray-800">{profile.serviceRadius} km</p>
            </div>
            <div>
              <p className="text-gray-500">Rating</p>
              <p className="font-medium text-gray-800">
                {profile.rating?.average ? `${profile.rating.average.toFixed(1)} (${profile.rating.count} reviews)` : '—'}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Vehicle Owned</p>
              <p className="font-medium text-gray-800">{profile.vehicleOwned || '—'}</p>
            </div>
            <div>
              <p className="text-gray-500">Availability</p>
              <p className={`font-medium ${profile.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                {profile.isAvailable ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Documents */}
      {profile?.documents?.length > 0 && (
        <div className="card p-5">
          <h2 className="font-semibold text-gray-800 mb-3">Documents</h2>
          <div className="space-y-2">
            {profile.documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <p className="text-gray-700">{doc.type || `Document ${i + 1}`}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${doc.verified ? 'text-green-700 bg-green-100' : 'text-yellow-700 bg-yellow-100'}`}>
                  {doc.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Recent Jobs</h2>
        {recentJobs.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Reference</th>
                  <th className="pb-3 pr-4 font-medium">Service</th>
                  <th className="pb-3 pr-4 font-medium">Vehicle</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Price</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentJobs.map((job) => (
                  <tr key={job._id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-mono text-xs text-gray-700">
                      {job.bookingReference || job._id?.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">{job.serviceId?.name || '—'}</td>
                    <td className="py-3 pr-4 text-gray-600">
                      {job.vehicleId?.make} {job.vehicleId?.model}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                      {job.startAt ? format(parseISO(job.startAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 pr-4 text-gray-700">₹{job.priceAtBooking?.toLocaleString('en-IN')}</td>
                    <td className="py-3">
                      <Badge status={job.status} />
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
