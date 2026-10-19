const COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rejected: 'bg-gray-100 text-gray-800',
  rescheduled: 'bg-purple-100 text-purple-800',
  paid: 'bg-green-100 text-green-800',
  unpaid: 'bg-red-100 text-red-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  cod: 'bg-gray-100 text-gray-700',
  online: 'bg-blue-100 text-blue-700',
  Car: 'bg-blue-100 text-blue-700',
  Bike: 'bg-green-100 text-green-700',
  Scooty: 'bg-purple-100 text-purple-700',
  All: 'bg-gray-100 text-gray-700',
}

export default function Badge({ label, status, className = '' }) {
  const text = label || status || ''
  const color = COLORS[text] || 'bg-gray-100 text-gray-700'
  return <span className={`badge ${color} ${className}`}>{text.replace('_', ' ')}</span>
}
