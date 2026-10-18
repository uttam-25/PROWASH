import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(data) {
    setError('')
    try {
      const user = await login(data)
      if (user.role === 'owner') {
        navigate('/admin')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Invalid credentials. Please try again.'
      setError(msg)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8 mt-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-wider text-[#0B1B2B]">PROWASH</h1>
          <p className="text-gray-500 text-sm mt-1">Premium Vehicle Cleaning &amp; Care</p>
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-6">Sign in to your account</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <Input
            label="Email or Phone"
            type="text"
            placeholder="you@example.com or 9876543210"
            required
            error={errors.email?.message}
            {...register('email', { required: 'Email or phone is required' })}
          />

          <div>
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              required
              error={errors.password?.message}
              {...register('password', { required: 'Password is required' })}
            />
            <div className="mt-1 text-right">
              <Link to="/forgot-password" className="text-xs text-[#147DAB] hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
            Sign In
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-[#147DAB] font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
