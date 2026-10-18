import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { notificationsAPI } from '../../api/notifications'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [markingAll, setMarkingAll] = useState(false)

  async function fetchNotifications() {
    setLoading(true)
    setError(null)
    try {
      const res = await notificationsAPI.getAll()
      setNotifications(res.data.data.notifications || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotifications() }, [])

  async function handleMarkAllRead() {
    setMarkingAll(true)
    try {
      await notificationsAPI.markAllRead()
      toast.success('All notifications marked as read.')
      fetchNotifications()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark all as read.')
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleMarkRead(n) {
    if (n.read) return
    try {
      await notificationsAPI.markRead(n._id)
      setNotifications(prev =>
        prev.map(item => item._id === n._id ? { ...item, read: true } : item)
      )
    } catch {
      // silently fail — optimistic update on local state handled above
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && (
            <p className="text-gray-500 mt-1">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" loading={markingAll} onClick={handleMarkAllRead}>
            Mark All Read
          </Button>
        )}
      </div>

      {loading ? (
        <Spinner message="Loading notifications..." />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchNotifications}>Retry</Button>
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" subtitle="You're all caught up!" />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n._id}
              onClick={() => handleMarkRead(n)}
              className={`flex items-start gap-4 bg-white p-4 rounded-xl border-l-4 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                n.read ? 'border-transparent' : 'border-primary'
              }`}
            >
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${n.read ? 'bg-gray-100' : 'bg-blue-50'}`}>
                <Bell className={`w-5 h-5 ${n.read ? 'text-gray-400' : 'text-primary'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${n.read ? 'font-normal text-gray-700' : 'font-semibold text-gray-900'}`}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {n.createdAt
                    ? formatDistanceToNow(parseISO(n.createdAt), { addSuffix: true })
                    : ''}
                </p>
              </div>
              {!n.read && (
                <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
