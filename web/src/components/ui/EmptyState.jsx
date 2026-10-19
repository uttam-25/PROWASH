export default function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {Icon && <div className="w-16 h-16 bg-surface-alt rounded-full flex items-center justify-center"><Icon className="w-8 h-8 text-gray-400" /></div>}
      <h3 className="font-semibold text-gray-700">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 max-w-xs">{subtitle}</p>}
      {action}
    </div>
  )
}
