import type { LucideIcon } from 'lucide-react'

export default function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon size={26} /></div>
      <strong>{title}</strong>
      {hint && <p>{hint}</p>}
    </div>
  )
}
