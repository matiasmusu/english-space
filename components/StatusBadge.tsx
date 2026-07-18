const labels: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  completed: 'Lista',
  reviewed: 'Revisada',
  changes_requested: 'Para corregir'
}

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${status}`}>{labels[status] || status}</span>
}
