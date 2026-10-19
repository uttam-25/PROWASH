export default function StatsCard({ icon: Icon, label, value, color = 'text-primary', bg = 'bg-blue-50' }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
      </div>
    </div>
  )
}
