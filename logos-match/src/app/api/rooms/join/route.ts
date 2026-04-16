import { NextResponse } from 'next/server'

import { dbInsert, dbUpdate, dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room, RoomPlayer } from '@/lib/models/quiz'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null

  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const existingPlayerId = typeof body?.playerId === 'string' ? body.playerId.trim() : null

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
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

  if (existingPlayerId) {
    // Intentar reconectar
    const existingPlayers = await dbSelect<RoomPlayer>(auth, 'room_players', {
      select: '*',
      id: `eq.${existingPlayerId}`,
      room_id: `eq.${room.id}`,
      limit: '1',
    })
    const existingPlayer = existingPlayers[0]

    if (existingPlayer) {
      // Reconectar jugador
      await dbUpdate(
        auth,
        'room_players',
        { status: 'connected', last_seen_at: new Date().toISOString() },
        { id: `eq.${existingPlayerId}` }
      )
      return NextResponse.json({ roomId: room.id, playerId: existingPlayer.id, name: existingPlayer.name })
    }
  }

  if (!name) {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 })
  }

  const created = await dbInsert<RoomPlayer | RoomPlayer[]>(
    auth,
    'room_players',
    { room_id: room.id, name, status: 'connected', last_seen_at: new Date().toISOString() },
    { select: '*' },
  )
  const player = Array.isArray(created) ? created[0] : created

  return NextResponse.json({ roomId: room.id, playerId: player.id, name: player.name })
}

