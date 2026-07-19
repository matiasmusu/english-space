'use client'

import { useEffect, useState } from 'react'
import { BookOpen, FileText, GraduationCap, Headphones, Image as ImageIcon, Link2, Video, Library, Youtube, BookMarked } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useStore, friendlyError } from '@/lib/store'
import AttachmentList from '@/components/AttachmentList'
import EmptyState from '@/components/EmptyState'
import type { Material } from '@/lib/types'

const emptyForm = { title: '', description: '', type: 'PDF', category: 'General', url: '', pinned: false }

const typeIcons: Record<string, LucideIcon> = {
  PDF: FileText,
  Libro: BookOpen,
  Documento: FileText,
  Link: Link2,
  Video: Video,
  Audio: Headphones,
  Imagen: ImageIcon
}

// Portada del material: imagen si tiene, si no un icono según el servicio o el tipo.
function MaterialCover({ m }: { m: Material }) {
  if (m.coverUrl) return <img className="material-cover" src={m.coverUrl} alt={`Portada de ${m.title}`} />
  const url = (m.url || '').toLowerCase()
  let Icon = typeIcons[m.type] || FileText
  let brand = ''
  if (url.includes('youtube.com') || url.includes('youtu.be')) { Icon = Youtube; brand = ' yt' }
  else if (url.includes('classroom.google')) { Icon = GraduationCap; brand = ' gc' }
  else if (url.includes('wordreference') || url.includes('cambridge')) { Icon = BookMarked; brand = '' }
  return <span className={`type-tile big${brand}`}><Icon size={30} /></span>
}

export default function Materials() {
  const { materials, addMaterial, updateMaterial, deleteMaterial } = useStore()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [files, setFiles] = useState<File[]>([])
  const [cover, setCover] = useState<File | null>(null)

  useEffect(() => {
    if (window.location.search.includes('nuevo=1')) setOpen(true)
  }, [])

  function set<K extends keyof typeof emptyForm>(key: K, value: typeof emptyForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function startEdit(m: Material) {
    setForm({ title: m.title, description: m.description, type: m.type, category: m.category, url: m.url || '', pinned: m.pinned })
    setEditingId(m.id)
    setFiles([])
    setCover(null)
    setFormError('')
    setOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setFiles([])
    setCover(null)
    setFormError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setFormError('')
    try {
      const values = { ...form, title: form.title.trim(), url: form.url || undefined, files, cover }
      if (editingId) {
        await updateMaterial(editingId, values)
      } else {
        await addMaterial(values)
      }
      closeForm()
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(m: Material) {
    if (!window.confirm(`¿Eliminar el material "${m.title}"? Se borran también sus archivos.`)) return
    setPageError('')
    try {
      await deleteMaterial(m.id)
    } catch (err) {
      setPageError(friendlyError(err))
    }
  }

  const pinned = materials.filter(x => x.pinned)
  const library = materials.filter(x => !x.pinned)

  const card = (x: Material) => {
    return (
      <article key={x.id} className="material-item">
        <MaterialCover m={x} />
        <div className="material-body">
          <h3>{x.title}</h3>
          <p>{x.type} · {x.category} · por {x.createdBy.name}</p>
          {x.description && <p>{x.description}</p>}
          {x.url && <a className="file-chip" href={x.url} target="_blank" rel="noreferrer">🔗 Abrir enlace</a>}
          <AttachmentList attachments={x.attachments} />
        </div>
        <div className="stack-links">
          <button type="button" className="secondary small-button" onClick={() => startEdit(x)}>Editar</button>
          <button type="button" className="link-danger" onClick={() => remove(x)}>Eliminar</button>
        </div>
      </article>
    )
  }

  return (
    <div className="page">
      <header>
        <div>
          <h1>Materiales</h1>
          <p>Libros, PDFs, audios, videos y links compartidos.</p>
        </div>
        <button onClick={() => open ? closeForm() : setOpen(true)}>{open ? 'Cerrar formulario' : '+ Agregar material'}</button>
      </header>

      {pageError && <p className="form-error">{pageError}</p>}

      {open && (
        <form className="panel form" onSubmit={submit}>
          <h2>{editingId ? 'Editar material' : 'Nuevo material'}</h2>
          <label>Título
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej.: English File Intermediate" required />
          </label>
          <label>Descripción
            <textarea value={form.description} onChange={e => set('description', e.target.value)} />
          </label>
          <div className="form-grid">
            <label>Tipo
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                <option>PDF</option>
                <option>Libro</option>
                <option>Documento</option>
                <option>Link</option>
                <option>Video</option>
                <option>Audio</option>
                <option>Imagen</option>
              </select>
            </label>
            <label>Categoría
              <input value={form.category} onChange={e => set('category', e.target.value)} />
            </label>
          </div>
          <label>Link externo (opcional)
            <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://..." />
          </label>
          <label>{editingId ? 'Agregar archivos (opcional)' : 'Archivos (opcional)'}
            <input type="file" multiple onChange={e => setFiles(Array.from(e.target.files || []))} />
            {files.length > 0 && <small>{files.length} archivo{files.length > 1 ? 's' : ''} para subir</small>}
          </label>
          <label>Portada (opcional)
            <input type="file" accept="image/*" onChange={e => setCover(e.target.files?.[0] || null)} />
            <small>Una imagen de la tapa del libro o del recurso, para reconocerlo de un vistazo.</small>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={form.pinned} onChange={e => set('pinned', e.target.checked)} />
            Fijar como material principal (por ejemplo, el libro de clase)
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar material'}</button>
            <button type="button" className="secondary" onClick={closeForm}>Cancelar</button>
          </div>
        </form>
      )}

      {pinned.length > 0 && (
        <>
          <h2>Fijados</h2>
          <section className="list" style={{ marginBottom: 22 }}>{pinned.map(card)}</section>
        </>
      )}

      <h2>Biblioteca</h2>
      <section className="list">
        {library.map(card)}
        {!library.length && !pinned.length && (
          <EmptyState icon={Library} title="Todavía no hay materiales" hint="Usá + Agregar material para subir el primero." />
        )}
      </section>
    </div>
  )
}
