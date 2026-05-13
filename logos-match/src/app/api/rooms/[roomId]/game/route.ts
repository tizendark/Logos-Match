import { NextResponse } from 'next/server'

import { dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { GameQuestion, Room, RoomPlayer } from '@/lib/models/quiz'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params
    const url = new URL(request.url)
    const hostToken = url.searchParams.get('hostToken')

    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
    }

    const auth = getInsForgeServiceAuth()

    const rooms = await dbSelect<Room>(auth, 'rooms', {
      select: '*',
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

    const players = await dbSelect<RoomPlayer>(auth, 'room_players', {
      select: '*',
      room_id: `eq.${roomId}`,
      status: 'eq.connected',
      order: 'created_at.asc',
    })

    const questions = await dbSelect<GameQuestion>(auth, 'game_questions', {
      select: '*',
      room_id: `eq.${roomId}`,
      order: 'order_index.asc',
    })

    return NextResponse.json({ room, players, questions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
