'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useHostToken } from '@/hooks/useHostToken'
import type { QuizDraftQuestion } from '@/lib/models/quiz'

type DraftQuestionState = {
  prompt: string
  options: string[]
  correctIndex: number
  explanation?: string
}

function newQuestion(): DraftQuestionState {
  return {
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  }
}

export default function HostCustomQuizPage() {
  const router = useRouter()
  const hostToken = useHostToken()
  const [isPending, startTransition] = useTransition()

  const [title, setTitle] = useState('Quiz personalizado')
  const [questions, setQuestions] = useState<DraftQuestionState[]>([newQuestion()])
  const [error, setError] = useState<string | null>(null)

  const canCreate = useMemo(() => {
    if (!hostToken) return false
    if (!title.trim()) return false
    if (questions.length === 0) return false
    for (const q of questions) {
      const opts = q.options.map((o) => o.trim()).filter(Boolean)
      if (!q.prompt.trim()) return false
      if (opts.length < 2 || opts.length > 6) return false
      if (q.correctIndex < 0 || q.correctIndex >= opts.length) return false
    }
    return true
  }, [hostToken, title, questions])

  function updateQuestion(index: number, patch: Partial<DraftQuestionState>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    )
  }

  function updateOption(qIndex: number, optIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const options = q.options.slice()
        options[optIndex] = value
        return { ...q, options }
      }),
    )
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, newQuestion()])
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  function addOption(qIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const trimmed = q.options.map((o) => o.trim()).filter(Boolean)
        if (trimmed.length >= 6) return q
        return { ...q, options: [...q.options, ''] }
      }),
    )
  }

  function removeOption(qIndex: number, optIndex: number) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const options = q.options.slice()
        options.splice(optIndex, 1)
        const cleaned = options.length >= 2 ? options : ['', '']
        const correctIndex = Math.min(q.correctIndex, cleaned.length - 1)
        return { ...q, options: cleaned, correctIndex }
      }),
    )
  }

  function normalizeForApi(q: DraftQuestionState): QuizDraftQuestion {
    const options = q.options.map((o) => o.trim()).filter(Boolean)
    return {
      prompt: q.prompt.trim(),
      options,
      correctIndex: q.correctIndex,
      explanation: q.explanation?.trim() || undefined,
    }
  }

  function createRoom() {
    if (!hostToken) return
    setError(null)
    startTransition(async () => {
      const payload = {
        mode: 'custom',
        hostToken,
        quiz: {
          title: title.trim(),
          questions: questions.map(normalizeForApi),
        },
      }

      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? 'No se pudo crear la sala')
        return
      }

      const data = (await response.json()) as { roomId: string }
      router.push(`/room/${data.roomId}`)
    })
  }

  function generateWithAi() {
    setError(null)
    const topic = window.prompt('Tema para generar preguntas (ej. Libro de Jonás):')
    if (!topic?.trim()) return
    const countRaw = window.prompt('¿Cuántas preguntas? (1-10)', '5') ?? '5'
    const count = Math.max(1, Math.min(10, Number.parseInt(countRaw, 10) || 5))

    startTransition(async () => {
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim(), count }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? 'No se pudo generar con IA')
        return
      }

      const data = (await response.json()) as {
        questions: Array<{
          prompt: string
          options: string[]
          correct_index: number
          explanation?: string
        }>
      }

      const generated: DraftQuestionState[] = (data.questions ?? []).map((q) => ({
        prompt: q.prompt,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation ?? '',
      }))

      if (generated.length === 0) {
        setError('La IA no devolvió preguntas')
        return
      }

      setQuestions((prev) => [...prev, ...generated])
    })
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-stone-50 px-4 py-10 text-slate-900">
      <main className="w-full max-w-md space-y-6">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-stone-100">
          <h1 className="text-2xl font-bold tracking-tight text-blue-950">
            Crear quiz personalizado
          </h1>
          <p className="mt-2 text-base text-stone-600">
            Agrega preguntas manualmente o genera sugerencias con IA.
          </p>

          <div className="mt-6 space-y-2">
            <label className="text-sm font-semibold text-slate-800">Título</label>
            <input
              className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-base font-semibold text-amber-950 hover:bg-amber-600 transition-all shadow-sm disabled:opacity-60"
              onClick={generateWithAi}
              disabled={isPending}
            >
              Generar con IA
            </button>
            <button
              type="button"
              className="flex-1 rounded-xl bg-white border border-stone-200 px-4 py-3 text-base font-semibold text-slate-800 hover:bg-stone-50 transition-all shadow-sm hover:shadow disabled:opacity-60"
              onClick={addQuestion}
              disabled={isPending}
            >
              + Pregunta
            </button>
          </div>
        </div>

        {questions.map((q, qIndex) => {
          const normalizedOptions = q.options.map((o) => o.trim()).filter(Boolean)
          const maxCorrectIndex = Math.max(0, normalizedOptions.length - 1)
          const correctIndex = Math.min(q.correctIndex, maxCorrectIndex)

          return (
            <div key={qIndex} className="rounded-2xl bg-white p-6 shadow-md border border-stone-100">
              <div className="flex items-center justify-between gap-3">
                <p className="text-lg font-bold text-blue-950">Pregunta {qIndex + 1}</p>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1 text-sm font-medium text-stone-600 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-60"
                  onClick={() => removeQuestion(qIndex)}
                  disabled={isPending || questions.length === 1}
                >
                  Quitar
                </button>
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Enunciado
                </label>
                <textarea
                  className="w-full resize-none rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                  rows={3}
                  value={q.prompt}
                  onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                  disabled={isPending}
                />
              </div>

              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-slate-800">
                    Opciones (2–6)
                  </label>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1 text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors disabled:opacity-60"
                    onClick={() => addOption(qIndex)}
                    disabled={isPending || normalizedOptions.length >= 6}
                  >
                    + Opción
                  </button>
                </div>

                <div className="space-y-3">
                  {q.options.map((opt, optIndex) => (
                    <div key={optIndex} className="flex gap-2">
                      <input
                        className="flex-1 rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                        value={opt}
                        onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                        disabled={isPending}
                        placeholder={`Opción ${optIndex + 1}`}
                      />
                      <button
                        type="button"
                        className="shrink-0 rounded-xl bg-white border border-stone-200 px-4 py-3 text-base font-bold text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm disabled:opacity-60"
                        onClick={() => removeOption(qIndex, optIndex)}
                        disabled={isPending || q.options.length <= 2}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Respuesta Correcta
                </label>
                <select
                  className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm bg-white"
                  value={correctIndex}
                  onChange={(e) =>
                    updateQuestion(qIndex, { correctIndex: Number(e.target.value) })
                  }
                  disabled={isPending || normalizedOptions.length < 2}
                >
                  {normalizedOptions.map((opt, i) => (
                    <option key={i} value={i}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-6 space-y-2">
                <label className="text-sm font-semibold text-slate-800">
                  Explicación (opcional)
                </label>
                <textarea
                  className="w-full resize-none rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                  rows={2}
                  value={q.explanation ?? ''}
                  onChange={(e) =>
                    updateQuestion(qIndex, { explanation: e.target.value })
                  }
                  disabled={isPending}
                />
              </div>
            </div>
          )
        })}

        <div className="rounded-2xl bg-white p-8 shadow-xl border border-stone-100">
          <button
            type="button"
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-base font-bold text-amber-950 hover:bg-amber-600 transition-all shadow-sm disabled:opacity-60"
            onClick={createRoom}
            disabled={!canCreate || isPending}
          >
            Crear sala con este quiz
          </button>
          {error ? <p className="mt-4 text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl">{error}</p> : null}
          {!hostToken ? (
            <p className="mt-4 text-sm text-stone-600 text-center animate-pulse">
              Inicializando sesión de Host…
            </p>
          ) : null}
        </div>
      </main>
    </div>
  )
}

