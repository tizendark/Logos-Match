import { NextResponse } from 'next/server'

import { dbInsert, dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room, RoomPlayer } from '@/lib/models/quiz'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  }

  const auth = getInsForgeServiceAuth()
  const { roomId } = await params

  const rooms = await dbSelect<Room>(auth, 'rooms', {
    select: 'id',
    id: `eq.${roomId}`,
    limit: '1',
  })
  if (!rooms[0]) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const created = await dbInsert<RoomPlayer | RoomPlayer[]>(
    auth,
    'room_players',
    { room_id: roomId, name },
    { select: '*' },
  )
  const player = Array.isArray(created) ? created[0] : created

  return NextResponse.json({ playerId: player.id })
}
