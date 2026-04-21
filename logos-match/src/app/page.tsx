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
