'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import type { Activity, ActivityStatus, Attachment, Contribution, EntryKind, Material, NotebookEntry, Person } from './types'
import { createClient } from './supabase'

const BUCKET = 'english-space'
const SIGNED_URL_SECONDS = 60 * 60 * 8

export type Notice = { type: 'success' | 'error'; text: string }

export type NewActivity = {
  title: string; instructions: string; actionType: string
  dueDate?: string; bookReference?: string; materialId?: string; files?: File[]
}
export type ActivityEdit = {
  title: string; instructions: string; actionType: string
  dueDate?: string; bookReference?: string; materialId?: string
}
export type NewMaterial = {
  title: string; description: string; type: string; category: string
  url?: string; pinned: boolean; files?: File[]
}
export type NewNote = {
  title: string; date: string; topic: string; notes: string
  relatedActivityId?: string; files?: File[]
}

type Ctx = {
  currentUser: Person | null
  loading: boolean
  error: string | null
  notice: Notice | null
  activities: Activity[]
  contributions: Contribution[]
  materials: Material[]
  notes: NotebookEntry[]
  clearNotice: () => void
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
  addActivity: (v: NewActivity) => Promise<string>
  updateActivity: (id: string, v: ActivityEdit) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  updateStatus: (id: string, s: ActivityStatus) => Promise<void>
  addContribution: (activityId: string, kind: EntryKind, body: string, originalText?: string, files?: File[]) => Promise<void>
  deleteContribution: (id: string) => Promise<void>
  addMaterial: (v: NewMaterial) => Promise<void>
  updateMaterial: (id: string, v: NewMaterial) => Promise<void>
  deleteMaterial: (id: string) => Promise<void>
  addNote: (v: NewNote) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

const Store = createContext<Ctx | null>(null)

// Convierte errores técnicos de Supabase en mensajes entendibles.
export function friendlyError(err: unknown): string {
  const raw = (err as { message?: string })?.message || String(err ?? '')
  const msg = raw.toLowerCase()
  if (msg.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.'
  if (msg.includes('email not confirmed')) return 'Falta confirmar el correo. Avisale a Matías para revisarlo en Supabase.'
  if (msg.includes('bucket not found')) return 'No se encontró el espacio de archivos en Supabase. Hay que crear el bucket "english-space".'
  if (msg.includes('row-level security') || msg.includes('violates row-level')) return 'Supabase rechazó la operación por permisos. Revisá las políticas de seguridad (RLS).'
  if (msg.includes('permission denied')) return 'La base de datos rechazó la operación por falta de permisos. Hay que ejecutar el script supabase/fix-permissions.sql en el SQL Editor de Supabase.'
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) return 'No hay conexión con el servidor. Revisá tu internet e intentá de nuevo.'
  if (msg.includes('payload too large') || msg.includes('exceeded the maximum allowed size')) return 'El archivo es demasiado grande para subirlo.'
  if (msg.includes('jwt') || msg.includes('token')) return 'La sesión expiró. Cerrá sesión y volvé a ingresar.'
  return raw || 'Ocurrió un error inesperado. Intentá de nuevo.'
}

const mapPerson = (p: { id: string; full_name: string; role: string }): Person => ({
  id: p.id,
  name: p.full_name,
  role: p.role === 'teacher' ? 'teacher' : 'student'
})

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const path = usePathname()

  const [currentUser, setCurrentUser] = useState<Person | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [notes, setNotes] = useState<NotebookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const noticeTimer = useRef<number | null>(null)
  const userRef = useRef<Person | null>(null)
  userRef.current = currentUser

  const showNotice = useCallback((n: Notice) => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    setNotice(n)
    noticeTimer.current = window.setTimeout(() => setNotice(null), n.type === 'success' ? 4000 : 8000)
  }, [])
  const clearNotice = useCallback(() => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current)
    setNotice(null)
  }, [])

  const uploadFiles = useCallback(async (entityType: Attachment['entityType'], entityId: string, files: File[]) => {
    const user = userRef.current
    if (!user) throw new Error('Debés iniciar sesión para subir archivos.')
    for (const file of files) {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `${entityType}/${entityId}/${crypto.randomUUID()}-${safe}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(filePath, file, {
        contentType: file.type || undefined
      })
      if (upErr) throw upErr
      const { error: insErr } = await supabase.from('attachments').insert({
        entity_type: entityType,
        entity_id: entityId,
        file_path: filePath,
        file_name: file.name,
        uploaded_by: user.id
      })
      if (insErr) {
        // Evita dejar archivos huérfanos si la fila no se pudo registrar.
        await supabase.storage.from(BUCKET).remove([filePath])
        throw insErr
      }
    }
  }, [supabase])

  // Borra los archivos de Storage y las filas de attachments de una o más entidades.
  const removeAttachmentsFor = useCallback(async (entityIds: string[]) => {
    if (!entityIds.length) return
    const { data, error: selErr } = await supabase.from('attachments').select('id,file_path').in('entity_id', entityIds)
    if (selErr) throw selErr
    const rows = data || []
    if (!rows.length) return
    const paths = rows.map((r: { file_path: string }) => r.file_path)
    await supabase.storage.from(BUCKET).remove(paths)
    const { error: delErr } = await supabase.from('attachments').delete().in('entity_id', entityIds)
    if (delErr) throw delErr
  }, [supabase])

  const refresh = useCallback(async () => {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      setCurrentUser(null); setActivities([]); setMaterials([]); setContributions([]); setNotes([])
      setLoading(false)
      return
    }

    const [profilesR, materialsR, activitiesR, contribR, notesR, attachR] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('materials').select('*').order('created_at', { ascending: false }),
      supabase.from('activities').select('*').order('created_at', { ascending: false }),
      supabase.from('contributions').select('*').order('created_at'),
      supabase.from('notebook_entries').select('*').order('entry_date', { ascending: false }),
      supabase.from('attachments').select('*').order('created_at')
    ])
    const firstErr = [profilesR, materialsR, activitiesR, contribR, notesR, attachR].find(r => r.error)?.error
    if (firstErr) {
      setError(friendlyError(firstErr))
      setLoading(false)
      return
    }

    const people = new Map<string, Person>((profilesR.data || []).map((p: any) => [p.id, mapPerson(p)]))
    const meta = (user.user_metadata || {}) as { full_name?: string; role?: string }
    const me = people.get(user.id) || {
      id: user.id,
      name: meta.full_name || user.email?.split('@')[0] || 'Usuario',
      role: meta.role === 'teacher' ? 'teacher' as const : 'student' as const
    }
    setCurrentUser(me)

    // Firma todas las URLs de archivos en una sola llamada.
    const attachRows = attachR.data || []
    const byEntity = new Map<string, Attachment[]>()
    if (attachRows.length) {
      const paths = attachRows.map((a: any) => a.file_path)
      const { data: signedList } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS)
      const urlByPath = new Map<string, string>()
      for (const s of signedList || []) {
        if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl)
      }
      for (const a of attachRows) {
        const item: Attachment = {
          id: a.id, entityType: a.entity_type, entityId: a.entity_id,
          filePath: a.file_path, fileName: a.file_name,
          signedUrl: urlByPath.get(a.file_path),
          uploadedBy: a.uploaded_by, createdAt: a.created_at
        }
        byEntity.set(a.entity_id, [...(byEntity.get(a.entity_id) || []), item])
      }
    }

    setMaterials((materialsR.data || []).map((m: any) => ({
      id: m.id, title: m.title, description: m.description || '', type: m.type,
      category: m.category || 'General', url: m.external_url || undefined, pinned: m.is_pinned,
      createdBy: people.get(m.created_by) || me, createdAt: m.created_at,
      attachments: byEntity.get(m.id) || []
    })))
    const materialTitles = new Map<string, string>((materialsR.data || []).map((m: any) => [m.id, m.title]))
    setActivities((activitiesR.data || []).map((a: any) => ({
      id: a.id, title: a.title, instructions: a.instructions || '', actionType: a.action_type,
      status: a.status, dueDate: a.due_date || undefined, bookReference: a.book_reference || undefined,
      materialId: a.material_id || undefined,
      materialTitle: a.material_id ? materialTitles.get(a.material_id) : undefined,
      createdBy: people.get(a.created_by) || me, createdAt: a.created_at,
      attachments: byEntity.get(a.id) || []
    })))
    setContributions((contribR.data || []).map((c: any) => ({
      id: c.id, activityId: c.activity_id, author: people.get(c.author_id) || me,
      kind: c.kind, body: c.body, originalText: c.original_text || undefined, createdAt: c.created_at,
      attachments: byEntity.get(c.id) || []
    })))
    setNotes((notesR.data || []).map((n: any) => ({
      id: n.id, title: n.title, date: n.entry_date || '', topic: n.topic || '', notes: n.notes || '',
      relatedActivityId: n.related_activity_id || undefined,
      createdBy: people.get(n.created_by) || me, createdAt: n.created_at,
      attachments: byEntity.get(n.id) || []
    })))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void refresh()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Supabase advierte no ejecutar otras llamadas del cliente directamente
      // dentro de este callback porque puede producir un bloqueo.
      window.setTimeout(() => { void refresh() }, 0)
    })
    return () => subscription.unsubscribe()
  }, [refresh, supabase])

  useEffect(() => {
    if (!loading && !currentUser && path !== '/login') router.replace('/login')
    if (!loading && currentUser && path === '/login') router.replace('/')
  }, [loading, currentUser, path, router])

  const ensure = () => {
    const user = userRef.current
    if (!user) throw new Error('Debés iniciar sesión.')
    return user
  }

  const value = useMemo<Ctx>(() => ({
    currentUser, loading, error, notice, activities, contributions, materials, notes, refresh, clearNotice,

    signIn: async (email, password) => {
      setLoading(true)
      setError(null)
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (err) { setLoading(false); throw new Error(friendlyError(err)) }
      if (!data.user) { setLoading(false); throw new Error('No se pudo iniciar sesión.') }
      // No esperamos refresh() acá: algunas versiones del cliente de Supabase
      // pueden bloquear llamadas consecutivas durante el cambio de sesión.
      const metadata = data.user.user_metadata || {}
      setCurrentUser({
        id: data.user.id,
        name: metadata.full_name || data.user.email?.split('@')[0] || 'Usuario',
        role: metadata.role === 'teacher' ? 'teacher' : 'student'
      })
      setLoading(false)
      router.replace('/')
      window.setTimeout(() => { void refresh() }, 100)
    },

    signOut: async () => {
      await supabase.auth.signOut()
      setCurrentUser(null)
      router.replace('/login')
    },

    addActivity: async v => {
      const user = ensure()
      const { data, error: err } = await supabase.from('activities').insert({
        title: v.title, instructions: v.instructions, action_type: v.actionType, status: 'pending',
        due_date: v.dueDate || null, book_reference: v.bookReference || null,
        material_id: v.materialId || null, created_by: user.id
      }).select('id').single()
      if (err) throw new Error(friendlyError(err))
      try {
        if (v.files?.length) await uploadFiles('activity', data.id, v.files)
      } catch (e) {
        throw new Error(`La actividad se creó, pero falló la subida del archivo: ${friendlyError(e)}`)
      } finally {
        await refresh()
      }
      showNotice({ type: 'success', text: 'Actividad creada.' })
      return data.id
    },

    updateActivity: async (id, v) => {
      ensure()
      const { error: err } = await supabase.from('activities').update({
        title: v.title, instructions: v.instructions, action_type: v.actionType,
        due_date: v.dueDate || null, book_reference: v.bookReference || null,
        material_id: v.materialId || null, updated_at: new Date().toISOString()
      }).eq('id', id)
      if (err) throw new Error(friendlyError(err))
      await refresh()
      showNotice({ type: 'success', text: 'Actividad actualizada.' })
    },

    deleteActivity: async id => {
      ensure()
      const contribIds = contributions.filter(c => c.activityId === id).map(c => c.id)
      await removeAttachmentsFor([id, ...contribIds])
      const { error: err } = await supabase.from('activities').delete().eq('id', id)
      if (err) throw new Error(friendlyError(err))
      await refresh()
      showNotice({ type: 'success', text: 'Actividad eliminada.' })
    },

    updateStatus: async (id, s) => {
      ensure()
      const { error: err } = await supabase.from('activities').update({
        status: s, updated_at: new Date().toISOString()
      }).eq('id', id)
      if (err) throw new Error(friendlyError(err))
      await refresh()
      showNotice({ type: 'success', text: 'Estado actualizado.' })
    },

    addContribution: async (activityId, kind, body, originalText, files) => {
      const user = ensure()
      const { data, error: err } = await supabase.from('contributions').insert({
        activity_id: activityId, author_id: user.id, kind, body, original_text: originalText || null
      }).select('id').single()
      if (err) throw new Error(friendlyError(err))
      try {
        if (files?.length) await uploadFiles('contribution', data.id, files)
      } catch (e) {
        throw new Error(`El aporte se guardó, pero falló la subida del archivo: ${friendlyError(e)}`)
      } finally {
        await refresh()
      }
      showNotice({ type: 'success', text: 'Aporte guardado en el historial.' })
    },

    deleteContribution: async id => {
      ensure()
      await removeAttachmentsFor([id])
      const { error: err } = await supabase.from('contributions').delete().eq('id', id)
      if (err) throw new Error(friendlyError(err))
      await refresh()
      showNotice({ type: 'success', text: 'Aporte eliminado.' })
    },

    addMaterial: async v => {
      const user = ensure()
      const { data, error: err } = await supabase.from('materials').insert({
        title: v.title, description: v.description, type: v.type, category: v.category,
        external_url: v.url || null, is_pinned: v.pinned, created_by: user.id
      }).select('id').single()
      if (err) throw new Error(friendlyError(err))
      try {
        if (v.files?.length) await uploadFiles('material', data.id, v.files)
      } catch (e) {
        throw new Error(`El material se creó, pero falló la subida del archivo: ${friendlyError(e)}`)
      } finally {
        await refresh()
      }
      showNotice({ type: 'success', text: 'Material guardado.' })
    },

    updateMaterial: async (id, v) => {
      ensure()
      const { error: err } = await supabase.from('materials').update({
        title: v.title, description: v.description, type: v.type, category: v.category,
        external_url: v.url || null, is_pinned: v.pinned, updated_at: new Date().toISOString()
      }).eq('id', id)
      if (err) throw new Error(friendlyError(err))
      try {
        if (v.files?.length) await uploadFiles('material', id, v.files)
      } catch (e) {
        throw new Error(`El material se actualizó, pero falló la subida del archivo: ${friendlyError(e)}`)
      } finally {
        await refresh()
      }
      showNotice({ type: 'success', text: 'Material actualizado.' })
    },

    deleteMaterial: async id => {
      ensure()
      await removeAttachmentsFor([id])
      const { error: err } = await supabase.from('materials').delete().eq('id', id)
      if (err) throw new Error(friendlyError(err))
      await refresh()
      showNotice({ type: 'success', text: 'Material eliminado.' })
    },

    addNote: async v => {
      const user = ensure()
      const { data, error: err } = await supabase.from('notebook_entries').insert({
        title: v.title, entry_date: v.date, topic: v.topic, notes: v.notes,
        related_activity_id: v.relatedActivityId || null, created_by: user.id
      }).select('id').single()
      if (err) throw new Error(friendlyError(err))
      try {
        if (v.files?.length) await uploadFiles('notebook', data.id, v.files)
      } catch (e) {
        throw new Error(`La entrada se creó, pero falló la subida de las fotos: ${friendlyError(e)}`)
      } finally {
        await refresh()
      }
      showNotice({ type: 'success', text: 'Entrada guardada en el cuaderno.' })
    },

    deleteNote: async id => {
      ensure()
      await removeAttachmentsFor([id])
      const { error: err } = await supabase.from('notebook_entries').delete().eq('id', id)
      if (err) throw new Error(friendlyError(err))
      await refresh()
      showNotice({ type: 'success', text: 'Entrada eliminada.' })
    }
  }), [currentUser, loading, error, notice, activities, contributions, materials, notes, refresh, clearNotice, supabase, router, uploadFiles, removeAttachmentsFor, showNotice])

  return <Store.Provider value={value}>{children}</Store.Provider>
}

export function useStore() {
  const v = useContext(Store)
  if (!v) throw new Error('StoreProvider missing')
  return v
}
