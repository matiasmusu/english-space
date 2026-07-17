'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ClipboardList, Home, NotebookTabs, Users, LogOut } from 'lucide-react'
import { StoreProvider, useStore } from '@/lib/store'
const items=[['/','Inicio',Home],['/activities','Actividades',ClipboardList],['/materials','Materiales',BookOpen],['/notebook','Cuaderno',NotebookTabs],['/history','Historial',Users]] as const
function Shell({children}:{children:React.ReactNode}){const path=usePathname();const {currentUser,loading,error,signOut}=useStore();if(path==='/login')return <>{children}</>;if(loading)return <div className="center-screen">Cargando English Space…</div>;if(!currentUser)return null;return <div className="shell"><aside className="sidebar"><div className="brand"><BookOpen size={28}/><div><strong>English Space</strong><span>Espacio colaborativo</span></div></div><nav>{items.map(([href,label,Icon])=><Link className={path===href||href!=='/'&&path.startsWith(href)?'active':''} href={href} key={href}><Icon size={19}/>{label}</Link>)}</nav><div className="profile"><div className="avatar">{currentUser.name[0]}</div><div><strong>{currentUser.name}</strong><span>{currentUser.role==='teacher'?'Profesora':'Alumno'}</span></div><button className="icon-button" title="Cerrar sesión" onClick={()=>signOut()}><LogOut size={18}/></button></div></aside><main>{error&&<div className="error-banner">{error}</div>}{children}</main></div>}
export default function AppShell({children}:{children:React.ReactNode}){return <StoreProvider><Shell>{children}</Shell></StoreProvider>}
