'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import StatusBadge from '@/components/StatusBadge'
import type { EntryKind, ActivityStatus } from '@/lib/types'

const labels: Record<EntryKind, string> = {
  answer: 'Respuesta', correction: 'Corrección', comment: 'Comentario', class_note: 'Nota de clase'
}

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const { activities, contributions, addContribution, updateStatus, currentUser } = useStore()
  const activity = activities.find(a => a.id === id)
  const [kind, setKind] = useState<EntryKind>('answer')
  const [original, setOriginal] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  if (!activity) return <div className="page"><h1>Actividad no encontrada</h1></div>
  const entries = contributions.filter(c => c.activityId === id)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    try {
      await addContribution(id, kind, body, original || undefined, file)
      setBody(''); setOriginal(''); setFile(null)
    } finally { setSaving(false) }
  }

  return <div className="page">
    <header><div><h1>{activity.title}</h1><p>Creada por {activity.createdBy.name} · {activity.bookReference || activity.materialTitle || 'Actividad independiente'}</p></div><StatusBadge status={activity.status}/></header>
    <section className="panel">
      <h2>Consigna</h2><p className="instructions">{activity.instructions || 'Sin consigna escrita.'}</p>
      {activity.attachments?.map(a => <a className="file-chip" href={a.signedUrl} target="_blank" rel="noreferrer" key={a.id}>📎 {a.fileName}</a>)}
      <label className="inline-field">Estado
        <select value={activity.status} onChange={e => updateStatus(id, e.target.value as ActivityStatus)}>
          <option value="pending">Pendiente</option><option value="in_progress">En progreso</option><option value="completed">Lista</option><option value="reviewed">Revisada</option><option value="changes_requested">Requiere cambios</option>
        </select>
      </label>
    </section>
    <section className="timeline"><h2>Trabajo e historial</h2>
      {entries.map(entry => <article className={`timeline-entry ${entry.kind}`} key={entry.id}>
        <div className="entry-head"><strong>{labels[entry.kind]}</strong><span>{entry.author.name} · {new Date(entry.createdAt).toLocaleString('es-AR')}</span></div>
        {entry.originalText && <div className="original"><b>Original:</b> {entry.originalText}</div>}
        <div className={entry.kind === 'correction' ? 'red-ink-text' : ''}>{entry.body}</div>
      </article>)}
      {!entries.length && <p>Todavía no hay aportes.</p>}
    </section>
    <form className="panel contribution-form" onSubmit={submit}>
      <h2>Agregar aporte como {currentUser?.name}</h2>
      <label>Tipo<select value={kind} onChange={e => setKind(e.target.value as EntryKind)}><option value="answer">Respuesta</option><option value="correction">Corrección</option><option value="comment">Comentario</option><option value="class_note">Nota de clase</option></select></label>
      {kind === 'correction' && <label>Texto original<textarea value={original} onChange={e => setOriginal(e.target.value)} placeholder="La frase o respuesta que se está corrigiendo"/></label>}
      <label>{kind === 'correction' ? 'Texto corregido' : 'Contenido'}<textarea className={kind === 'correction' ? 'red-ink' : ''} value={body} onChange={e => setBody(e.target.value)} required/></label>
      <label>Adjunto opcional<input type="file" onChange={e => setFile(e.target.files?.[0] || null)}/></label>
      <button disabled={saving}>{saving ? 'Guardando…' : 'Guardar en el historial'}</button>
    </form>
  </div>
}
