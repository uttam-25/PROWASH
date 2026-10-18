import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'

export default function AdminCustomersPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customers, setCustomers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef(null)
  const limit = 10

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 300)
  }

  async function fetchCustomers() {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (debouncedSearch) params.search = debouncedSearch
      const res = await adminAPI.getCustomers(params)
      const data = res.data.data
      setCustomers(data.customers || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load customers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [page, debouncedSearch])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="text-gray-500 mt-1">View and manage customers.</p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, phone..."
          value={search}
          onChange={handleSearchChange}
          className="input pl-9 w-full"
        />
      </div>

      {loading ? (
        <Spinner message="Loading customers..." />
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchCustomers}>Retry</Button>
        </div>
      ) : customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers found" subtitle="Try a different search." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Phone</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Joined</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Bookings</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={c.name} size="sm" />
                        <span className="font-medium text-gray-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{c.email || '—'}</td>
                    <td className="py-3 px-4 text-gray-500">{c.phone || '—'}</td>
                    <td className="py-3 px-4 text-gray-500">
                      {c.createdAt ? format(parseISO(c.createdAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{c.bookingCount ?? '—'}</td>
                    <td className="py-3 px-4">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/customers/${c._id}`)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
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
