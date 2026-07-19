'use client'

import { useEffect, useMemo, useState } from 'react'
import { Languages } from 'lucide-react'
import { useStore, friendlyError } from '@/lib/store'
import EmptyState from '@/components/EmptyState'
import type { VocabularyItem } from '@/lib/types'

const emptyForm = { term: '', translation: '', pronunciation: '', notes: '', classDate: '' }

function dateLabel(iso?: string) {
  if (!iso) return 'Sin fecha de clase'
  const d = new Date(iso + 'T12:00:00')
  const s = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  return 'Clase del ' + s
}

export default function Vocabulary() {
  const { vocabulary, addVocab, updateVocab, deleteVocab } = useStore()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pageError, setPageError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (window.location.search.includes('nueva=1')) setOpen(true)
  }, [])

  function set<K extends keyof typeof emptyForm>(key: K, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function startEdit(v: VocabularyItem) {
    setForm({ term: v.term, translation: v.translation, pronunciation: v.pronunciation, notes: v.notes, classDate: v.classDate || '' })
    setEditingId(v.id)
    setFormError('')
    setOpen(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function closeForm() {
    setOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setFormError('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.term.trim()) return
    setSaving(true)
    setFormError('')
    try {
      const values = { ...form, term: form.term.trim(), classDate: form.classDate || undefined }
      if (editingId) await updateVocab(editingId, values)
      else await addVocab(values)
      closeForm()
    } catch (err) {
      setFormError(friendlyError(err))
    } finally {
      setSaving(false)
    }
  }

  async function remove(v: VocabularyItem) {
    if (!window.confirm(`¿Eliminar "${v.term}" del vocabulario?`)) return
    setPageError('')
    try {
      await deleteVocab(v.id)
    } catch (err) {
      setPageError(friendlyError(err))
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return vocabulary
    return vocabulary.filter(v =>
      v.term.toLowerCase().includes(q) ||
      v.translation.toLowerCase().includes(q) ||
      v.notes.toLowerCase().includes(q)
    )
  }, [vocabulary, query])

  const groups = useMemo(() => {
    const map = new Map<string, VocabularyItem[]>()
    for (const v of filtered) {
      const key = v.classDate || ''
      map.set(key, [...(map.get(key) || []), v])
    }
    return [...map.entries()]
  }, [filtered])

  return (
    <div className="page">
      <header>
        <div>
          <h1>Vocabulario</h1>
          <p>Las palabras y frases que van saliendo en las clases, con traducción y pronunciación.</p>
        </div>
        <button onClick={() => open ? closeForm() : setOpen(true)}>{open ? 'Cerrar formulario' : '+ Agregar palabra'}</button>
      </header>

      {pageError && <p className="form-error">{pageError}</p>}

      {open && (
        <form className="panel form" onSubmit={submit}>
          <h2>{editingId ? 'Editar palabra' : 'Nueva palabra o frase'}</h2>
          <div className="form-grid">
            <label>Palabra o frase (inglés)
              <input value={form.term} onChange={e => set('term', e.target.value)} placeholder="Ej.: wallet" required />
            </label>
            <label>Traducción
              <input value={form.translation} onChange={e => set('translation', e.target.value)} placeholder="Ej.: billetera" />
            </label>
            <label>Pronunciación (opcional)
              <input value={form.pronunciation} onChange={e => set('pronunciation', e.target.value)} placeholder="Ej.: uálet" />
            </label>
            <label>Fecha de clase (opcional)
              <input type="date" value={form.classDate} onChange={e => set('classDate', e.target.value)} />
            </label>
          </div>
          <label>Nota o ejemplo (opcional)
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder='Ej.: "purse" es el monedero; en inglés americano purse = cartera de mujer' />
          </label>
          {formError && <p className="form-error">{formError}</p>}
          <div className="form-actions">
            <button disabled={saving}>{saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Guardar palabra'}</button>
            <button type="button" className="secondary" onClick={closeForm}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="vocab-search">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar una palabra o traducción…"
          aria-label="Buscar en el vocabulario"
        />
        {query && <small>{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</small>}
      </div>

      {groups.map(([date, items]) => (
        <section key={date || 'sin-fecha'} className="vocab-group">
          <h2>{dateLabel(date || undefined)} <small>· {items.length} palabra{items.length === 1 ? '' : 's'}</small></h2>
          <div className="vocab-list">
            {items.map(v => (
              <article key={v.id} className="vocab-item">
                <div className="vocab-main">
                  <strong>{v.term}</strong>
                  {v.pronunciation && <span className="vocab-pron">({v.pronunciation})</span>}
                  {v.translation && <span className="vocab-trans">{v.translation}</span>}
                </div>
                {v.notes && <p>{v.notes}</p>}
                <div className="vocab-actions">
                  <button type="button" className="link-danger" onClick={() => startEdit(v)}>Editar</button>
                  <button type="button" className="link-danger" onClick={() => remove(v)}>Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      {!vocabulary.length && (
        <EmptyState icon={Languages} title="Todavía no hay vocabulario" hint="Usá + Agregar palabra para guardar la primera." />
      )}
      {vocabulary.length > 0 && !filtered.length && (
        <EmptyState icon={Languages} title="Sin resultados" hint={`No se encontró "${query}" en el vocabulario.`} />
      )}
    </div>
  )
}
