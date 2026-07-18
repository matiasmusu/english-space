'use client'
import Link from 'next/link'
import { ClipboardList, BookOpen, NotebookTabs } from 'lucide-react'
import { useStore } from '@/lib/store'
import StatusBadge from '@/components/StatusBadge'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Buen día'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export default function Home() {
  const { currentUser, activities, materials, notes } = useStore()
  if (!currentUser) return null

  const pending = activities.filter(a => a.status === 'pending')
  const inProgress = activities.filter(a => a.status === 'in_progress')
  const latestMaterials = materials.slice(0, 4)

  return (
    <div className="page">
      <header>
        <div>
          <h1>{greeting()}, {currentUser.name} 👋</h1>
          <p>El espacio compartido de las clases de inglés.</p>
        </div>
      </header>

      <section className="quick-actions">
        <Link href="/activities?nueva=1"><ClipboardList size={22} />Crear una actividad</Link>
        <Link href="/materials?nuevo=1"><BookOpen size={22} />Subir un material</Link>
        <Link href="/notebook?nueva=1"><NotebookTabs size={22} />Agregar al cuaderno</Link>
      </section>

      <section className="stats">
        <article><b>{pending.length}</b><span>Pendientes</span></article>
        <article><b>{inProgress.length}</b><span>En progreso</span></article>
        <article><b>{materials.length}</b><span>Materiales</span></article>
        <article><b>{notes.length}</b><span>Páginas del cuaderno</span></article>
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
            <p>No hay tareas pendientes. 🎉</p>
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

      <article className="panel">
        <h2>Cómo funciona este espacio</h2>
        <p>
          Los dos pueden hacer todo: crear tareas, subir archivos, responder, corregir en rojo
          y dejar notas de clase. Cada cosa que se agrega guarda quién la hizo y cuándo,
          así queda todo ordenado entre clase y clase.
        </p>
      </article>
    </div>
  )
}
