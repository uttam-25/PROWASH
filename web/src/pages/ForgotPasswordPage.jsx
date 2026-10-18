import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { authAPI } from '../api/auth'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(data) {
    setError('')
    try {
      await authAPI.forgotPassword(data.email)
      setSubmitted(true)
    } catch (err) {
      // Always show the generic success message to avoid email enumeration
      setSubmitted(true)
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

        <h2 className="text-xl font-bold text-gray-900 mb-2">Forgot Password</h2>
        <p className="text-gray-500 text-sm mb-6">
          Enter your registered email address and we&apos;ll send you a reset link.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 text-sm text-green-800 mb-6">
            If your email is registered, you will receive a reset link shortly.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              required
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'Please enter a valid email address',
                },
              })}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Send Reset Link
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
