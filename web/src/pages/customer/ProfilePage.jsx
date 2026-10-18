import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { authAPI } from '../../api/auth'
import { useAuth } from '../../hooks/useAuth'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [changePwOpen, setChangePwOpen] = useState(false)

  // Profile form
  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      phone: user?.phone || '',
    },
  })

  // Password form
  const {
    register: regPw,
    handleSubmit: handlePwSubmit,
    watch: watchPw,
    reset: resetPw,
    formState: { errors: pwErrors, isSubmitting: pwSubmitting },
  } = useForm()

  async function onProfileSave(data) {
    try {
      const res = await authAPI.updateProfile(data)
      updateUser(res.data.data.user)
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile.')
    }
  }

  async function onChangePassword(data) {
    try {
      await authAPI.changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      toast.success('Password changed successfully!')
      resetPw()
      setChangePwOpen(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password.')
    }
  }

  const newPassword = watchPw('newPassword')

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 mt-1">Manage your account details.</p>
      </div>

      {/* Profile Card */}
      <div className="card p-6 flex items-center gap-6">
        <Avatar name={user?.name || ''} size="xl" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
          <p className="text-gray-500">{user?.email}</p>
          {user?.phone && <p className="text-gray-500 text-sm">{user.phone}</p>}
          <div className="flex items-center gap-2 mt-2">
            <Badge label={user?.role} />
            {user?.createdAt && (
              <span className="text-xs text-gray-400">
                Joined {format(parseISO(user.createdAt), 'MMMM yyyy')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Profile */}
      <div className="card p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Edit Profile</h3>
        <form onSubmit={handleProfileSubmit(onProfileSave)} className="space-y-4">
          <Input
            label="Full Name"
            required
            error={profileErrors.name?.message}
            {...regProfile('name', { required: 'Name is required' })}
          />
          <Input
            label="Phone"
            type="tel"
            placeholder="+91 XXXXX XXXXX"
            error={profileErrors.phone?.message}
            {...regProfile('phone')}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={profileSubmitting}>Save Changes</Button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="card p-6">
        <button
          type="button"
          onClick={() => setChangePwOpen(v => !v)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="font-semibold text-gray-800">Change Password</h3>
          {changePwOpen ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {changePwOpen && (
          <form onSubmit={handlePwSubmit(onChangePassword)} className="mt-5 space-y-4">
            <Input
              label="Current Password"
              type="password"
              required
              error={pwErrors.currentPassword?.message}
              {...regPw('currentPassword', { required: 'Current password is required' })}
            />
            <Input
              label="New Password"
              type="password"
              required
              error={pwErrors.newPassword?.message}
              {...regPw('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <Input
              label="Confirm New Password"
              type="password"
              required
              error={pwErrors.confirmPassword?.message}
              {...regPw('confirmPassword', {
                required: 'Please confirm your new password',
                validate: value => value === newPassword || 'Passwords do not match',
              })}
            />
            <div className="flex justify-end">
              <Button type="submit" loading={pwSubmitting}>Update Password</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
