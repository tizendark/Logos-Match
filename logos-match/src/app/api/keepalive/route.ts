import { NextResponse } from 'next/server'
import { getInsForgeServiceAuth, dbSelect } from '@/lib/insforgeDb'

// Este endpoint puede ser llamado por un servicio externo (cron-job.org, UptimeRobot, Vercel Cron, etc.)
// para hacer un simple "ping" a la base de datos de InsForge y evitar que el proyecto entre en pausa por inactividad.
export async function GET() {
  try {
    const auth = getInsForgeServiceAuth()
    
    // Hacemos una petición muy ligera a una tabla existente usando el helper interno dbSelect
    // pidiendo solo 1 registro y sin contenido real para mantener la DB "despierta" consumiendo lo mínimo posible.
    await dbSelect(auth, 'rooms', {
      select: 'id',
      limit: '1',
    })

    return NextResponse.json({ ok: true, message: 'InsForge Database is awake', timestamp: new Date().toISOString() })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
