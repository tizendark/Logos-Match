import { NextResponse } from 'next/server'

import { dbSelect, dbUpdate, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { Room } from '@/lib/models/quiz'

export async function POST(
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
    const durationMs =
      typeof body?.durationMs === 'number' ? Math.max(0, body.durationMs) : 0

    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
    }
    if (!durationMs) {
      return NextResponse.json({ error: 'Missing durationMs' }, { status: 400 })
    }

    const auth = getInsForgeServiceAuth()

    const rooms = await dbSelect<Room>(auth, 'rooms', {
      select: 'id, host_token, current_state',
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

    const timerStartTimestamp = Date.now()
    const currentState =
      room.current_state && typeof room.current_state === 'object'
        ? (room.current_state as Record<string, unknown>)
        : {}

    const nextState = {
      ...currentState,
      timerStartTimestamp,
      timerDurationMs: durationMs,
    }

    await dbUpdate(auth, 'rooms', { current_state: nextState }, { id: `eq.${roomId}` })

    return NextResponse.json({ timerStartTimestamp, timerDurationMs: durationMs })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
