import { NextResponse } from 'next/server'

import { dbUpdate, dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room } from '@/lib/models/quiz'

export async function PATCH(
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
    const currentState = body?.state

    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
    }
    if (currentState === undefined) {
      return NextResponse.json({ error: 'Missing state' }, { status: 400 })
    }

    const auth = getInsForgeServiceAuth()

    // Validate Host
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

    // Update Room State
    const updated = await dbUpdate<Room | Room[]>(
      auth,
      'rooms',
      { current_state: currentState },
      { id: `eq.${roomId}` },
    )
    const result = Array.isArray(updated) ? updated[0] : updated

    return NextResponse.json({ ok: true, room: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
