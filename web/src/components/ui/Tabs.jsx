export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 bg-surface-alt p-1 rounded-lg">
      {tabs.map(tab => (
        <button key={tab.value} onClick={() => onChange(tab.value)}
          className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all ${active === tab.value ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
          {tab.label}{tab.count !== undefined && <span className="ml-1.5 text-xs">({tab.count})</span>}
        </button>
      ))}
    </div>
  )
}
