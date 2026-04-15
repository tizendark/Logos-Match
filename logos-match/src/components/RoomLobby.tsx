'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { useHostToken } from '@/hooks/useHostToken'
import type { Room, RoomPlayer } from '@/lib/models/quiz'

type LobbyData = {
  room: Room | null
  players: RoomPlayer[]
}

export function RoomLobby({
  roomId,
  playerId,
}: {
  roomId: string
  playerId?: string
}) {
  const hostToken = useHostToken()
  const [data, setData] = useState<LobbyData>({ room: null, players: [] })
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

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

  useEffect(() => {
    if (!playerId) return

    let cancelled = false

    async function heartbeat() {
      if (cancelled) return
      await fetch(`/api/players/${playerId}/heartbeat`, {
        method: 'POST',
        cache: 'no-store',
      }).catch(() => {})
    }

    function leave() {
      fetch(`/api/players/${playerId}/leave`, {
        method: 'POST',
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {})
    }

    heartbeat()
    const interval = window.setInterval(heartbeat, 10_000)
    window.addEventListener('beforeunload', leave)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('beforeunload', leave)
      leave()
    }
  }, [playerId])

  const isHost = useMemo(() => {
    if (!hostToken) return false
    if (!data.room) return false
    return data.room.host_token === hostToken
  }, [data.room, hostToken])

  function startGame() {
    if (!hostToken) return
    setError(null)
    startTransition(async () => {
      const response = await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hostToken }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setError(payload?.error ?? 'No se pudo iniciar la partida')
        return
      }

      const payload = (await response.json()) as { room: Room }
      setData((prev) => ({ ...prev, room: payload.room ?? prev.room }))
    })
  }

  const code = data.room?.code ?? '—'
  const status = data.room?.status ?? 'lobby'

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <main className="w-full max-w-md space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Lobby</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Código: <span className="font-semibold text-zinc-950">{code}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">Estado: {status}</p>
          {isHost && status === 'lobby' ? (
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
              onClick={startGame}
              disabled={isPending}
            >
              Iniciar partida
            </button>
          ) : null}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Jugadores</h2>
          <ul className="mt-3 space-y-2">
            {data.players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2"
              >
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-xs text-zinc-600">{p.score} pts</span>
              </li>
            ))}
            {data.players.length === 0 ? (
              <li className="text-sm text-zinc-600">Aún no hay jugadores.</li>
            ) : null}
          </ul>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </main>
    </div>
  )
}
