import { NextResponse } from 'next/server'

import { dbUpdate, dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room } from '@/lib/models/quiz'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null

    const hostToken = typeof body?.hostToken === 'string' ? body.hostToken : ''
    const scores = body?.scores

    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
    }
    if (typeof scores !== 'object' || scores === null) {
      return NextResponse.json({ error: 'Missing scores' }, { status: 400 })
    }

    const auth = getInsForgeServiceAuth()

    const rooms = await dbSelect<Room>(auth, 'rooms', {
      select: 'id, host_token',
      id: `eq.${roomId}`,
      limit: '1',
    })
    const room = rooms[0]
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    if (room.host_token !== hostToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Terminar la sala
    await dbUpdate(
      auth,
      'rooms',
      { status: 'ended' },
      { id: `eq.${roomId}` },
    )

    // Actualizar scores en batch
    // Nota: PostgREST permite PATCH en masa con JSON array o actualizando individualmente.
    // Como las APIs de InsForge son idénticas a Supabase, haremos updates individuales por simplicidad
    // en este MVP (idealmente se haría un upsert en masa).
    const scoreEntries = Object.entries(scores as Record<string, number>)
    await Promise.all(
      scoreEntries.map(([playerId, score]) =>
        dbUpdate(
          auth,
          'room_players',
          { score },
          { id: `eq.${playerId}` }
        )
      )
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
