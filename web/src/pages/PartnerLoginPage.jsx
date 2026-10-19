import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function PartnerLoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [roleError, setRoleError] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  async function onSubmit(data) {
    setLoading(true)
    setRoleError(null)
    try {
      const user = await login(data)
      if (user.role !== 'partner') {
        setRoleError('This account is not a partner account. Please use the customer login.')
        return
      }
      toast.success(`Welcome back, ${user.name}!`)
      navigate('/partner')
    } catch (err) {
      toast.error(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1B2B] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-2xl font-bold text-[#0B1B2B]">PROWASH</p>
          <h1 className="text-xl font-semibold text-gray-800 mt-1">Partner Login</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your partner account</p>
        </div>

        {roleError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {roleError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            required
            error={errors.email?.message}
            {...register('email', { required: 'Email is required' })}
          />
          <Input
            label="Password"
            type="password"
            required
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          <Button type="submit" className="w-full" loading={loading}>
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Don't have a partner account?{' '}
          <Link to="/partner-register" className="text-[#147DAB] font-medium hover:underline">
            Register here
          </Link>
        </p>
        <p className="text-center text-sm text-gray-500">
          <Link to="/login" className="text-gray-400 hover:underline">
            Customer login →
          </Link>
        </p>
      </div>
    </div>
  )
}
