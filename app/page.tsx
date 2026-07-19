'use client'
import Link from 'next/link'
import { ClipboardList, BookOpen, Languages, Clock, TrendingUp, Library } from 'lucide-react'
import { useStore } from '@/lib/store'
import StatusBadge from '@/components/StatusBadge'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buen día'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

function todayLabel() {
  const s = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default function Home() {
  const { currentUser, activities, materials, vocabulary } = useStore()
  if (!currentUser) return null

  const pending = activities.filter(a => a.status === 'pending')
  const inProgress = activities.filter(a => a.status === 'in_progress')
  const latestMaterials = materials.slice(0, 4)

  return (
    <div className="page">
      <section className="hero">
        <div>
          <h1>{greeting()}, {currentUser.name}</h1>
          <p>{todayLabel()}</p>
        </div>
      </section>

      <section className="quick-actions">
        <Link href="/activities?nueva=1"><span className="qa-icon"><ClipboardList size={21} /></span>Crear una actividad</Link>
        <Link href="/materials?nuevo=1"><span className="qa-icon"><BookOpen size={21} /></span>Subir un material</Link>
        <Link href="/vocabulary?nueva=1"><span className="qa-icon"><Languages size={21} /></span>Agregar vocabulario</Link>
      </section>

      <section className="stats">
        <article>
          <span className="stat-icon amber"><Clock size={19} /></span>
          <div><b>{pending.length}</b><span>Pendientes</span></div>
        </article>
        <article>
          <span className="stat-icon blue"><TrendingUp size={19} /></span>
          <div><b>{inProgress.length}</b><span>En progreso</span></div>
        </article>
        <article>
          <span className="stat-icon blue"><Library size={19} /></span>
          <div><b>{materials.length}</b><span>Materiales</span></div>
        </article>
        <article>
          <span className="stat-icon green"><Languages size={19} /></span>
          <div><b>{vocabulary.length}</b><span>Palabras de vocabulario</span></div>
        </article>
      </section>

      <section className="columns">
        <article className="panel">
          <h2>Para hacer</h2>
          {[...pending, ...inProgress].slice(0, 5).map(a => (
            <Link className="row" key={a.id} href={`/activities/${a.id}`}>
              <span>{a.title}</span>
              <StatusBadge status={a.status} />
            </Link>
          ))}
          {!pending.length && !inProgress.length && (
            <p>No hay tareas pendientes.</p>
          )}
        </article>
        <article className="panel">
          <h2>Últimos materiales</h2>
          {latestMaterials.map(m => (
            <Link className="row" key={m.id} href="/materials">
              <span>{m.title}</span>
              <small>{m.type}</small>
            </Link>
          ))}
          {!latestMaterials.length && <p>Todavía no hay materiales cargados.</p>}
        </article>
      </section>
    </div>
  )
}
