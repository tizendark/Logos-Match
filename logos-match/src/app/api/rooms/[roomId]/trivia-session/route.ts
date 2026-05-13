import { NextResponse } from 'next/server'

import { dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { QuestionTemplate, TemplateQuestion, Room } from '@/lib/models/quiz'

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

    const templates = await dbSelect<QuestionTemplate>(auth, 'question_templates', {
      select: 'id,title,category,is_published',
      is_published: 'eq.true',
      order: 'created_at.desc',
      limit: '50',
    })

    const byCategory = new Map<string, QuestionTemplate[]>()
    for (const t of templates) {
      const key = (t.category ?? 'General').trim() || 'General'
      byCategory.set(key, [...(byCategory.get(key) ?? []), t])
    }

    const categories = shuffle(Array.from(byCategory.keys()))
    const pickedTemplates: QuestionTemplate[] = []
    for (const cat of categories) {
      const group = byCategory.get(cat) ?? []
      const candidate = shuffle(group)[0]
      if (candidate) pickedTemplates.push(candidate)
      if (pickedTemplates.length >= Math.min(target, 8)) break
    }

    const fallbackTemplates = shuffle(templates).slice(0, 8)
    for (const t of fallbackTemplates) {
      if (pickedTemplates.find((x) => x.id === t.id)) continue
      pickedTemplates.push(t)
      if (pickedTemplates.length >= 8) break
    }

    const questionsByTemplate = new Map<string, { category: string; questions: TemplateQuestion[] }>()
    for (const t of pickedTemplates) {
      const qs = await dbSelect<TemplateQuestion>(auth, 'template_questions', {
        select: 'prompt,options,correct_index,explanation,template_id',
        template_id: `eq.${t.id}`,
        order: 'created_at.asc',
        limit: '50',
      })
      questionsByTemplate.set(t.id, {
        category: t.category ?? 'General',
        questions: shuffle(qs),
      })
    }

    const result: Array<{
      prompt: string
      options: string[]
      correct_index: number
      explanation?: string | null
      category?: string | null
    }> = []

    const templateCycle = shuffle(Array.from(questionsByTemplate.entries()))
    let safety = 0
    while (result.length < target && safety < 200) {
      safety++
      for (const [templateId, entry] of templateCycle) {
        const pool = entry.questions
        const q = pool.shift()
        if (!q) continue
        result.push({
          prompt: q.prompt,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation,
          category: entry.category,
        })
        if (result.length >= target) break
      }
      if (templateCycle.every(([, e]) => e.questions.length === 0)) break
    }

    if (result.length < target) {
      const allPool: Array<{
        prompt: string
        options: string[]
        correct_index: number
        explanation?: string | null
        category?: string | null
      }> = []
      for (const [, entry] of templateCycle) {
        for (const q of entry.questions) {
          allPool.push({
            prompt: q.prompt,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation,
            category: entry.category,
          })
        }
      }
      for (const q of shuffle(allPool)) {
        if (result.length >= target) break
        result.push(q)
      }
    }

    return NextResponse.json({ questions: result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
