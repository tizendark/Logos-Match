import { NextResponse } from 'next/server'

import { generateHostToken } from '@/lib/roomCode'

export async function POST() {
  return NextResponse.json({ hostToken: generateHostToken() })
}

