'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import EmptyState from '@/components/EmptyState'
import { useStore, friendlyError } from '@/lib/store'

export default function Activities() {
  const { activities, materials, addActivity } = useStore()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [actionType, setActionType] = useState('Actividad libre')
  const [dueDate, setDueDate] = useState('')
  const [bookReference, setBookReference] = useState('')
  const [materialId, setMaterialId] = useState('')
  const [files, setFiles] = useState<File[]>([])

  // Permite llegar desde el inicio con el formulario ya abierto.
  useEffect(() => {
    if (window.location.search.includes('nueva=1')) setOpen(true)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setFormError('')
    try {
      await addActivity({
        title: title.trim(), instructions, actionType,
        dueDate: dueDate || undefined,
        bookReference: bookReference || undefined,
        materialId: materialId || undefined,
        files
      })
      setTitle(''); setInstructions(''); setDueDate(''); setBookReference(''); setMaterialId(''); setFiles([])
      setOpen(false)
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <header>
        <div>
          <h1>Actividades</h1>
          <p>Tareas, lecturas y prácticas de las clases.</p>
        </div>
        <button onClick={() => setOpen(!open)}>{open ? 'Cerrar formulario' : '+ Nueva actividad'}</button>
      </header>

      {open && (
        <form className="panel form" onSubmit={submit}>
          <label>Título
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej.: Ejercicios de past simple" required />
          </label>
          <label>Consigna o contexto
            <textarea value={instructions} onChange={e => setInstructions(e.target.value)} placeholder="Qué hay que hacer, en pocas palabras." />
          </label>
          <div className="form-grid">
            <label>Tipo de acción
              <select value={actionType} onChange={e => setActionType(e.target.value)}>
                <option>Actividad libre</option>
                <option>Resolver actividad</option>
                <option>Leer o estudiar</option>
                <option>Ver antes de clase</option>
                <option>Preparar para la clase</option>
              </select>
            </label>
            <label>Fecha límite (opcional)
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </label>
            <label>Material relacionado
              <select value={materialId} onChange={e => setMaterialId(e.target.value)}>
                <option value="">Ninguno</option>
                {materials.map(m => <option value={m.id} key={m.id}>{m.title}</option>)}
              </select>
            </label>
            <label>Referencia del libro
              <input value={bookReference} onChange={e => setBookReference(e.target.value)} placeholder="Unit 4B · páginas 40–41" />
            </label>
          </div>
          <label>Archivos (opcional)
            <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && <small>{files.length} archivo{files.length > 1 ? 's' : ''} para subir</small>}
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button disabled={saving}>{saving ? 'Guardando…' : 'Crear actividad'}</button>
          </div>
        </form>
      )}

      <section className="list">
        {activities.map(x => (
          <Link className="activity-link" href={`/activities/${x.id}`} key={x.id}>
            <article>
              <div>
                <h3>{x.title}</h3>
                <p>{x.actionType} · creada por {x.createdBy.name}{x.dueDate ? ` · entrega ${x.dueDate}` : ''}</p>
              </div>
              <StatusBadge status={x.status} />
            </article>
          </Link>
        ))}
        {!activities.length && (
          <EmptyState icon={ClipboardList} title="Todavía no hay actividades" hint="Usá el botón + Nueva actividad para crear la primera." />
        )}
      </section>
    </div>
  )
}
