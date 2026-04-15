import { NextResponse } from 'next/server'

type GeneratedQuestion = {
  prompt: string
  options: string[]
  correct_index: number
  explanation?: string
}

type NimChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string }
    text?: string
  }>
}

function extractJson(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

function normalizeQuestions(input: unknown): GeneratedQuestion[] | null {
  if (!Array.isArray(input)) return null
  const out: GeneratedQuestion[] = []
  for (const item of input) {
    if (typeof item !== 'object' || item === null) return null
    const q = item as Record<string, unknown>
    const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : ''
    const optionsRaw = Array.isArray(q.options) ? q.options : null
    const correctIndex =
      typeof q.correct_index === 'number' ? q.correct_index : -1
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

    out.push({ prompt, options, correct_index: correctIndex, explanation })
  }
  return out
}

export async function POST(request: Request) {
  const apiKey = process.env.NVIDIA_NIM_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing NVIDIA_NIM_API_KEY' },
      { status: 500 },
    )
  }

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
  const countRaw = typeof body?.count === 'number' ? body.count : 5
  const count = Math.max(1, Math.min(10, Math.floor(countRaw)))
  const difficulty =
    typeof body?.difficulty === 'string' ? body.difficulty.trim() : ''

  if (!topic) {
    return NextResponse.json({ error: 'Missing topic' }, { status: 400 })
  }

  const baseUrl = process.env.NVIDIA_NIM_BASE_URL ?? 'https://integrate.api.nvidia.com/v1'
  const model = process.env.NVIDIA_NIM_MODEL ?? 'nvidia/nemotron-mini-4b-instruct'

  const system = [
    'Eres un generador de preguntas de trivia bíblica para un juego móvil.',
    'Devuelve SOLO JSON válido (sin markdown, sin texto extra).',
    'Formato exacto:',
    '{"questions":[{"prompt":"...","options":["..."],"correct_index":0,"explanation":"..."}]}',
    'Reglas:',
    '- Idioma: español.',
    '- options debe tener 4 opciones distintas (strings).',
    '- correct_index debe ser un entero entre 0 y 3.',
    '- No inventes citas bíblicas; si no estás seguro, formula la pregunta de manera general.',
  ].join('\n')

  const user = [
    `Tema: ${topic}`,
    difficulty ? `Dificultad: ${difficulty}` : '',
    `Cantidad: ${count}`,
    'Genera preguntas claras con 4 opciones.',
  ]
    .filter(Boolean)
    .join('\n')

  const nimResponse = await fetch(new URL('/chat/completions', baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 1200,
      stream: false,
    }),
  })

  if (!nimResponse.ok) {
    const text = await nimResponse.text().catch(() => '')
    return NextResponse.json(
      { error: `NIM request failed (${nimResponse.status})`, details: text },
      { status: 502 },
    )
  }

  const payload = (await nimResponse.json()) as NimChatCompletionResponse
  const content =
    payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? ''

  let parsed: unknown = null
  try {
    parsed = JSON.parse(content)
  } catch {
    const extracted = extractJson(content)
    if (extracted) {
      try {
        parsed = JSON.parse(extracted)
      } catch {
        parsed = null
      }
    }
  }

  const obj =
    typeof parsed === 'object' && parsed !== null
      ? (parsed as { questions?: unknown })
      : null
  const questions = normalizeQuestions(obj?.questions)
  if (!questions) {
    return NextResponse.json(
      { error: 'Invalid model output', raw: content },
      { status: 502 },
    )
  }

  return NextResponse.json({ questions })
}
