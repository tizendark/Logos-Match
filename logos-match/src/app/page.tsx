'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onJoin() {
    setError(null)
    startTransition(async () => {
      const response = await fetch('/api/rooms/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code.trim(), name: name.trim() }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setError(payload?.error ?? 'No se pudo unir a la sala')
        return
      }

      const payload = (await response.json()) as { roomId: string; playerId: string }
      router.push(`/room/${payload.roomId}?playerId=${payload.playerId}`)
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
              onClick={onJoin}
              disabled={isPending || !code.trim() || !name.trim()}
            >
              Unirse
            </button>
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
