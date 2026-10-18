import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CalendarDays } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function AdminBookingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [bookings, setBookings] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const limit = 10
  const debounceRef = useRef(null)

  // Debounce search input
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 300)
  }

  async function fetchBookings() {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (debouncedSearch) params.search = debouncedSearch
      if (status) params.status = status
      if (date) params.date = date
      const res = await adminAPI.getBookings(params)
      const data = res.data.data
      setBookings(data.bookings || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBookings() }, [page, debouncedSearch, status, date])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-500 mt-1">Manage all customer bookings.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search reference, customer..."
            value={search}
            onChange={handleSearchChange}
            className="input pl-9 w-full"
          />
        </div>
        <select
          className="input w-44"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          type="date"
          className="input w-44"
          value={date}
          onChange={(e) => { setDate(e.target.value); setPage(1) }}
        />
      </div>

      {loading ? (
        <Spinner message="Loading bookings..." />
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchBookings}>Retry</Button>
        </div>
      ) : bookings.length === 0 ? (
        <EmptyState icon={CalendarDays} title="No bookings found" subtitle="Try adjusting your filters." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Reference</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Vehicle</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Service</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Date/Time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Price</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Payment</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs text-gray-700">
                      {b.bookingReference || b._id?.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-800">{b.customer?.name || '—'}</p>
                      <p className="text-xs text-gray-400">{b.customer?.email || ''}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="text-gray-700">{b.vehicle?.registrationNumber || '—'}</p>
                      <p className="text-xs text-gray-400">{b.vehicle?.vehicleType || ''}</p>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{b.service?.name || '—'}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {b.startAt ? format(parseISO(b.startAt), 'dd MMM, hh:mm a') : '—'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-700">
                      {b.totalAmount != null ? `₹${Number(b.totalAmount).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={b.status} />
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={b.paymentStatus} />
                    </td>
                    <td className="py-3 px-4">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/bookings/${b._id}`)}>
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
