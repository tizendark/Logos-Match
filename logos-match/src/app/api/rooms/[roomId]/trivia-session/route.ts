import { NextResponse } from 'next/server'

import { dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { GameQuestion, Room } from '@/lib/models/quiz'

function shuffle<T>(items: T[]) {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

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
    const count = typeof body?.count === 'number' ? Math.floor(body.count) : 0
    const target = Math.max(1, Math.min(15, count || 0))

    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
    }
    if (!target) {
      return NextResponse.json({ error: 'Missing count' }, { status: 400 })
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pool = await dbSelect<GameQuestion>(auth, 'game_questions', {
      select: 'prompt,options,correct_index',
      room_id: `eq.${roomId}`,
      order: 'order_index.asc',
      limit: '200',
    })
    if (!pool.length) {
      return NextResponse.json({ error: 'No questions in room' }, { status: 404 })
    }

    const result: Array<{
      prompt: string
      options: string[]
      correct_index: number
    }> = []

    for (const q of shuffle(pool).slice(0, target)) {
      result.push({ prompt: q.prompt, options: q.options, correct_index: q.correct_index })
    }

    return NextResponse.json({ questions: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
