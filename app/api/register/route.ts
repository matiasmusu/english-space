import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { name, email, password, role, accessCode } = await request.json()

    if (!name || !email || !password || !accessCode) {
      return NextResponse.json({ error: 'Completá todos los campos.' }, { status: 400 })
    }

    if (accessCode !== process.env.REGISTRATION_CODE) {
      return NextResponse.json({ error: 'El código de acceso no es correcto.' }, { status: 403 })
    }

    if (!['student', 'teacher'].includes(role)) {
      return NextResponse.json({ error: 'El tipo de perfil no es válido.' }, { status: 400 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    if (!url || !key) {
      return NextResponse.json({ error: 'Falta configurar Supabase.' }, { status: 500 })
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false }
    })

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name.trim(),
          role
        }
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'No se pudo crear la cuenta.' }, { status: 500 })
  }
}
