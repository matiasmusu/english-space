'use client'

import Link from 'next/link'
import { useStore } from '@/lib/store'
import type { EntryKind } from '@/lib/types'

const kindLabels: Record<EntryKind, string> = {
  answer: 'Respuesta',
  correction: 'Corrección',
  comment: 'Comentario',
  class_note: 'Nota de clase'
}

type Event = {
  id: string
  when: string
  author: string
  label: string
  cssKind: string
  text: string
  href?: string
  isCorrection?: boolean
}

export default function History() {
  const { contributions, activities, materials, notes } = useStore()

  const events: Event[] = [
    ...contributions.map(c => ({
      id: `c-${c.id}`,
      when: c.createdAt,
      author: c.author.name,
      label: kindLabels[c.kind],
      cssKind: c.kind,
      text: c.body,
      href: `/activities/${c.activityId}`,
      isCorrection: c.kind === 'correction'
    })),
    ...activities.map(a => ({
      id: `a-${a.id}`,
      when: a.createdAt,
      author: a.createdBy.name,
      label: 'Actividad creada',
      cssKind: 'answer',
      text: a.title,
      href: `/activities/${a.id}`
    })),
    ...materials.map(m => ({
      id: `m-${m.id}`,
      when: m.createdAt,
      author: m.createdBy.name,
      label: 'Material agregado',
      cssKind: 'comment',
      text: m.title,
      href: '/materials'
    })),
    ...notes.map(n => ({
      id: `n-${n.id}`,
      when: n.createdAt,
      author: n.createdBy.name,
      label: 'Entrada de cuaderno',
      cssKind: 'class_note',
      text: n.title,
      href: '/notebook'
    }))
  ].sort((a, b) => b.when.localeCompare(a.when))

  return (
    <div className="page">
      <header>
        <div>
          <h1>Historial</h1>
          <p>Todo lo que fueron agregando los dos, con autor, fecha y hora.</p>
        </div>
      </header>
      <section className="timeline">
        {events.map(e => (
          <article className={`timeline-entry ${e.cssKind}`} key={e.id}>
            <div className="entry-head">
              <span className="entry-kind">{e.label}</span>
              <span>{e.author} · {new Date(e.when).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            <div className={e.isCorrection ? 'red-ink-text' : ''}>
              {e.href ? <Link href={e.href} style={{ color: 'inherit' }}>{e.text}</Link> : e.text}
            </div>
          </article>
        ))}
        {!events.length && (
          <div className="empty"><p>Todavía no hay movimientos. A medida que carguen cosas, van a aparecer acá.</p></div>
        )}
      </section>
    </div>
  )
}
