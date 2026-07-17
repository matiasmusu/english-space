import './globals.css'
import AppShell from '@/components/AppShell'
export const metadata = { title:'English Space', description:'Espacio compartido de inglés' }
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="es"><body><AppShell>{children}</AppShell></body></html> }
