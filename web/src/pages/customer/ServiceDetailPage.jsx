import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Clock, Tag } from 'lucide-react'
import { servicesAPI } from '../../api/services'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

export default function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [service, setService] = useState(null)

  async function fetchService() {
    setLoading(true)
    setError(null)
    try {
      const res = await servicesAPI.getService(id)
      setService(res.data.data.service)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load service details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchService() }, [id])

  if (loading) return <Spinner message="Loading service..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={fetchService}>Retry</Button>
    </div>
  )
  if (!service) return null

  return (
    <div className="p-6 max-w-2xl">
      <Link to="/dashboard/services" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" />
        Back to Services
      </Link>

      <div className="card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{service.name}</h1>
          <Badge label={service.vehicleType} />
        </div>

        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <Badge label={service.category} />
        </div>

        {service.description && (
          <p className="text-gray-600 leading-relaxed">{service.description}</p>
        )}

        <div className="flex items-center gap-6 py-4 border-y">
          <div>
            <p className="text-sm text-gray-500">Price</p>
            <p className="text-3xl font-bold text-primary">
              ₹{service.price?.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Duration</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="font-semibold text-gray-800">{service.durationMinutes} min</p>
            </div>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={() => navigate(`/dashboard/book?serviceId=${service._id}`)}
        >
          Book This Service
        </Button>
      </div>
    </div>
  )
}
