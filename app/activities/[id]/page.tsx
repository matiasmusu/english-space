'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useStore, friendlyError } from '@/lib/store'
import StatusBadge from '@/components/StatusBadge'
import AttachmentList from '@/components/AttachmentList'
import type { EntryKind, ActivityStatus } from '@/lib/types'

const kindLabels: Record<EntryKind, string> = {
  answer: 'Respuesta',
  correction: 'Corrección',
  comment: 'Comentario',
  class_note: 'Nota de clase'
}

const statusOptions: { value: ActivityStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'in_progress', label: 'En progreso' },
  { value: 'completed', label: 'Lista' },
  { value: 'reviewed', label: 'Revisada' }
]

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const {
    activities, materials, contributions, currentUser, loading,
    addContribution, deleteContribution, updateStatus, updateActivity, deleteActivity
  } = useStore()
  const activity = activities.find(a => a.id === id)

  const [kind, setKind] = useState<EntryKind>('answer')
  const [original, setOriginal] = useState('')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')

  const [editing, setEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editValues, setEditValues] = useState({ title: '', instructions: '', actionType: '', dueDate: '', bookReference: '', materialId: '' })

  if (!activity) {
    return (
      <div className="page">
        <h1>{loading ? 'Cargando…' : 'Actividad no encontrada'}</h1>
        {!loading && <p><Link href="/activities">Volver a actividades</Link></p>}
      </div>
    )
  }
  const entries = contributions.filter(c => c.activityId === id)

  function startEditing() {
    setEditValues({
      title: activity!.title,
      instructions: activity!.instructions,
      actionType: activity!.actionType,
      dueDate: activity!.dueDate || '',
      bookReference: activity!.bookReference || '',
      materialId: activity!.materialId || ''
    })
    setPageError('')
    setEditing(true)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editValues.title.trim()) return
    setEditSaving(true)
    setPageError('')
    try {
      await updateActivity(id, {
        title: editValues.title.trim(),
        instructions: editValues.instructions,
        actionType: editValues.actionType,
        dueDate: editValues.dueDate || undefined,
        bookReference: editValues.bookReference || undefined,
        materialId: editValues.materialId || undefined
      })
      setEditing(false)
    } catch (err) {
      setPageError(friendlyError(err))
    } finally {
      setEditSaving(false)
    }
  }

  async function removeActivity() {
    if (!window.confirm('¿Eliminar esta actividad? Se borran también sus aportes y archivos. Esta acción no se puede deshacer.')) return
    setPageError('')
    try {
      await deleteActivity(id)
      router.replace('/activities')
    } catch (err) {
      setPageError(friendlyError(err))
    }
  }

  async function changeStatus(s: ActivityStatus) {
    if (s === activity!.status) return
    setPageError('')
    try {
      await updateStatus(id, s)
    } catch (err) {
      setPageError(friendlyError(err))
    }
  }

  async function submitContribution(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    setFormError('')
    try {
      await addContribution(id, kind, body, original || undefined, files)
      setBody(''); setOriginal(''); setFiles([]); setKind('answer')
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function removeContribution(cid: string) {
    if (!window.confirm('¿Eliminar este aporte del historial?')) return
    setPageError('')
    try {
      await deleteContribution(cid)
    } catch (err) {
      setPageError(friendlyError(err))
    }
  }

  return (
    <div className="page">
      <header>
        <div>
          <h1>{activity.title}</h1>
          <p>
            Creada por {activity.createdBy.name}
            {activity.bookReference ? ` · ${activity.bookReference}` : ''}
            {activity.materialTitle ? ` · Material: ${activity.materialTitle}` : ''}
          </p>
        </div>
        <StatusBadge status={activity.status} />
      </header>

      {pageError && <p className="form-error">{pageError}</p>}

      {editing ? (
        <form className="panel form" onSubmit={saveEdit}>
          <h2>Editar actividad</h2>
          <label>Título
            <input value={editValues.title} onChange={e => setEditValues(v => ({ ...v, title: e.target.value }))} required />
          </label>
          <label>Consigna o contexto
            <textarea value={editValues.instructions} onChange={e => setEditValues(v => ({ ...v, instructions: e.target.value }))} />
          </label>
          <div className="form-grid">
            <label>Tipo de acción
              <select value={editValues.actionType} onChange={e => setEditValues(v => ({ ...v, actionType: e.target.value }))}>
                <option>Actividad libre</option>
                <option>Resolver actividad</option>
                <option>Leer o estudiar</option>
                <option>Ver antes de clase</option>
                <option>Preparar para la clase</option>
              </select>
            </label>
            <label>Fecha límite (opcional)
              <input type="date" value={editValues.dueDate} onChange={e => setEditValues(v => ({ ...v, dueDate: e.target.value }))} />
            </label>
            <label>Material relacionado
              <select value={editValues.materialId} onChange={e => setEditValues(v => ({ ...v, materialId: e.target.value }))}>
                <option value="">Ninguno</option>
                {materials.map(m => <option value={m.id} key={m.id}>{m.title}</option>)}
              </select>
            </label>
            <label>Referencia del libro
              <input value={editValues.bookReference} onChange={e => setEditValues(v => ({ ...v, bookReference: e.target.value }))} />
            </label>
          </div>
          <div className="form-actions">
            <button disabled={editSaving}>{editSaving ? 'Guardando…' : 'Guardar cambios'}</button>
            <button type="button" className="secondary" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        </form>
      ) : (
        <section className="panel">
          <h2>Consigna</h2>
          <p className="instructions">{activity.instructions || 'Sin consigna escrita.'}</p>
          <AttachmentList attachments={activity.attachments} />
          <h2 style={{ marginTop: 18 }}>Estado</h2>
          <div className="status-buttons">
            {statusOptions.map(o => (
              <button
                key={o.value}
                type="button"
                className={activity.status === o.value ? `active${o.value === 'completed' || o.value === 'reviewed' ? ' done' : ''}` : ''}
                onClick={() => changeStatus(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="actions">
            <button type="button" className="secondary small-button" onClick={startEditing}>Editar actividad</button>
            <button type="button" className="danger small-button" onClick={removeActivity}>Eliminar actividad</button>
          </div>
        </section>
      )}

      <section className="timeline">
        <h2>Trabajo e historial</h2>
        {entries.map(entry => (
          <article className={`timeline-entry ${entry.kind}`} key={entry.id}>
            <div className="entry-head">
              <span className="entry-kind">{kindLabels[entry.kind]}</span>
              <span>{entry.author.name} · {new Date(entry.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            {entry.originalText && <div className="original"><b>Original:</b> {entry.originalText}</div>}
            <div className={entry.kind === 'correction' ? 'red-ink-text' : ''}>{entry.body}</div>
            <AttachmentList attachments={entry.attachments} />
            {entry.author.id === currentUser?.id && (
              <div className="entry-actions">
                <button type="button" className="link-danger" onClick={() => removeContribution(entry.id)}>Eliminar</button>
              </div>
            )}
          </article>
        ))}
        {!entries.length && (
          <div className="empty"><p>Todavía no hay aportes. Agregá el primero acá abajo.</p></div>
        )}
      </section>

      <form className="panel contribution-form form" onSubmit={submitContribution}>
        <h2>Agregar aporte</h2>
        <p>Se guarda en el historial con tu nombre y la fecha.</p>
        <label>Tipo de aporte
          <select value={kind} onChange={e => setKind(e.target.value as EntryKind)}>
            <option value="answer">Respuesta</option>
            <option value="correction">Corrección</option>
            <option value="comment">Comentario</option>
            <option value="class_note">Nota de clase</option>
          </select>
        </label>
        {kind === 'correction' && (
          <label>Texto original
            <textarea value={original} onChange={e => setOriginal(e.target.value)} placeholder="La frase o respuesta que se está corrigiendo" />
          </label>
        )}
        <label>{kind === 'correction' ? 'Texto corregido y explicación' : 'Contenido'}
          <textarea className={kind === 'correction' ? 'red-ink' : ''} value={body} onChange={e => setBody(e.target.value)} required />
        </label>
        <label>Archivos (opcional)
          <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
          {files.length > 0 && <small>{files.length} archivo{files.length > 1 ? 's' : ''} para subir</small>}
        </label>
        {formError && <p className="form-error">{formError}</p>}
        <div className="form-actions">
          <button disabled={saving}>{saving ? 'Guardando…' : 'Guardar en el historial'}</button>
        </div>
      </form>
    </div>
  )
}
