import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users, CheckCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'

export default function AdminPartnersPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [partners, setPartners] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [verifying, setVerifying] = useState(null)
  const debounceRef = useRef(null)
  const limit = 10

  function handleSearchChange(e) {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 300)
  }

  async function fetchPartners() {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (debouncedSearch) params.search = debouncedSearch
      const res = await adminAPI.getPartners(params)
      const data = res.data.data
      setPartners(data.partners || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.message || 'Failed to load partners.')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(id) {
    setVerifying(id)
    try {
      await adminAPI.verifyPartner(id)
      toast.success('Partner verified.')
      fetchPartners()
    } catch (err) {
      toast.error(err.message || 'Failed to verify partner.')
    } finally {
      setVerifying(null)
    }
  }

  useEffect(() => { fetchPartners() }, [page, debouncedSearch])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cleaning Partners</h1>
        <p className="text-gray-500 mt-1">Manage and verify cleaning partner accounts.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={handleSearchChange}
          className="input pl-9 w-full"
        />
      </div>

      {loading ? (
        <Spinner message="Loading partners..." />
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchPartners}>Retry</Button>
        </div>
      ) : partners.length === 0 ? (
        <EmptyState icon={Users} title="No partners found" subtitle="No cleaning partners registered yet." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Verified</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Available</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Rating</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Jobs</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => {
                  const isVerified = p.profile?.isVerified
                  const isAvailable = p.profile?.isAvailable
                  return (
                    <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-800">{p.name}</td>
                      <td className="py-3 px-4 text-gray-500">{p.email || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">{p.profile?.phone || p.phone || '—'}</td>
                      <td className="py-3 px-4">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full font-medium">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          isAvailable ? 'text-green-700 bg-green-100' : 'text-gray-500 bg-gray-100'
                        }`}>
                          {isAvailable ? 'Online' : 'Offline'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {p.profile?.rating?.average ? p.profile.rating.average.toFixed(1) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{p.profile?.completedJobs ?? '—'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          {!isVerified && (
                            <Button
                              size="sm"
                              loading={verifying === p._id}
                              onClick={() => handleVerify(p._id)}
                            >
                              Verify
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/admin/partners/${p._id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between flex-wrap gap-3 text-sm text-gray-600">
            <p>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
