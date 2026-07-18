'use client'
import { useState } from 'react'
import { BookOpen, ClipboardList, MessageSquareText, NotebookTabs } from 'lucide-react'
import { useStore } from '@/lib/store'

export default function Login() {
  const { signIn, loading } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error.')
      setSubmitting(false)
    }
  }

  const busy = loading || submitting

  return (
    <div className="login-screen">
      <div className="login-hero">
        <div className="brand-mark"><BookOpen size={26} /></div>
        <h2>English Space</h2>
        <p>Un espacio ordenado para las clases: actividades, materiales, correcciones y cuaderno, todo en un mismo lugar.</p>
        <div className="hero-features">
          <div><ClipboardList />Actividades con estados y fechas</div>
          <div><MessageSquareText />Respuestas y correcciones con autor y fecha</div>
          <div><NotebookTabs />Cuaderno digital con fotos y apuntes</div>
        </div>
      </div>

      <div className="login-hero-compact">
        <div className="brand-mark"><BookOpen size={22} /></div>
        <strong>English Space</strong>
      </div>

      <div className="login-side">
        <form className="login" onSubmit={submit}>
          <div>
            <h1>Ingresar</h1>
            <p className="login-lead">Accedé con tu correo y contraseña.</p>
          </div>

          <label>Correo
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          <label>Contraseña
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" minLength={6} required />
          </label>

          {error && <p className="form-error">{error}</p>}
          <button disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
        </form>
      </div>
    </div>
  )
}
