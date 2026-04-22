'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { useHostToken } from '@/hooks/useHostToken'
import { useGameSounds } from '@/hooks/useGameSounds'
import type { QuestionTemplate } from '@/lib/models/quiz'

export default function HostTemplatesPage() {
  const router = useRouter()
  const hostToken = useHostToken()
  const [isPending, startTransition] = useTransition()
  const [templates, setTemplates] = useState<QuestionTemplate[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const { playClick } = useGameSounds()

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
    playClick()
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
    <div className="flex flex-1 flex-col items-center bg-stone-50 px-4 py-10 text-slate-900">
      <main className="w-full max-w-md space-y-6">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-stone-100">
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">
            Elegir plantilla
          </h1>
          <p className="mt-2 text-base text-stone-600">
            Selecciona un set predefinido y crea la sala en segundos.
          </p>
        </div>

        <div className="space-y-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-2xl bg-white p-6 shadow-md border border-stone-100 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">{t.title}</h2>
                  <p className="mt-1 text-sm font-medium text-amber-600">
                    {t.category ?? 'Sin categoría'}
                    {t.difficulty ? ` • ${t.difficulty}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-600 transition-all shadow-sm disabled:opacity-60"
                  onClick={() => createRoomFromTemplate(t.id)}
                  disabled={isPending || !hostToken}
                >
                  Crear sala
                </button>
              </div>
              {t.description ? (
                <p className="mt-4 text-sm text-stone-600 leading-relaxed">{t.description}</p>
              ) : null}
            </div>
          ))}
          {templates.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-stone-500 italic shadow-sm border border-stone-100">
              No hay plantillas disponibles todavía.
            </div>
          ) : null}
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-600">{error}</p> : null}
      </main>
    </div>
  )
}

