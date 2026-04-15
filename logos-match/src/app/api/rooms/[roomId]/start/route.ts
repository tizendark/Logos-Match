import { NextResponse } from 'next/server'

import { dbSelect, dbUpdate, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room } from '@/lib/models/quiz'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null
    const hostToken = typeof body?.hostToken === 'string' ? body.hostToken : ''
    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
    }

    const auth = getInsForgeServiceAuth()
    const { roomId } = await params

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await dbUpdate<Room | Room[]>(
      auth,
      'rooms',
      { status: 'playing' },
      { id: `eq.${roomId}` },
    )
    const nextRoom = Array.isArray(updated) ? updated[0] : updated

    return NextResponse.json({ room: nextRoom })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

