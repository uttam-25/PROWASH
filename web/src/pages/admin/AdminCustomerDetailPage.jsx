import { useParams } from 'react-router-dom'

export default function AdminCustomerDetailPage() {
  const { id } = useParams()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Customer Detail</h1>
      <p className="text-gray-500 mt-2">Customer ID: {id}</p>
    </div>
  )
}
