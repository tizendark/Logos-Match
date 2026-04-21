'use client'

import { useEffect, useState } from 'react'

import type { Room, RoomPlayer } from '@/lib/models/quiz'

type LobbyData = {
  room: Room | null
  players: RoomPlayer[]
}

export function RoomLobby({ roomId }: { roomId: string }) {
  const [data, setData] = useState<LobbyData>({ room: null, players: [] })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const response = await fetch(`/api/rooms/${roomId}`, { cache: 'no-store' })
        if (!response.ok) {
          const payload = await response.json().catch(() => null)
          throw new Error(payload?.error ?? 'No se pudo cargar la sala')
        }
        const payload = (await response.json()) as LobbyData
        if (cancelled) return
        setData({
          room: payload.room ?? null,
          players: Array.isArray(payload.players) ? payload.players : [],
        })
        setError(null)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Error desconocido')
      }
    }

    load()
    const interval = window.setInterval(load, 2500)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [roomId])

  const code = data.room?.code ?? '—'
  const status = data.room?.status ?? 'lobby'

  return (
    <div className="flex flex-1 flex-col items-center bg-stone-50 px-4 py-10 text-slate-900">
      <main className="w-full max-w-md space-y-6">
        <div className="rounded-2xl bg-white p-8 shadow-xl border border-stone-100 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-blue-950">Lobby</h1>
          <p className="mt-4 text-base text-stone-600">
            Código de invitación:
          </p>
          <div className="mt-2 text-4xl font-black tracking-widest text-amber-600">
            {code}
          </div>
          <p className="mt-4 inline-block rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-800">
            Estado: {status}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-md border border-stone-100">
          <h2 className="text-lg font-semibold text-slate-800">Jugadores ({data.players.length})</h2>
          <ul className="mt-4 space-y-3">
            {data.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 shadow-sm transition-all"
              >
                <span className="text-base font-medium text-slate-900">{p.name}</span>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-stone-600 shadow-sm border border-stone-200">
                  {p.score} pts
                </span>
              </li>
            ))}
            {data.players.length === 0 ? (
              <li className="text-center py-4 text-sm text-stone-500 italic">
                Esperando a que se unan jugadores...
              </li>
            ) : null}
          </ul>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </main>
    </div>
  )
}

