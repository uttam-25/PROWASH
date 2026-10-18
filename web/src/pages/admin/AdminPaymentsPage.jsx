import { useState, useEffect } from 'react'
import { CreditCard } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const METHOD_TABS = [
  { value: '', label: 'All Methods' },
  { value: 'cod', label: 'COD' },
  { value: 'online', label: 'Online' },
]

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
]

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [payments, setPayments] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [collectTarget, setCollectTarget] = useState(null)
  const [collecting, setCollecting] = useState(false)
  const limit = 10

  async function fetchPayments() {
    setLoading(true)
    setError(null)
    try {
      const params = { page, limit }
      if (method) params.method = method
      if (status) params.status = status
      const res = await adminAPI.getPayments(params)
      const data = res.data.data
      setPayments(data.payments || [])
      setTotal(data.total || 0)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [page, method, status])

  async function handleCollect() {
    setCollecting(true)
    try {
      await adminAPI.collectCOD(collectTarget._id)
      toast.success('Cash collection recorded.')
      setCollectTarget(null)
      fetchPayments()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record collection.')
    } finally {
      setCollecting(false)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 mt-1">Review payment transactions.</p>
      </div>

      {/* Method Tabs */}
      <div className="flex gap-2 flex-wrap">
        {METHOD_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setMethod(t.value); setPage(1) }}
            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
              method === t.value
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Status Sub-tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => { setStatus(t.value); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              status === t.value
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner message="Loading payments..." />
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchPayments}>Retry</Button>
        </div>
      ) : payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments found" subtitle="Try adjusting your filters." />
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Booking Ref</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Service</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Method</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-500">Date</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const isCODUnpaid = (p.method === 'cod' || p.paymentMethod === 'cod') &&
                    (p.status === 'unpaid' || p.paymentStatus === 'unpaid')
                  return (
                    <tr key={p._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs text-gray-700">
                        {p.booking?.bookingReference || p.bookingReference || p._id?.slice(-8).toUpperCase()}
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {p.customer?.name || p.booking?.customer?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {p.service?.name || p.booking?.service?.name || '—'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-700">
                        {p.amount != null ? `₹${Number(p.amount).toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge label={p.method || p.paymentMethod} />
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={p.status || p.paymentStatus} />
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-xs">
                        {p.createdAt ? format(parseISO(p.createdAt), 'dd MMM yyyy') : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {isCODUnpaid && (
                          <Button size="sm" variant="outline" onClick={() => setCollectTarget(p)}>
                            Collect
                          </Button>
                        )}
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

      <ConfirmDialog
        isOpen={!!collectTarget}
        onClose={() => setCollectTarget(null)}
        onConfirm={handleCollect}
        title="Record Cash Collection"
        message="Record cash collection for this booking?"
        confirmLabel="Collect"
        confirmVariant="primary"
        loading={collecting}
      />
    </div>
  )
}
