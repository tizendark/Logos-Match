import { NextResponse } from 'next/server'
import { getInsForgeServiceAuth } from '@/lib/insforgeDb'

// Este endpoint puede ser llamado por un servicio externo (cron-job.org, UptimeRobot, Vercel Cron, etc.)
// para hacer un simple "ping" a la base de datos de InsForge y evitar que el proyecto entre en pausa por inactividad.
export async function GET() {
  try {
    const auth = getInsForgeServiceAuth()
    
    // Hacemos una petición muy ligera a una tabla existente, pidiendo solo 1 registro y sin contenido real
    // para mantener la DB "despierta" consumiendo lo mínimo posible.
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const url = new URL('/rest/v1/rooms', baseUrl)
    url.searchParams.set('select', 'id')
    url.searchParams.set('limit', '1')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
        Authorization: `Bearer ${auth.token}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`DB Ping failed: ${response.status} ${response.statusText}`)
    }

    return NextResponse.json({ ok: true, message: 'InsForge Database is awake', timestamp: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
