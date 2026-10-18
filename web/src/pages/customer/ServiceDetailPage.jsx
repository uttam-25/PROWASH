import { useParams } from 'react-router-dom'

export default function ServiceDetailPage() {
  const { id } = useParams()
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900">Service Detail</h1>
      <p className="text-gray-500 mt-2">Service ID: {id}</p>
    </div>
  )
}
