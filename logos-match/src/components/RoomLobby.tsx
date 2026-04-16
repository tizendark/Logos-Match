'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import type { Room, RoomPlayer } from '@/lib/models/quiz'
import { useHostToken } from '@/hooks/useHostToken'

type LobbyData = {
  room: Room | null
  players: RoomPlayer[]
}

export function RoomLobby({ roomId }: { roomId: string }) {
  const router = useRouter()
  const hostToken = useHostToken()
  const [data, setData] = useState<LobbyData>({ room: null, players: [] })
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const isHost = Boolean(hostToken && data.room?.host_token === hostToken)

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
    if (data.room?.status === 'playing') {
      router.push(`/room/${roomId}/play`)
    }
  }, [data.room?.status, router, roomId])

  async function handleStartGame() {
    if (!hostToken || starting) return
    setStarting(true)
    setError(null)
    try {
      const res = await fetch(`/api/rooms/${roomId}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hostToken }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => null)
        throw new Error(payload?.error ?? 'No se pudo iniciar la partida')
      }
      // La redirección ocurrirá en el useEffect del polling cuando status pase a 'playing'
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
      setStarting(false)
    }
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

        {isHost && status === 'lobby' ? (
          <button
            onClick={handleStartGame}
            disabled={starting || data.players.length < 2}
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm disabled:opacity-50"
          >
            {starting ? 'Iniciando...' : 'Iniciar partida'}
          </button>
        ) : null}

        {isHost && data.players.length < 2 ? (
          <p className="text-center text-xs text-zinc-500">
            Se necesitan al menos 2 jugadores para jugar a Triqui.
          </p>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </main>
    </div>
  )
}

