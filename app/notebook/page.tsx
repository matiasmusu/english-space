'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { NotebookTabs } from 'lucide-react'
import { useStore, friendlyError } from '@/lib/store'
import AttachmentList from '@/components/AttachmentList'
import EmptyState from '@/components/EmptyState'

const today = () => new Date().toISOString().slice(0, 10)

export default function Notebook() {
  const { notes, activities, addNote, deleteNote } = useStore()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(today())
  const [topic, setTopic] = useState('')
  const [notesText, setNotesText] = useState('')
  const [related, setRelated] = useState('')
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    if (window.location.search.includes('nueva=1')) setOpen(true)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setFormError('')
    try {
      await addNote({
        title: title.trim(), date, topic, notes: notesText,
        relatedActivityId: related || undefined, files
      })
      setOpen(false)
      setTitle(''); setDate(today()); setTopic(''); setNotesText(''); setRelated(''); setFiles([])
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string, entryTitle: string) {
    if (!window.confirm(`¿Eliminar la entrada "${entryTitle}"? Se borran también sus fotos.`)) return
    setPageError('')
    try {
      await deleteNote(id)
    } catch (err) {
      setPageError(friendlyError(err))
    }
  }

  return (
    <div className="page">
      <header>
        <div>
          <h1>Cuaderno digital</h1>
          <p>Fotos de las páginas del cuaderno, apuntes y notas de clase.</p>
        </div>
        <button onClick={() => setOpen(!open)}>{open ? 'Cerrar formulario' : '+ Nueva entrada'}</button>
      </header>

      {pageError && <p className="form-error">{pageError}</p>}

      {open && (
        <form className="panel form" onSubmit={submit}>
          <label>Título
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej.: Clase del martes — vocabulario de viajes" required />
          </label>
          <div className="form-grid">
            <label>Fecha
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </label>
            <label>Tema
              <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Ej.: Past simple" />
            </label>
          </div>
          <label>Notas (opcional)
            <textarea value={notesText} onChange={e => setNotesText(e.target.value)} />
          </label>
          <label>Actividad relacionada (opcional)
            <select value={related} onChange={e => setRelated(e.target.value)}>
              <option value="">Ninguna</option>
              {activities.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>
          </label>
          <label>Fotos o archivos
            <input type="file" multiple accept="image/*,.pdf" onChange={e => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && <small>{files.length} archivo{files.length > 1 ? 's' : ''} para subir</small>}
            <small>Podés elegir varias fotos a la vez.</small>
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button disabled={saving}>{saving ? 'Guardando…' : 'Guardar entrada'}</button>
          </div>
        </form>
      )}

      <section className="notebook-list">
        {notes.map(n => {
          const relatedActivity = n.relatedActivityId ? activities.find(a => a.id === n.relatedActivityId) : undefined
          return (
            <article key={n.id}>
              <div className="entry-head">
                <h3>{n.title}</h3>
                <span>{n.date}{n.topic ? ` · ${n.topic}` : ''} · por {n.createdBy.name}</span>
              </div>
              {n.notes && <p>{n.notes}</p>}
              {relatedActivity && (
                <p>Relacionada con: <Link href={`/activities/${relatedActivity.id}`}>{relatedActivity.title}</Link></p>
              )}
              <AttachmentList attachments={n.attachments} />
              <div className="entry-actions">
                <button type="button" className="link-danger" onClick={() => remove(n.id, n.title)}>Eliminar</button>
              </div>
            </article>
          )
        })}
        {!notes.length && (
          <EmptyState icon={NotebookTabs} title="El cuaderno está vacío" hint="Usá + Nueva entrada para subir fotos o apuntes de una clase." />
        )}
      </section>
    </div>
  )
}
