'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('logosmatch_player_session')
        if (stored) {
          const parsed = JSON.parse(stored)
          return parsed.code || ''
        }
      } catch {
        return ''
      }
    }
    return ''
  })
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  
  // Inicializar estado leyendo sincrónicamente de localStorage (Next.js client-side only workaround)
  const [recentSession, setRecentSession] = useState<{
    code: string
    playerId: string
    name: string
  } | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('logosmatch_player_session')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.code && parsed.playerId && parsed.name) {
            return parsed
          }
        }
      } catch {
        return null
      }
    }
    return null
  })

  function onJoin(isReconnect = false) {
    setError(null)
    startTransition(async () => {
      const payload: Record<string, string> = { code: code.trim() }
      
      if (isReconnect && recentSession) {
        payload.playerId = recentSession.playerId
      } else {
        payload.name = name.trim()
      }

      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(data?.error ?? 'No se pudo unir a la sala')
        if (isReconnect) {
          // Si la reconexión falló (sala expiró, etc), limpiamos la sesión
          localStorage.removeItem('logosmatch_player_session')
          setRecentSession(null)
        }
        return
      }

      const data = (await response.json()) as { roomId: string; playerId: string, name: string }
      
      // Guardar sesión para futuras reconexiones
      localStorage.setItem('logosmatch_player_session', JSON.stringify({
        code: code.trim(),
        playerId: data.playerId,
        name: data.name
      }))

      router.push(`/room/${data.roomId}?playerId=${data.playerId}`)
    })
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-4 py-10 text-slate-900">
      <main className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-stone-100">
        <h1 className="text-4xl font-bold tracking-tight text-blue-950">Logos Match</h1>
        <p className="mt-2 text-base text-stone-600 leading-relaxed">
          Crea una sala como Host o únete con un código.
        </p>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-base font-semibold text-amber-950 hover:bg-amber-600 transition-colors shadow-sm disabled:opacity-60"
            onClick={() => router.push('/host')}
            disabled={isPending}
          >
            Crear sala (Host)
          </button>
        </div>

        <div className="mt-8 border-t border-stone-100 pt-8">
          <h2 className="text-xl font-semibold text-slate-800">Unirse a una sala</h2>
          {recentSession ? (
            <div className="mt-4 space-y-4 rounded-xl bg-blue-50 p-6">
              <p className="text-base text-blue-900">
                Parece que estabas jugando en la sala <strong className="font-bold">{recentSession.code}</strong> como <strong className="font-bold">{recentSession.name}</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-base font-bold text-white shadow-sm disabled:opacity-60 transition-colors hover:bg-blue-700"
                  onClick={() => onJoin(true)}
                  disabled={isPending}
                >
                  Reconectar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-blue-200 bg-white px-4 py-3 text-base font-bold text-blue-600 disabled:opacity-60 transition-colors hover:bg-blue-50"
                  onClick={() => {
                    localStorage.removeItem('logosmatch_player_session')
                    setRecentSession(null)
                    setCode('')
                  }}
                  disabled={isPending}
                >
                  Cancelar
                </button>
              </div>
              {error ? (
                <p className="text-sm font-medium text-red-600">{error}</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <input
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Código de sala"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                inputMode="text"
                autoCapitalize="characters"
              />
              <input
                className="w-full rounded-xl border border-stone-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputMode="text"
              />
              <button
                type="button"
                className="w-full rounded-xl bg-white border border-stone-200 px-4 py-3 text-base font-semibold text-slate-800 hover:bg-stone-50 transition-all shadow-sm hover:shadow disabled:opacity-60"
                onClick={() => onJoin(false)}
                disabled={isPending || !code.trim() || !name.trim()}
              >
                Unirse
              </button>
              {error ? (
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
