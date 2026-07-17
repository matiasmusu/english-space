'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'

export default function Login() {
  const { signIn, loading } = useStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'student' | 'teacher'>('student')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
        return
      }

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, accessCode })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear la cuenta.')

      setMessage('Cuenta creada. Ya podés ingresar con tu correo y contraseña.')
      setMode('login')
      setName('')
      setAccessCode('')
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error.')
    } finally {
      setSubmitting(false)
    }
  }

  const busy = loading || submitting

  return (
    <div className="page narrow">
      <form className="panel login" onSubmit={submit}>
        <h1>English Space</h1>
        <p>Espacio colaborativo de Matías y Romina.</p>

        <div className="auth-tabs">
          <button type="button" className={mode === 'login' ? '' : 'secondary'} onClick={() => { setMode('login'); setError(''); setMessage('') }}>
            Ingresar
          </button>
          <button type="button" className={mode === 'register' ? '' : 'secondary'} onClick={() => { setMode('register'); setError(''); setMessage('') }}>
            Crear cuenta
          </button>
        </div>

        {mode === 'register' && (
          <>
            <label>Nombre
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Matías o Romina" required />
            </label>
            <label>Perfil
              <select value={role} onChange={e => setRole(e.target.value as 'student' | 'teacher')}>
                <option value="student">Alumno</option>
                <option value="teacher">Profesora</option>
              </select>
            </label>
          </>
        )}

        <label>Correo
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </label>
        <label>Contraseña
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required />
        </label>

        {mode === 'register' && (
          <label>Código privado del espacio
            <input type="password" value={accessCode} onChange={e => setAccessCode(e.target.value)} required />
            <small>Usen el mismo código que configuraste al publicar la web.</small>
          </label>
        )}

        {error && <p className="form-error">{error}</p>}
        {message && <p className="form-success">{message}</p>}
        <button disabled={busy}>{busy ? 'Procesando…' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</button>
      </form>
    </div>
  )
}
