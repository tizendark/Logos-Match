import { NextResponse } from 'next/server'

import { dbSelect, dbUpdate, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room, RoomPlayer } from '@/lib/models/quiz'

export async function GET(
  _: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const auth = getInsForgeServiceAuth()
    const { roomId } = await params

    const rooms = await dbSelect<Room>(auth, 'rooms', {
      select: '*',
      id: `eq.${roomId}`,
      limit: '1',
    })
    const room = rooms[0] ?? null

    const cutoff = new Date(Date.now() - 90_000).toISOString()
    try {
      await dbUpdate(
        auth,
        'room_players',
        { status: 'disconnected' },
        {
          room_id: `eq.${roomId}`,
          status: 'eq.connected',
          last_seen_at: `lt.${cutoff}`,
        },
      )
    } catch {}

    const players = await dbSelect<RoomPlayer>(auth, 'room_players', {
      select: '*',
      room_id: `eq.${roomId}`,
      status: 'eq.connected',
      order: 'created_at.asc',
    })

    return NextResponse.json({ room, players })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
