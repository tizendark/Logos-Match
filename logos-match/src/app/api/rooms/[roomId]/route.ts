import { NextResponse } from 'next/server'

import { dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
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

    const players = await dbSelect<RoomPlayer>(auth, 'room_players', {
      select: '*',
      room_id: `eq.${roomId}`,
      order: 'created_at.asc',
    })

    return NextResponse.json({ room, players })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
