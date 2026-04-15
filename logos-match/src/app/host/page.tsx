'use client'

import { useRouter } from 'next/navigation'

import { useHostToken } from '@/hooks/useHostToken'

export default function HostHomePage() {
  const router = useRouter()
  const hostToken = useHostToken()

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-10 text-zinc-950">
      <main className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight">Panel del Host</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Elige cómo quieres crear el quiz.
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
            onClick={() => router.push('/host/templates')}
            disabled={!hostToken}
          >
            Usar plantilla
          </button>
          <button
            type="button"
            className="w-full rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-950 disabled:opacity-60"
            onClick={() => router.push('/host/custom')}
            disabled={!hostToken}
          >
            Crear personalizado
          </button>
        </div>
      </main>
    </div>
  )
}
