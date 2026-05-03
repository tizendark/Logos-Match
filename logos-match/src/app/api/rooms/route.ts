import { NextResponse } from 'next/server'

import { dbInsert, dbSelect, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import { DEFAULT_GAME_CONFIG, type GameConfig } from '@/lib/gameConfig'
import type {
  CustomQuiz,
  CustomQuizQuestion,
  QuizDraftQuestion,
  Room,
  TemplateQuestion,
} from '@/lib/models/quiz'
import { generateRoomCode } from '@/lib/roomCode'

function normalizeQuestions(input: unknown): QuizDraftQuestion[] | null {
  if (!Array.isArray(input)) return null
  const out: QuizDraftQuestion[] = []

  for (const item of input) {
    if (typeof item !== 'object' || item === null) return null
    const q = item as Record<string, unknown>
    const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : ''
    const optionsRaw = Array.isArray(q.options) ? q.options : null
    const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : -1
    const explanation =
      typeof q.explanation === 'string' ? q.explanation.trim() : undefined

    if (!prompt) return null
    if (!optionsRaw) return null

    const options = optionsRaw
      .filter((x) => typeof x === 'string')
      .map((x) => (x as string).trim())
      .filter(Boolean)

    if (options.length < 2 || options.length > 6) return null
    if (!Number.isInteger(correctIndex)) return null
    if (correctIndex < 0 || correctIndex >= options.length) return null

    out.push({ prompt, options, correctIndex, explanation })
  }

  return out
}

function normalizeGameConfig(input: unknown): GameConfig {
  if (!input || typeof input !== 'object') return DEFAULT_GAME_CONFIG
  return input as GameConfig
}

async function createRoom(auth: ReturnType<typeof getInsForgeServiceAuth>, data: {
  hostToken: string
  gameConfig: GameConfig
}) {
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode(6)
    try {
      const created = await dbInsert<Room | Room[]>(
        auth,
        'rooms',
        {
          code,
          host_token: data.hostToken,
          status: 'lobby',
          game_config: data.gameConfig,
        },
        { select: '*' },
      )
      const room = Array.isArray(created) ? created[0] : created
      return { room, code }
    } catch (error) {
      if (i === 4) throw error
    }
  }
  throw new Error('Failed to create room')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null

    const mode = typeof body?.mode === 'string' ? body.mode : ''
    const hostToken = typeof body?.hostToken === 'string' ? body.hostToken : ''
    const templateId = typeof body?.templateId === 'string' ? body.templateId : ''
    const quizRaw = body?.quiz
    const gameConfig = normalizeGameConfig(body?.gameConfig)

    if (!hostToken) {
      return NextResponse.json({ error: 'Missing hostToken' }, { status: 400 })
    }
    if (mode !== 'template' && mode !== 'custom') {
      return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
    }

    const auth = getInsForgeServiceAuth()

    const sourceType: 'template' | 'custom' = mode
    let sourceId: string | null = null
    let questions: Array<{
      prompt: string
      options: string[]
      correct_index: number
      explanation?: string | null
    }> = []

    if (mode === 'template') {
      if (!templateId) {
        return NextResponse.json(
          { error: 'Missing templateId' },
          { status: 400 },
        )
      }

      const templateQuestions = await dbSelect<TemplateQuestion>(
        auth,
        'template_questions',
        {
          select: '*',
          template_id: `eq.${templateId}`,
          order: 'created_at.asc',
        },
      )

      sourceId = templateId
      questions = templateQuestions.map((q) => ({
        prompt: q.prompt,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
      }))
    }

    if (mode === 'custom') {
      if (typeof quizRaw !== 'object' || quizRaw === null) {
        return NextResponse.json({ error: 'Missing quiz' }, { status: 400 })
      }
      const quiz = quizRaw as Record<string, unknown>
      const title = typeof quiz.title === 'string' ? quiz.title.trim() : ''
      const draftQuestions = normalizeQuestions(quiz.questions)
      if (!title || !draftQuestions || draftQuestions.length === 0) {
        return NextResponse.json({ error: 'Invalid quiz' }, { status: 400 })
      }

      const createdQuiz = await dbInsert<CustomQuiz | CustomQuiz[]>(
        auth,
        'custom_quizzes',
        { title, host_token: hostToken },
        { select: '*' },
      )
      const customQuiz = Array.isArray(createdQuiz) ? createdQuiz[0] : createdQuiz
      sourceId = customQuiz.id

      const payload = draftQuestions.map((q) => ({
        quiz_id: customQuiz.id,
        prompt: q.prompt,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation ?? null,
      }))

      const createdQuestions = await dbInsert<CustomQuizQuestion[]>(
        auth,
        'custom_quiz_questions',
        payload,
        { select: '*' },
      )

      questions = createdQuestions.map((q) => ({
        prompt: q.prompt,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
      }))
    }

    const { room, code } = await createRoom(auth, { hostToken, gameConfig })

    const gameQuestionPayload = questions.map((q, index) => ({
      room_id: room.id,
      source_type: sourceType,
      source_id: sourceId,
      prompt: q.prompt,
      options: q.options,
      correct_index: q.correct_index,
      order_index: index,
    }))

    await dbInsert(auth, 'game_questions', gameQuestionPayload, { select: '*' })

    return NextResponse.json({ roomId: room.id, code })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
