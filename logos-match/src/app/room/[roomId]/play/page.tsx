import { Suspense } from 'react'
import { GameView } from '@/components/GameView'

export default async function PlayPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-zinc-50 text-zinc-500">
          Cargando juego...
        </div>
      }
    >
      <GameView roomId={roomId} />
    </Suspense>
  )
}
