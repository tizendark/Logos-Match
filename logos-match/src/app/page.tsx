'use client'

import { useState, useTransition, useEffect } from 'react'
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
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Logos Match</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Crea una sala como Host o únete con un código.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => router.push('/host')}
            disabled={isPending}
          >
            Crear sala (Host)
          </button>
        </div>

        <div className="mt-6 border-t pt-6">
          <h2 className="text-sm font-semibold">Unirse a una sala</h2>
          {recentSession ? (
            <div className="mt-3 space-y-3 rounded-xl bg-blue-50 p-4">
              <p className="text-sm text-blue-900">
                Parece que estabas jugando en la sala <strong>{recentSession.code}</strong> como <strong>{recentSession.name}</strong>.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-60"
                  onClick={() => onJoin(true)}
                  disabled={isPending}
                >
                  Reconectar
                </button>
                <button
                  type="button"
                  className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-600 disabled:opacity-60"
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
                <p className="text-sm text-red-600">{error}</p>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="Código de sala"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                inputMode="text"
                autoCapitalize="characters"
              />
              <input
                className="w-full rounded-xl border border-zinc-200 px-3 py-3 text-sm outline-none focus:border-zinc-400"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                inputMode="text"
              />
              <button
                type="button"
                className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950 disabled:opacity-60"
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
