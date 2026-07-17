export default function StatusBadge({status}:{status:string}) {
 const map:Record<string,string>={pending:'Pendiente',in_progress:'En progreso',completed:'Listo',reviewed:'Revisado',changes_requested:'Corregir'}
 return <span className={`badge ${status}`}>{map[status]||status}</span>
}
