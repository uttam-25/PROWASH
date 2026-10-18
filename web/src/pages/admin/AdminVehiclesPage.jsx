import { useState, useEffect, useRef } from 'react'
import { Search, Car } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'

const TYPE_TABS = ['All', 'Car', 'Bike', 'Scooty']

export default function AdminVehiclesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [activeType, setActiveType] = useState('All')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const debounceRef = useRef(null)

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300)
  }

  async function fetchVehicles() {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (activeType !== 'All') params.type = activeType
      if (debouncedSearch) params.search = debouncedSearch
      const res = await adminAPI.getVehicles(params)
      setVehicles(res.data.data.vehicles || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vehicles.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVehicles() }, [activeType, debouncedSearch])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vehicles</h1>
        <p className="text-gray-500 mt-1">All registered vehicles.</p>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TYPE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
              activeType === t
                ? 'border-primary bg-primary text-white'
                : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search reg number, owner..."
          value={search}
          onChange={handleSearchChange}
          className="input pl-9 w-full"
        />
      </div>

      {loading ? (
        <Spinner message="Loading vehicles..." />
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchVehicles}>Retry</Button>
        </div>
      ) : vehicles.length === 0 ? (
        <EmptyState icon={Car} title="No vehicles found" subtitle="Try a different filter or search." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Reg Number</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Make / Model</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Color</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Owner</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Owner Email</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-500">Registered</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-gray-800">{v.registrationNumber}</td>
                  <td className="py-3 px-4 text-gray-600">{v.make} {v.model}</td>
                  <td className="py-3 px-4">
                    <Badge label={v.vehicleType} />
                  </td>
                  <td className="py-3 px-4">
                    {v.color ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border border-gray-200 flex-shrink-0"
                          style={{ background: v.color.toLowerCase() }}
                        />
                        <span className="text-gray-600">{v.color}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{v.owner?.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">{v.owner?.email || '—'}</td>
                  <td className="py-3 px-4 text-gray-500 text-xs">
                    {v.createdAt ? format(parseISO(v.createdAt), 'dd MMM yyyy') : '—'}
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
