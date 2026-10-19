const COLORS = ['bg-primary', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500']
export default function Avatar({ name = '', size = 'md' }) {
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const color = COLORS[name.charCodeAt(0) % COLORS.length]
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-xl' }
  return <div className={`${sizes[size] || sizes.md} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>{initials || '?'}</div>
}
