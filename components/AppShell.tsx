'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ClipboardList, Home, Languages, LogOut } from 'lucide-react'
import { StoreProvider, useStore } from '@/lib/store'

const items = [
  ['/', 'Inicio', Home],
  ['/activities', 'Actividades', ClipboardList],
  ['/vocabulary', 'Vocabulario', Languages],
  ['/materials', 'Materiales', BookOpen]
] as const

function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const { currentUser, loading, error, notice, clearNotice, signOut } = useStore()

  if (path === '/login') return <>{children}</>
  if (loading) return <div className="center-screen">Cargando English Space…</div>
  if (!currentUser) return null

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><BookOpen size={22} /></div>
          <div>
            <strong>English Space</strong>
            <span>Clases de inglés</span>
          </div>
        </div>
        <nav>
          {items.map(([href, label, Icon]) => (
            <Link
              className={path === href || (href !== '/' && path.startsWith(href)) ? 'active' : ''}
              href={href}
              key={href}
            >
              <Icon size={19} />{label}
            </Link>
          ))}
        </nav>
        <div className="profile">
          <div className="avatar">{currentUser.name[0]?.toUpperCase()}</div>
          <div>
            <strong>{currentUser.name}</strong>
            <span>{currentUser.role === 'teacher' ? 'Profesora' : 'Alumno'}</span>
          </div>
          <button className="logout-button" onClick={() => signOut()}>
            <LogOut size={16} />Salir
          </button>
        </div>
      </aside>
      <main>
        {error && <div className="error-banner">{error}</div>}
        {children}
        {notice && (
          <div className={`toast ${notice.type}`} role="status" onClick={clearNotice}>
            {notice.text}
          </div>
        )}
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <StoreProvider><Shell>{children}</Shell></StoreProvider>
}
