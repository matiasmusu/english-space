'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { useStore, friendlyError } from '@/lib/store'
import StatusBadge from '@/components/StatusBadge'
import AttachmentList from '@/components/AttachmentList'
import type { Contribution, EntryKind, ActivityStatus } from '@/lib/types'

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

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })

// Posición de un punto (nodo + offset) dentro del texto plano del contenedor,
// ignorando el contenido de los popovers de corrección.
function textOffset(container: HTMLElement, node: Node, offset: number): number {
  let total = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let n: Node | null
  while ((n = walker.nextNode())) {
    if ((n.parentElement)?.closest('.ink-pop, .correct-float')) continue
    if (n === node) return total + offset
    total += n.textContent?.length || 0
  }
  return total
}

type Sel = { entryId: string; start: number; end: number; text: string; top: number; left: number }

export default function ActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const {
    activities, materials, contributions, currentUser, loading,
    addContribution, addAnchoredCorrection, deleteContribution, updateStatus, updateActivity, deleteActivity
  } = useStore()
  const activity = activities.find(a => a.id === id)

  const [kind, setKind] = useState<EntryKind>('answer')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')

  const [editing, setEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editValues, setEditValues] = useState({ title: '', instructions: '', actionType: '', dueDate: '', bookReference: '', materialId: '' })

  // Corrección inline
  const [sel, setSel] = useState<Sel | null>(null)
  const [correcting, setCorrecting] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [savingCorr, setSavingCorr] = useState(false)
  const [openCorr, setOpenCorr] = useState<string | null>(null)

  if (!activity) {
    return (
      <div className="page">
        <h1>{loading ? 'Cargando…' : 'Actividad no encontrada'}</h1>
        {!loading && <p><Link href="/activities">Volver a actividades</Link></p>}
      </div>
    )
  }

  const all = contributions.filter(c => c.activityId === id)
  const entries = all.filter(c => !c.parentId)
  const childrenOf = (pid: string) =>
    all.filter(c => c.parentId === pid && c.anchorStart != null && c.anchorEnd != null)
      .sort((a, b) => a.anchorStart! - b.anchorStart!)

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
      await addContribution(id, kind, body, undefined, files)
      setBody(''); setFiles([]); setKind('answer')
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function removeContribution(cid: string, what: string) {
    if (!window.confirm(`¿Eliminar ${what}?`)) return
    setPageError('')
    setOpenCorr(null)
    try {
      await deleteContribution(cid)
    } catch (err) {
      setPageError(friendlyError(err))
    }
  }

  // ---- Selección de texto para corregir ----
  function handleSelect(entry: Contribution, e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) {
    if (correcting) return
    const container = e.currentTarget
    const s = window.getSelection()
    if (!s || s.isCollapsed || !s.rangeCount) { setSel(null); return }
    const range = s.getRangeAt(0)
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) { setSel(null); return }
    const start = textOffset(container, range.startContainer, range.startOffset)
    const end = textOffset(container, range.endContainer, range.endOffset)
    if (end <= start) { setSel(null); return }
    // No permitir superponer una corrección existente
    if (childrenOf(entry.id).some(k => k.anchorStart! < end && start < k.anchorEnd!)) { setSel(null); return }
    const rect = range.getBoundingClientRect()
    const crect = container.getBoundingClientRect()
    setSel({
      entryId: entry.id, start, end,
      text: entry.body.slice(start, end),
      top: rect.bottom - crect.top + 6,
      left: Math.max(0, Math.min(rect.left - crect.left, crect.width - 260))
    })
    setCorrecting(false)
    setCorrectionText('')
  }

  async function saveCorrection() {
    if (!sel || !correctionText.trim()) return
    setSavingCorr(true)
    setPageError('')
    try {
      await addAnchoredCorrection(id, sel.entryId, sel.start, sel.end, sel.text, correctionText.trim())
      setSel(null)
      setCorrecting(false)
      setCorrectionText('')
      window.getSelection()?.removeAllRanges()
    } catch (err) {
      setPageError(friendlyError(err))
    } finally {
      setSavingCorr(false)
    }
  }

  // Cuerpo de un aporte con las correcciones ancladas marcadas en rojo.
  function annotated(entry: Contribution) {
    const kids = childrenOf(entry.id)
    const text = entry.body
    if (!kids.length) return text
    const parts: React.ReactNode[] = []
    let pos = 0
    for (const k of kids) {
      const s = Math.max(pos, Math.min(k.anchorStart!, text.length))
      const e = Math.max(s, Math.min(k.anchorEnd!, text.length))
      if (s > pos) parts.push(text.slice(pos, s))
      parts.push(
        <mark
          key={k.id}
          className="ink"
          title={`Corrección: ${k.body}`}
          onClick={ev => { ev.stopPropagation(); setSel(null); setOpenCorr(openCorr === k.id ? null : k.id) }}
        >
          {text.slice(s, e)}
          {openCorr === k.id && (
            <span className="ink-pop" onClick={ev => ev.stopPropagation()}>
              <span className="ink-pop-body">{k.body}</span>
              <span className="ink-pop-meta">Corrección de {k.author.name} · {fmtDate(k.createdAt)}</span>
              <button type="button" className="link-danger" onClick={() => removeContribution(k.id, 'esta corrección')}>Eliminar corrección</button>
            </span>
          )}
        </mark>
      )
      pos = e
    }
    parts.push(text.slice(pos))
    return parts
  }

  return (
    <div className="page" onClick={() => setOpenCorr(null)}>
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
        <p className="correct-hint">Para corregir: seleccioná el texto en una respuesta y tocá <b>Corregir</b>. Lo corregido queda en rojo; al tocarlo se ve la corrección.</p>
        {entries.map(entry => (
          <article className={`timeline-entry ${entry.kind}`} key={entry.id}>
            <div className="entry-head">
              <span className="entry-kind">{kindLabels[entry.kind]}</span>
              <span>{entry.author.name} · {fmtDate(entry.createdAt)}</span>
            </div>
            {entry.kind === 'correction' && entry.originalText && (
              <div className="original"><b>Original:</b> {entry.originalText}</div>
            )}
            <div
              className={`entry-body${entry.kind === 'correction' ? ' red-ink-text' : ''}`}
              onMouseUp={entry.kind !== 'correction' ? e => handleSelect(entry, e) : undefined}
              onTouchEnd={entry.kind !== 'correction' ? e => handleSelect(entry, e) : undefined}
            >
              {annotated(entry)}
              {sel?.entryId === entry.id && (
                <span className="correct-float" style={{ top: sel.top, left: sel.left }} onClick={e => e.stopPropagation()}>
                  {!correcting ? (
                    <button type="button" className="correct-btn" onClick={() => setCorrecting(true)}>✏️ Corregir</button>
                  ) : (
                    <span className="correct-form">
                      <span className="correct-orig">“{sel.text.length > 70 ? sel.text.slice(0, 70) + '…' : sel.text}”</span>
                      <input
                        autoFocus
                        value={correctionText}
                        onChange={e => setCorrectionText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void saveCorrection() } }}
                        placeholder="Texto correcto o explicación"
                      />
                      <span className="correct-form-actions">
                        <button type="button" className="small-button" disabled={savingCorr} onClick={() => void saveCorrection()}>
                          {savingCorr ? 'Guardando…' : 'Guardar'}
                        </button>
                        <button type="button" className="secondary small-button" onClick={() => { setSel(null); setCorrecting(false) }}>Cancelar</button>
                      </span>
                    </span>
                  )}
                </span>
              )}
            </div>
            <AttachmentList attachments={entry.attachments} />
            <div className="entry-actions">
              <button type="button" className="link-danger" onClick={() => removeContribution(entry.id, 'este aporte del historial')}>Eliminar</button>
            </div>
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
            <option value="comment">Comentario</option>
            <option value="class_note">Nota de clase</option>
          </select>
        </label>
        <label>Contenido
          <textarea value={body} onChange={e => setBody(e.target.value)} required />
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
