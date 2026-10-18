import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { authAPI } from '../api/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  const newPassword = watch('newPassword')

  async function onSubmit(data) {
    setError('')
    try {
      await authAPI.resetPassword(token, data.newPassword)
      toast.success('Password reset successfully! Please sign in.')
      navigate('/login')
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to reset password. The link may have expired.'
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

        <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>
        <p className="text-gray-500 text-sm mb-6">Enter your new password below.</p>

        {!token ? (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-800 mb-6">
            Invalid or missing reset token. Please request a new password reset link.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              required
              error={errors.newPassword?.message}
              {...register('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              })}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              required
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Please confirm your new password',
                validate: value => value === newPassword || 'Passwords do not match',
              })}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Reset Password
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500 mt-6">
          <Link to="/login" className="text-[#147DAB] font-medium hover:underline">
            ← Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
