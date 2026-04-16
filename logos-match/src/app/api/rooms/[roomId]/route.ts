import { NextResponse } from 'next/server'

import { dbDelete, dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params
    const body = await request.json().catch(() => ({}))
    const hostToken = body?.hostToken

    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
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

    // Delete the room. Thanks to "on delete cascade" in SQL, players and questions will be deleted too.
    await dbDelete(auth, 'rooms', { id: `eq.${roomId}` })

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
