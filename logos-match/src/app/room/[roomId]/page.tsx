import { RoomLobby } from '@/components/RoomLobby'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  return <RoomLobby roomId={roomId} />
}
