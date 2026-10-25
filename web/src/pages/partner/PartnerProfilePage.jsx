import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { partnerAPI } from '../../api/partner'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { servicesAPI } from '../../api/services'

const SERVICE_CATEGORIES = ['Car', 'Bike', 'Scooty', 'SUV', 'Truck', 'Van']

export default function PartnerProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState([])
  const [selectedServices, setSelectedServices] = useState([])
  const [services, setServices] = useState([])

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  async function loadProfile() {
    try {
      const res = await partnerAPI.getProfile()
      const p = res.data.data.profile
      setProfile(p)
      setSelectedCategories(p.serviceCategories || [])
      setSelectedServices((p.supportedServiceIds || []).map((service) =>
        typeof service === 'string' ? service : service._id
      ))
      const serviceRes = await servicesAPI.getServices()
      setServices(serviceRes.data.data?.services || serviceRes.data.data || [])
      const coordinates = p.currentLocation?.coordinates || []
      const hasSavedLocation = Boolean(p.locationUpdatedAt || coordinates.some((value) => value !== 0))
      reset({
        phone: p.phone || '',
        vehicleOwned: p.vehicleOwned || '',
        serviceRadius: p.serviceRadius || 10,
        serviceAddress: p.serviceAddress || '',
        longitude: hasSavedLocation ? coordinates[0] : '',
        latitude: hasSavedLocation ? coordinates[1] : '',
      })
    } catch (err) {
      toast.error(err.message || 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  function toggleCategory(cat) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  function toggleService(serviceId) {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    )
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      const hasAnyLocation = data.serviceAddress || data.latitude !== '' || data.longitude !== ''
      if (hasAnyLocation) {
        const lat = Number(data.latitude)
        const lng = Number(data.longitude)
        if (!data.serviceAddress?.trim() || data.latitude === '' || data.longitude === '' ||
            !Number.isFinite(lat) || lat < -90 || lat > 90 ||
            !Number.isFinite(lng) || lng < -180 || lng > 180) {
          toast.error('Enter a service address and valid latitude/longitude.')
          return
        }
      }
      const res = await partnerAPI.updateProfile({
        phone: data.phone,
        vehicleOwned: data.vehicleOwned,
        serviceCategories: selectedCategories,
        supportedServiceIds: selectedServices,
        serviceAddress: data.serviceAddress?.trim() || '',
        serviceRadius: parseInt(data.serviceRadius, 10) || 10,
      })
      let updatedProfile = res.data.data.profile
      if (data.serviceAddress && data.latitude !== '' && data.longitude !== '') {
        const locationRes = await partnerAPI.updateLocation({
          serviceAddress: data.serviceAddress.trim(),
          lat: Number(data.latitude),
          lng: Number(data.longitude),
        })
        updatedProfile = locationRes.data.data.profile
      }
      setProfile(updatedProfile)
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { loadProfile() }, [])

  if (loading) return <Spinner message="Loading profile..." />

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Update your partner details and preferences.</p>
      </div>

      {/* Verification badge */}
      {profile && (
        <div className={`card p-4 flex items-center gap-3 ${profile.isVerified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className={`w-2.5 h-2.5 rounded-full ${profile.isVerified ? 'bg-green-500' : 'bg-yellow-400'}`} />
          <p className="text-sm font-medium text-gray-700">
            {profile.isVerified ? 'Account Verified' : 'Pending Verification — an admin will review your account.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <Input
          label="Phone"
          type="tel"
          required
          error={errors.phone?.message}
          {...register('phone', { required: 'Phone is required' })}
        />
        <Input
          label="Vehicle Owned (optional)"
          placeholder="e.g. Honda Activa"
          {...register('vehicleOwned')}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (km)</label>
          <input
            type="number"
            min="1"
            max="50"
            className="input w-32"
            {...register('serviceRadius')}
          />
        </div>

        {/* Service Categories */}
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Service Categories</p>
          <div className="flex gap-3 flex-wrap">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  selectedCategories.includes(cat)
                    ? 'border-[#147DAB] bg-[#147DAB] text-white'
                    : 'border-gray-300 text-gray-600 hover:border-[#147DAB]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-1">Leave all unchecked to support every vehicle type.</p>
        </div>

        <div>
          <p className="block text-sm font-medium text-gray-700 mb-2">Supported Washing Services</p>
          <div className="space-y-2">
            {services.map((service) => (
              <label key={service._id} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedServices.includes(service._id)}
                  onChange={() => toggleService(service._id)}
                />
                {service.name}
              </label>
            ))}
            {services.length === 0 && <p className="text-sm text-gray-500">No active services available.</p>}
          </div>
          <p className="text-xs text-gray-500 mt-1">Leave all unchecked to support every active service.</p>
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">Service Location</p>
          <Input label="Service address" placeholder="Area you serve from" {...register('serviceAddress')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Latitude" type="number" step="any" {...register('latitude')} />
            <Input label="Longitude" type="number" step="any" {...register('longitude')} />
          </div>
          <p className="text-xs text-gray-500">Set your location before going online to receive nearby bookings within 2 km.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
