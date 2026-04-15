'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useHostToken } from '@/hooks/useHostToken'
import type { QuestionTemplate } from '@/lib/models/quiz'

export default function HostTemplatesPage() {
  const router = useRouter()
  const hostToken = useHostToken()
  const [isPending, startTransition] = useTransition()
  const [templates, setTemplates] = useState<QuestionTemplate[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/templates')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setTemplates(Array.isArray(data?.templates) ? data.templates : [])
      })
      .catch(() => {
        if (cancelled) return
        setError('No se pudieron cargar las plantillas')
      })
    return () => {
      cancelled = true
    }
  }, [])

  function createRoomFromTemplate(templateId: string) {
    if (!hostToken) return
    setError(null)
    startTransition(async () => {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ mode: 'template', templateId, hostToken }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setError(payload?.error ?? 'No se pudo crear la sala')
        return
      }

      const payload = (await response.json()) as { roomId: string }
      router.push(`/room/${payload.roomId}`)
    })
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <main className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">
            Elegir plantilla
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Selecciona un set predefinido y crea la sala en segundos.
          </p>
        </div>

        <div className="mt-4 space-y-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold">{t.title}</h2>
                  <p className="mt-1 text-xs text-zinc-600">
                    {t.category ?? 'Sin categoría'}
                    {t.difficulty ? ` • ${t.difficulty}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-zinc-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-60"
                  onClick={() => createRoomFromTemplate(t.id)}
                  disabled={isPending || !hostToken}
                >
                  Crear sala
                </button>
              </div>
              {t.description ? (
                <p className="mt-3 text-sm text-zinc-700">{t.description}</p>
              ) : null}
            </div>
          ))}
          {templates.length === 0 ? (
            <div className="rounded-2xl bg-white p-5 text-sm text-zinc-600 shadow-sm">
              No hay plantillas disponibles todavía.
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </main>
    </div>
  )
}

