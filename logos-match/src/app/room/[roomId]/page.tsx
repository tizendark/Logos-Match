import { Suspense } from 'react'

import { RoomLobby } from '@/components/RoomLobby'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center bg-zinc-50 text-zinc-500">
          Cargando lobby...
        </div>
      }
    >
      <RoomLobby roomId={roomId} />
    </Suspense>
  )
}

