import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { partnerAPI } from '../../api/partner'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const SERVICE_CATEGORIES = ['Car', 'Bike', 'Scooty']

export default function PartnerProfilePage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState([])

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
      reset({
        phone: p.phone || '',
        vehicleOwned: p.vehicleOwned || '',
        serviceRadius: p.serviceRadius || 10,
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

  async function onSubmit(data) {
    setSaving(true)
    try {
      const res = await partnerAPI.updateProfile({
        phone: data.phone,
        vehicleOwned: data.vehicleOwned,
        serviceCategories: selectedCategories,
        serviceRadius: parseInt(data.serviceRadius, 10) || 10,
      })
      setProfile(res.data.data.profile)
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
        </div>

        <div className="flex justify-end pt-2">
          <Button type="submit" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </div>
  )
}
