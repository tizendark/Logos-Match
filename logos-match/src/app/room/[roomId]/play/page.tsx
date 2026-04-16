import { GameView } from '@/components/GameView'

export default async function PlayPage({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
  const { roomId } = await params
  return <GameView roomId={roomId} />
}
