import { NextResponse } from 'next/server'

import { dbInsert, dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room, RoomPlayer } from '@/lib/models/quiz'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null

  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!code || !name) {
    return NextResponse.json({ error: 'Missing code or name' }, { status: 400 })
  }

  const auth = getInsForgeServiceAuth()

  const rooms = await dbSelect<Room>(auth, 'rooms', {
    select: '*',
    code: `eq.${code}`,
    limit: '1',
  })
  const room = rooms[0]
  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const created = await dbInsert<RoomPlayer | RoomPlayer[]>(
    auth,
    'room_players',
    { room_id: room.id, name },
    { select: '*' },
  )
  const player = Array.isArray(created) ? created[0] : created

  return NextResponse.json({ roomId: room.id, playerId: player.id })
}

