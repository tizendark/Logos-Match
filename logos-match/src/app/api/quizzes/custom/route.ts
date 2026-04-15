import { NextResponse } from 'next/server'

import { dbInsert, getInsForgeServiceAuth } from '@/lib/insforgeDb'
import type { CustomQuiz, CustomQuizQuestion, QuizDraftQuestion } from '@/lib/models/quiz'

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

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null

  const hostToken = typeof body?.hostToken === 'string' ? body.hostToken : ''
  const title = typeof body?.title === 'string' ? body.title.trim() : ''
  const questions = normalizeQuestions(body?.questions)

  if (!hostToken || !title || !questions || questions.length === 0) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 },
    )
  }

  const auth = getInsForgeServiceAuth()

  const createdQuiz = await dbInsert<CustomQuiz | CustomQuiz[]>(
    auth,
    'custom_quizzes',
    { title, host_token: hostToken },
    { select: '*' },
  )
  const quiz = Array.isArray(createdQuiz) ? createdQuiz[0] : createdQuiz

  const payload = questions.map((q) => ({
    quiz_id: quiz.id,
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

  return NextResponse.json({ quiz, questions: createdQuestions })
}

