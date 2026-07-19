'use client'

import Link from 'next/link'
import { History as HistoryIcon } from 'lucide-react'
import { useStore } from '@/lib/store'
import EmptyState from '@/components/EmptyState'
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
  const { contributions, activities, materials } = useStore()

  const events: Event[] = [
    ...contributions.map(c => ({
      id: `c-${c.id}`,
      when: c.createdAt,
      author: c.author.name,
      label: kindLabels[c.kind],
      cssKind: c.kind,
      text: c.kind === 'correction' && c.originalText ? `"${c.originalText}" → ${c.body}` : c.body,
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
    }))
  ].sort((a, b) => b.when.localeCompare(a.when))

  return (
    <div className="page">
      <header>
        <div>
          <h1>Historial</h1>
          <p>Registro de toda la actividad del espacio, con autor, fecha y hora.</p>
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
          <EmptyState icon={HistoryIcon} title="Todavía no hay movimientos" hint="A medida que carguen actividades, materiales y aportes, van a aparecer acá." />
        )}
      </section>
    </div>
  )
}
