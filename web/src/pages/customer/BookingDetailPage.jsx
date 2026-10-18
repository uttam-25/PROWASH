import { useParams } from 'react-router-dom'

export default function BookingDetailPage() {
  const { id } = useParams()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Booking Detail</h1>
      <p className="text-gray-500 mt-2">Booking ID: {id}</p>
    </div>
  )
}
