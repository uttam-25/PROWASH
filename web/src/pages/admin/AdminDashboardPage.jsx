import { useState, useEffect } from 'react'
import {
  Users, CalendarDays, Clock, AlertCircle,
  CheckCircle, Loader, Star, DollarSign,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import StatsCard from '../../components/ui/StatsCard'
import Badge from '../../components/ui/Badge'

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-purple-100 text-purple-800',
}

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [reports, setReports] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [dashRes, repRes] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getReports(),
      ])
      setDashboard(dashRes.data.data)
      setReports(repRes.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <Spinner message="Loading dashboard..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <button className="btn btn-primary" onClick={fetchData}>Retry</button>
    </div>
  )

  const stats = dashboard?.stats || {}
  const recentBookings = dashboard?.recentBookings || []
  const monthlyRevenue = reports?.monthlyRevenue || []

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of PROWASH operations.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Users} label="Total Customers" value={stats.totalCustomers ?? '—'} color="text-blue-600" bg="bg-blue-50" />
        <StatsCard icon={CalendarDays} label="Total Bookings" value={stats.totalBookings ?? '—'} color="text-indigo-600" bg="bg-indigo-50" />
        <StatsCard icon={Clock} label="Today Bookings" value={stats.todayBookings ?? '—'} color="text-orange-600" bg="bg-orange-50" />
        <StatsCard icon={AlertCircle} label="Pending" value={stats.pendingBookings ?? '—'} color="text-yellow-600" bg="bg-yellow-50" />
        <StatsCard icon={CheckCircle} label="Confirmed" value={stats.confirmedBookings ?? '—'} color="text-green-600" bg="bg-green-50" />
        <StatsCard icon={Loader} label="In Progress" value={stats.inProgressBookings ?? '—'} color="text-blue-600" bg="bg-blue-50" />
        <StatsCard icon={Star} label="Completed Today" value={stats.completedToday ?? '—'} color="text-green-600" bg="bg-green-50" />
        <StatsCard
          icon={DollarSign}
          label="Total Revenue"
          value={stats.totalRevenue != null ? `₹${Number(stats.totalRevenue).toLocaleString('en-IN')}` : '—'}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
      </div>

      {/* Recent Bookings */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Bookings</h2>
        {recentBookings.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No recent bookings.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Reference</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Customer</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Vehicle</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Service</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Date</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Status</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Payment</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-3 font-mono text-xs text-gray-700">
                      {b.bookingReference || b._id?.slice(-8).toUpperCase()}
                    </td>
                    <td className="py-3 px-3 text-gray-800">{b.customer?.name || '—'}</td>
                    <td className="py-3 px-3 text-gray-600">{b.vehicle?.registrationNumber || '—'}</td>
                    <td className="py-3 px-3 text-gray-600">{b.service?.name || '—'}</td>
                    <td className="py-3 px-3 text-gray-500">
                      {b.startAt ? format(parseISO(b.startAt), 'dd MMM, hh:mm a') : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <Badge status={b.status} />
                    </td>
                    <td className="py-3 px-3">
                      <Badge status={b.paymentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Monthly Revenue Chart */}
      {monthlyRevenue.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Monthly Revenue (Last 6 Months)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyRevenue} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis
                tick={{ fontSize: 12, fill: '#6b7280' }}
                tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`}
              />
              <Tooltip
                formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#147DAB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
