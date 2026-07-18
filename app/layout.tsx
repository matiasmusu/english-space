import './globals.css'
import { Inter } from 'next/font/google'
import AppShell from '@/components/AppShell'

const inter = Inter({ subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: 'English Space',
  description: 'Espacio colaborativo para clases de inglés'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.className}>
      <body><AppShell>{children}</AppShell></body>
    </html>
  )
}
