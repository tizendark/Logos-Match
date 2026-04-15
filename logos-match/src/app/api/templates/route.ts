import { NextResponse } from 'next/server'

import { dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { QuestionTemplate } from '@/lib/models/quiz'

export async function GET() {
  const auth = getInsForgeServiceAuth()
  const templates = await dbSelect<QuestionTemplate>(auth, 'question_templates', {
    select: '*',
    is_published: 'eq.true',
    order: 'created_at.desc',
  })

  return NextResponse.json({ templates })
}

