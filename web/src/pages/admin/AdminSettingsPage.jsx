import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { authAPI } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function AdminSettingsPage() {
  const { user, updateUser } = useAuth()

  // Profile form
  const {
    register: regProfile,
    handleSubmit: submitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm({ defaultValues: { name: '', phone: '' } })

  // Password form
  const {
    register: regPwd,
    handleSubmit: submitPwd,
    reset: resetPwd,
    watch: watchPwd,
    formState: { errors: pwdErrors, isSubmitting: pwdSubmitting },
  } = useForm({ defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } })

  useEffect(() => {
    if (user) {
      resetProfile({ name: user.name || '', phone: user.phone || '' })
    }
  }, [user])

  async function handleProfileSave(data) {
    try {
      const res = await authAPI.updateProfile(data)
      updateUser(res.data.data.user)
      toast.success('Profile updated.')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    }
  }

  async function handleChangePassword(data) {
    try {
      await authAPI.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      toast.success('Password changed.')
      resetPwd()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account and preferences.</p>
      </div>

      {/* Admin Profile Card */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-lg">Admin Profile</h2>
        <div className="flex flex-col sm:flex-row gap-4 text-sm text-gray-500">
          <p><span className="font-medium text-gray-700">Name:</span> {user?.name || '—'}</p>
          <p><span className="font-medium text-gray-700">Email:</span> {user?.email || '—'}</p>
          {user?.phone && <p><span className="font-medium text-gray-700">Phone:</span> {user.phone}</p>}
        </div>
        <form onSubmit={submitProfile(handleProfileSave)} className="space-y-4">
          <Input
            label="Name"
            required
            error={profileErrors.name?.message}
            {...regProfile('name', { required: 'Name is required' })}
          />
          <Input
            label="Phone"
            type="tel"
            error={profileErrors.phone?.message}
            {...regProfile('phone')}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={profileSubmitting}>Save Profile</Button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="card p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 text-lg">Change Password</h2>
        <form onSubmit={submitPwd(handleChangePassword)} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            required
            error={pwdErrors.currentPassword?.message}
            {...regPwd('currentPassword', { required: 'Current password is required' })}
          />
          <Input
            label="New Password"
            type="password"
            required
            error={pwdErrors.newPassword?.message}
            {...regPwd('newPassword', {
              required: 'New password is required',
              minLength: { value: 6, message: 'Minimum 6 characters' },
            })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            required
            error={pwdErrors.confirmPassword?.message}
            {...regPwd('confirmPassword', {
              required: 'Please confirm your password',
              validate: (val) => val === watchPwd('newPassword') || 'Passwords do not match',
            })}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={pwdSubmitting}>Change Password</Button>
          </div>
        </form>
      </div>

      {/* App Info Card */}
      <div className="card p-6 space-y-3">
        <h2 className="font-semibold text-gray-800 text-lg">App Info</h2>
        <div className="text-sm space-y-2 text-gray-600">
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Version</span>
            <span>1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium text-gray-700">Environment</span>
            <span>Production</span>
          </div>
        </div>
      </div>
    </div>
  )
}
