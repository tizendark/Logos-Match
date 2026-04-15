import { NextResponse } from 'next/server'

import { dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { QuestionTemplate } from '@/lib/models/quiz'

export async function GET() {
  try {
    const auth = getInsForgeServiceAuth()
    const templates = await dbSelect<QuestionTemplate>(
      auth,
      'question_templates',
      {
        select: '*',
        is_published: 'eq.true',
        order: 'created_at.desc',
      },
    )

    return NextResponse.json({ templates })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
