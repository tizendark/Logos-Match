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
  const playerId = typeof body?.playerId === 'string' ? body.playerId.trim() : ''
  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 })
  }
  if (!name && !playerId) {
    return NextResponse.json(
      { error: 'Missing name or playerId' },
      { status: 400 },
    )
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

  if (playerId) {
    const existingPlayers = await dbSelect<RoomPlayer>(auth, 'room_players', {
      select: '*',
      id: `eq.${playerId}`,
      room_id: `eq.${room.id}`,
      limit: '1',
    })
    const existing = existingPlayers[0]
    if (existing) {
      await dbUpdate(
        auth,
        'room_players',
        { status: 'connected', last_seen_at: new Date().toISOString() },
        { id: `eq.${playerId}` },
      )
      return NextResponse.json({
        roomId: room.id,
        playerId: existing.id,
        name: existing.name,
      })
    }
    if (!name) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 })
    }
  }

  const connected = await dbSelect<RoomPlayer>(auth, 'room_players', {
    select: 'id',
    room_id: `eq.${room.id}`,
    status: 'eq.connected',
    limit: '2',
  })
  if (connected.length >= 2) {
    return NextResponse.json(
      { error: 'La sala ya está llena (máximo 2 jugadores).' },
      { status: 409 },
    )
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
