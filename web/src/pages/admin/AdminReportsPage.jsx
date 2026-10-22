import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { DollarSign, CalendarDays, CheckCircle, XCircle, Users, TrendingUp } from 'lucide-react'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import StatsCard from '../../components/ui/StatsCard'
import Button from '../../components/ui/Button'

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reports, setReports] = useState(null)

  async function fetchReports() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminAPI.getReports()
      setReports(res.data.data)
    } catch (err) {
      setError(err.message || 'Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReports() }, [])

  if (loading) return <Spinner message="Loading reports..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={fetchReports}>Retry</Button>
    </div>
  )

  // All KPI fields are at the top level of `reports` (no nested kpis object)
  const kpis = reports || {}
  const monthlyRevenue = reports?.monthlyRevenue || []
  // Backend returns { Car: N, Bike: N, Scooty: N } — convert to array for Recharts
  const rawVehicleType = reports?.bookingsByVehicleType || {}
  const byVehicleType = Object.entries(rawVehicleType).map(([type, count]) => ({ type, count }))
  // Backend key is bookingsByService; items have { serviceName, count, revenue }
  const topServices = (reports?.bookingsByService || []).map(s => ({ ...s, name: s.serviceName }))

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 mt-1">Analytics and business insights.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          icon={DollarSign}
          label="Total Revenue"
          value={kpis.totalRevenue != null ? `₹${Number(kpis.totalRevenue).toLocaleString('en-IN')}` : '—'}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatsCard
          icon={TrendingUp}
          label="This Month"
          value={kpis.thisMonthRevenue != null ? `₹${Number(kpis.thisMonthRevenue).toLocaleString('en-IN')}` : '—'}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatsCard
          icon={CalendarDays}
          label="Total Bookings"
          value={kpis.totalBookings ?? '—'}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatsCard
          icon={CheckCircle}
          label="Completed"
          value={kpis.completedBookings ?? '—'}
          color="text-green-600"
          bg="bg-green-50"
        />
        <StatsCard
          icon={XCircle}
          label="Cancelled"
          value={kpis.cancelledBookings ?? '—'}
          color="text-red-600"
          bg="bg-red-50"
        />
        <StatsCard
          icon={Users}
          label="Total Customers"
          value={kpis.totalCustomers ?? '—'}
          color="text-purple-600"
          bg="bg-purple-50"
        />
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

      {/* Bookings by Vehicle Type */}
      {byVehicleType.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bookings by Vehicle Type</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byVehicleType} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="type" tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip formatter={(value) => [value, 'Bookings']} />
              <Bar dataKey="count" fill="#0B1B2B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Services */}
      {topServices.length > 0 && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Services</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">#</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Service</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Bookings</th>
                  <th className="text-left py-2 px-3 font-semibold text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {[...topServices]
                  .sort((a, b) => (b.count || 0) - (a.count || 0))
                  .map((s, idx) => (
                    <tr key={s._id || idx} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium text-gray-800">{s.name}</td>
                      <td className="py-2 px-3 text-gray-600">{s.count ?? 0}</td>
                      <td className="py-2 px-3 font-semibold text-gray-700">
                        {s.revenue != null ? `₹${Number(s.revenue).toLocaleString('en-IN')}` : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
