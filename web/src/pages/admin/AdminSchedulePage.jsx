import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { Trash2, Clock, CalendarOff } from 'lucide-react'
import { adminAPI } from '../../api/admin'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const SLOT_INTERVALS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
]

export default function AdminSchedulePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [schedule, setSchedule] = useState(null)

  // Working hours
  const [openingTime, setOpeningTime] = useState('08:00')
  const [closingTime, setClosingTime] = useState('20:00')
  const [savingHours, setSavingHours] = useState(false)

  // Working days
  const [workingDays, setWorkingDays] = useState([])
  const [savingDays, setSavingDays] = useState(false)

  // Slot settings
  const [slotInterval, setSlotInterval] = useState(30)
  const [maxConcurrent, setMaxConcurrent] = useState(1)
  const [savingSettings, setSavingSettings] = useState(false)

  // Blocked periods
  const [blockLabel, setBlockLabel] = useState('')
  const [blockStart, setBlockStart] = useState('')
  const [blockEnd, setBlockEnd] = useState('')
  const [addingBlock, setAddingBlock] = useState(false)
  const [removingBlockId, setRemovingBlockId] = useState(null)

  // Holidays
  const [holidayDate, setHolidayDate] = useState('')
  const [holidayLabel, setHolidayLabel] = useState('')
  const [addingHoliday, setAddingHoliday] = useState(false)
  const [removingHolidayId, setRemovingHolidayId] = useState(null)

  async function fetchSchedule() {
    setLoading(true)
    setError(null)
    try {
      const res = await adminAPI.getSchedule()
      const s = res.data.data.schedule || res.data.data
      setSchedule(s)
      if (s.openingTime) setOpeningTime(s.openingTime)
      if (s.closingTime) setClosingTime(s.closingTime)
      if (s.workingDays) setWorkingDays(s.workingDays)
      if (s.slotIntervalMinutes) setSlotInterval(s.slotIntervalMinutes)
      if (s.maxConcurrentBookings) setMaxConcurrent(s.maxConcurrentBookings)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load schedule.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSchedule() }, [])

  async function handleSaveHours() {
    setSavingHours(true)
    try {
      await adminAPI.updateSchedule({ openingTime, closingTime })
      toast.success('Working hours saved.')
      fetchSchedule()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save hours.')
    } finally {
      setSavingHours(false)
    }
  }

  async function handleSaveDays() {
    setSavingDays(true)
    try {
      await adminAPI.updateSchedule({ workingDays })
      toast.success('Working days saved.')
      fetchSchedule()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save days.')
    } finally {
      setSavingDays(false)
    }
  }

  async function handleSaveSettings() {
    setSavingSettings(true)
    try {
      await adminAPI.updateSchedule({ slotIntervalMinutes: slotInterval, maxConcurrentBookings: maxConcurrent })
      toast.success('Slot settings saved.')
      fetchSchedule()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings.')
    } finally {
      setSavingSettings(false)
    }
  }

  async function handleAddBlock() {
    if (!blockLabel || !blockStart || !blockEnd) {
      toast.error('Fill in all block period fields.')
      return
    }
    setAddingBlock(true)
    try {
      await adminAPI.addBlockedPeriod({ label: blockLabel, startAt: blockStart, endAt: blockEnd })
      toast.success('Blocked period added.')
      setBlockLabel('')
      setBlockStart('')
      setBlockEnd('')
      fetchSchedule()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add block.')
    } finally {
      setAddingBlock(false)
    }
  }

  async function handleRemoveBlock(id) {
    setRemovingBlockId(id)
    try {
      await adminAPI.removeBlockedPeriod(id)
      toast.success('Blocked period removed.')
      fetchSchedule()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove block.')
    } finally {
      setRemovingBlockId(null)
    }
  }

  async function handleAddHoliday() {
    if (!holidayDate || !holidayLabel) {
      toast.error('Fill in all holiday fields.')
      return
    }
    setAddingHoliday(true)
    try {
      await adminAPI.addHoliday({ date: holidayDate, label: holidayLabel })
      toast.success('Holiday added.')
      setHolidayDate('')
      setHolidayLabel('')
      fetchSchedule()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add holiday.')
    } finally {
      setAddingHoliday(false)
    }
  }

  async function handleRemoveHoliday(id) {
    setRemovingHolidayId(id)
    try {
      await adminAPI.removeHoliday(id)
      toast.success('Holiday removed.')
      fetchSchedule()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove holiday.')
    } finally {
      setRemovingHolidayId(null)
    }
  }

  function toggleDay(day) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    )
  }

  if (loading) return <Spinner message="Loading schedule..." />
  if (error) return (
    <div className="p-6 text-center">
      <p className="text-red-600 mb-4">{error}</p>
      <Button onClick={fetchSchedule}>Retry</Button>
    </div>
  )

  const blockedPeriods = schedule?.blockedPeriods || []
  const holidays = schedule?.holidays || []

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
        <p className="text-gray-500 mt-1">Manage daily wash schedule and slots.</p>
      </div>

      {/* 1. Working Hours */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Working Hours
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Opening Time</label>
            <input
              type="time"
              className="input"
              value={openingTime}
              onChange={(e) => setOpeningTime(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Closing Time</label>
            <input
              type="time"
              className="input"
              value={closingTime}
              onChange={(e) => setClosingTime(e.target.value)}
            />
          </div>
          <Button loading={savingHours} onClick={handleSaveHours}>Save Hours</Button>
        </div>
      </div>

      {/* 2. Working Days */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Working Days</h2>
        <div className="flex flex-wrap gap-3">
          {DAYS.map((day) => (
            <label key={day} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-primary"
                checked={workingDays.includes(day)}
                onChange={() => toggleDay(day)}
              />
              <span className="text-sm text-gray-700">{day}</span>
            </label>
          ))}
        </div>
        <Button loading={savingDays} onClick={handleSaveDays}>Save Days</Button>
      </div>

      {/* 3. Slot Settings */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Slot Settings</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Slot Interval</label>
            <select
              className="input w-44"
              value={slotInterval}
              onChange={(e) => setSlotInterval(Number(e.target.value))}
            >
              {SLOT_INTERVALS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Max Concurrent Bookings</label>
            <input
              type="number"
              min="1"
              className="input w-28"
              value={maxConcurrent}
              onChange={(e) => setMaxConcurrent(Number(e.target.value))}
            />
          </div>
          <Button loading={savingSettings} onClick={handleSaveSettings}>Save Settings</Button>
        </div>
      </div>

      {/* 4. Blocked Periods */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-500" /> Blocked Periods
        </h2>
        {blockedPeriods.length === 0 ? (
          <p className="text-gray-400 text-sm">No blocked periods.</p>
        ) : (
          <ul className="space-y-2">
            {blockedPeriods.map((b) => (
              <li key={b._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium text-gray-800">{b.label}</p>
                  <p className="text-xs text-gray-500">
                    {b.startAt ? format(parseISO(b.startAt), 'dd MMM yyyy, hh:mm a') : '—'} →{' '}
                    {b.endAt ? format(parseISO(b.endAt), 'dd MMM yyyy, hh:mm a') : '—'}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveBlock(b._id)}
                  disabled={removingBlockId === b._id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add Block Form */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Add Block Period</h3>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">Label</label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Maintenance"
              value={blockLabel}
              onChange={(e) => setBlockLabel(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Start</label>
              <input
                type="datetime-local"
                className="input w-full"
                value={blockStart}
                onChange={(e) => setBlockStart(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">End</label>
              <input
                type="datetime-local"
                className="input w-full"
                value={blockEnd}
                onChange={(e) => setBlockEnd(e.target.value)}
              />
            </div>
          </div>
          <Button loading={addingBlock} onClick={handleAddBlock}>Add Block</Button>
        </div>
      </div>

      {/* 5. Holidays */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-red-500" /> Holidays
        </h2>
        {holidays.length === 0 ? (
          <p className="text-gray-400 text-sm">No holidays set.</p>
        ) : (
          <ul className="space-y-2">
            {holidays.map((h) => (
              <li key={h._id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium text-gray-800">{h.label}</p>
                  <p className="text-xs text-gray-500">
                    {h.date ? format(parseISO(h.date), 'dd MMM yyyy') : '—'}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveHoliday(h._id)}
                  disabled={removingHolidayId === h._id}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Add Holiday Form */}
        <div className="border-t border-gray-100 pt-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Add Holiday</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                className="input w-full"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Label</label>
              <input
                type="text"
                className="input w-full"
                placeholder="e.g. Diwali"
                value={holidayLabel}
                onChange={(e) => setHolidayLabel(e.target.value)}
              />
            </div>
          </div>
          <Button loading={addingHoliday} onClick={handleAddHoliday}>Add Holiday</Button>
        </div>
      </div>
    </div>
  )
}
