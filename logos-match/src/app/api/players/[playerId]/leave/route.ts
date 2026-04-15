import { NextResponse } from 'next/server'

import { dbUpdate, getInsForgeServiceAuth } from '@/lib/insforgeDb'

export async function POST(
  _: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  try {
    const auth = getInsForgeServiceAuth()
    const { playerId } = await params

    await dbUpdate(
      auth,
      'room_players',
      { status: 'disconnected', last_seen_at: new Date().toISOString() },
      { id: `eq.${playerId}` },
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

