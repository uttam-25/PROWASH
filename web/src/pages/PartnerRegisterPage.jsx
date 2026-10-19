import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { partnerAPI } from '../api/partner'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const SERVICE_CATEGORIES = ['Car', 'Bike', 'Scooty']

export default function PartnerRegisterPage() {
  const navigate = useNavigate()
  const { updateUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState([])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm()

  const password = watch('password')

  function toggleCategory(cat) {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    )
  }

  async function onSubmit(data) {
    if (selectedCategories.length === 0) {
      toast.error('Select at least one service category.')
      return
    }
    setLoading(true)
    try {
      const res = await partnerAPI.register({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        serviceCategories: selectedCategories,
      })
      const { token, user } = res.data
      localStorage.setItem('prowash_token', token)
      localStorage.setItem('prowash_user', JSON.stringify(user))
      updateUser(user)
      toast.success('Partner account created!')
      navigate('/partner')
    } catch (err) {
      toast.error(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1B2B] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-2xl font-bold text-[#0B1B2B]">PROWASH</p>
          <h1 className="text-xl font-semibold text-gray-800 mt-1">Partner Registration</h1>
          <p className="text-sm text-gray-500 mt-1">Join as a cleaning partner</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            required
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Email"
            type="email"
            required
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Input
            label="Phone"
            type="tel"
            required
            error={errors.phone?.message}
            {...register('phone', { required: 'Phone is required' })}
          />
          <Input
            label="Password"
            type="password"
            required
            error={errors.password?.message}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 6, message: 'Min 6 characters' },
            })}
          />
          <Input
            label="Confirm Password"
            type="password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: (val) => val === password || 'Passwords do not match',
            })}
          />

          {/* Service Categories */}
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-2">
              Service Categories <span className="text-red-500">*</span>
            </p>
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

          <Button type="submit" className="w-full" loading={loading}>
            Create Partner Account
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have a partner account?{' '}
          <Link to="/partner-login" className="text-[#147DAB] font-medium hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500">
          <Link to="/" className="text-gray-400 hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
