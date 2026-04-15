import { RoomLobby } from '@/components/RoomLobby'

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ roomId: string }>
  searchParams: Promise<{ playerId?: string }>
}) {
  const { roomId } = await params
  const { playerId } = await searchParams
  return <RoomLobby roomId={roomId} playerId={playerId} />
}
