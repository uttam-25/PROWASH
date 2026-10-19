import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layers } from 'lucide-react'
import { servicesAPI } from '../../api/services'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

const VEHICLE_TYPES = ['All', 'Car', 'Bike', 'Scooty']

export default function ServicesPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [services, setServices] = useState([])
  const [vehicleType, setVehicleType] = useState('All')
  const [activeCategory, setActiveCategory] = useState('All')

  async function fetchServices(type) {
    setLoading(true)
    setError(null)
    try {
      const params = type && type !== 'All' ? { vehicleType: type } : {}
      const res = await servicesAPI.getServices(params)
      setServices(res.data.data.services || [])
      setActiveCategory('All')
    } catch (err) {
      setError(err.message || 'Failed to load services.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchServices(vehicleType) }, [vehicleType])

  const categories = ['All', ...new Set(services.map(s => s.category).filter(Boolean))]

  const filtered = activeCategory === 'All'
    ? services
    : services.filter(s => s.category === activeCategory)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <p className="text-gray-500 mt-1">Browse and book our wash packages.</p>
      </div>

      {/* Vehicle Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {VEHICLE_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setVehicleType(type)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              vehicleType === type
                ? 'bg-primary text-white border-primary'
                : 'bg-white text-gray-600 border-gray-300 hover:border-primary hover:text-primary'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Category Filter Pills */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              activeCategory === cat
                ? 'bg-[#0B1B2B] text-white border-[#0B1B2B]'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <Spinner message="Loading services..." />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => fetchServices(vehicleType)}>Retry</Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No services found"
          subtitle="Try selecting a different vehicle type or category."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(s => (
            <div key={s._id} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold text-gray-800">{s.name}</p>
                <Badge label={s.vehicleType} />
              </div>
              <p className="text-sm text-gray-500">{s.category}</p>
              <div className="flex items-end justify-between mt-auto pt-2">
                <div>
                  <p className="text-2xl font-bold text-primary">
                    ₹{s.price?.toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-400">{s.durationMinutes} min</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => navigate(`/dashboard/book?serviceId=${s._id}`)}
                >
                  Book This Service
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
