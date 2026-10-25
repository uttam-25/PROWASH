const COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  searching_partner: 'bg-yellow-100 text-yellow-800',
  pending_verification: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  partner_assigned: 'bg-blue-100 text-blue-800',
  partner_accepted: 'bg-indigo-100 text-indigo-800',
  partner_on_way: 'bg-indigo-100 text-indigo-800',
  partner_arrived: 'bg-purple-100 text-purple-800',
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
  upi: 'bg-indigo-100 text-indigo-700',
  Car: 'bg-blue-100 text-blue-700',
  Bike: 'bg-green-100 text-green-700',
  Scooty: 'bg-purple-100 text-purple-700',
  All: 'bg-gray-100 text-gray-700',
}

const STATUS_LABELS = {
  pending: 'Pending Partner Assignment',
  searching_partner: 'Pending Partner Assignment',
  partner_assigned: 'Partner Assigned',
  partner_accepted: 'Partner Accepted',
  partner_on_way: 'Partner on the Way',
  partner_arrived: 'Partner Arrived',
  in_progress: 'Wash In Progress',
  completed: 'Wash Completed',
  cancelled: 'Booking Cancelled',
}

export default function Badge({ label, status, className = '' }) {
  const text = label || STATUS_LABELS[status] || status || ''
  const color = COLORS[status] || COLORS[text] || 'bg-gray-100 text-gray-700'
  return <span className={`badge ${color} ${className}`}>{text}</span>
}
