import { NextResponse } from 'next/server'

import { dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { QuestionTemplate, TemplateQuestion } from '@/lib/models/quiz'

type Params = {
  params: Promise<{ templateId: string }>
}

export async function GET(_: Request, { params }: Params) {
  try {
    const { templateId } = await params
    const auth = getInsForgeServiceAuth()

    const templates = await dbSelect<QuestionTemplate>(
      auth,
      'question_templates',
      {
        select: '*',
        id: `eq.${templateId}`,
        limit: '1',
      },
    )
    const template = templates[0] ?? null

    const questions = await dbSelect<TemplateQuestion>(
      auth,
      'template_questions',
      {
        select: '*',
        template_id: `eq.${templateId}`,
        order: 'created_at.asc',
      },
    )

    return NextResponse.json({ template, questions })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
