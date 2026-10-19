import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { partnerAPI } from '../../api/partner'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

const TAB_LIST = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'partner_assigned,partner_on_way,partner_arrived,in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function PartnerJobsPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  async function fetchJobs(status) {
    setLoading(true)
    setError(null)
    try {
      const params = status ? { status } : {}
      const res = await partnerAPI.getJobs(params)
      setJobs(res.data.data.jobs || [])
    } catch (err) {
      setError(err.message || 'Failed to load jobs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchJobs(activeTab) }, [activeTab])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Jobs</h1>
        <p className="text-gray-500 mt-1">View all your assigned and completed jobs.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TAB_LIST.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              activeTab === tab.value
                ? 'bg-[#147DAB] text-white border-[#147DAB]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#147DAB] hover:text-[#147DAB]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner message="Loading jobs..." />
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchJobs(activeTab)}>Retry</Button>
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No jobs found" subtitle="Accepted jobs will appear here." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 pr-4 font-medium">Reference</th>
                <th className="pb-3 pr-4 font-medium">Service</th>
                <th className="pb-3 pr-4 font-medium">Vehicle</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Price</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jobs.map((job) => (
                <tr key={job._id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-mono text-xs text-gray-700">
                    {job.bookingReference || job._id?.slice(-8).toUpperCase()}
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    {job.serviceId?.name || job.serviceNameSnapshot}
                  </td>
                  <td className="py-3 pr-4 text-gray-600">
                    {job.vehicleId?.make} {job.vehicleId?.model}
                  </td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">
                    {job.startAt ? format(parseISO(job.startAt), 'dd MMM yyyy') : '—'}
                  </td>
                  <td className="py-3 pr-4 text-gray-700">
                    ₹{job.priceAtBooking?.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 pr-4">
                    <Badge status={job.status} />
                  </td>
                  <td className="py-3">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/partner/jobs/${job._id}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
