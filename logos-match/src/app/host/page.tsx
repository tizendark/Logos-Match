'use client'

import { useRouter } from 'next/navigation'

import { useHostToken } from '@/hooks/useHostToken'
import { useGameSounds } from '@/hooks/useGameSounds'

export default function HostHomePage() {
  const router = useRouter()
  const hostToken = useHostToken()
  const { playClick } = useGameSounds()

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-stone-50 px-4 py-10 text-slate-900">
      <main className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-stone-100">
        <h1 className="text-3xl font-bold tracking-tight text-blue-950">Panel del Host</h1>
        <p className="mt-2 text-base text-stone-600 leading-relaxed">
          Elige cómo quieres crear el quiz.
        </p>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-base font-semibold text-amber-950 hover:bg-amber-600 transition-all shadow-sm disabled:opacity-60"
            onClick={() => {
              playClick()
              router.push('/host/templates')
            }}
            disabled={!hostToken}
          >
            Usar plantilla
          </button>
          <button
            type="button"
            className="w-full rounded-xl bg-white border border-stone-200 px-4 py-3 text-base font-semibold text-slate-800 hover:bg-stone-50 transition-all shadow-sm hover:shadow disabled:opacity-60"
            onClick={() => {
              playClick()
              router.push('/host/custom')
            }}
            disabled={!hostToken}
          >
            Crear personalizado
          </button>
        </div>
      </main>
    </div>
  )
}
