import { motion } from 'framer-motion'
import type { RoomPlayer } from '@/lib/models/quiz'

export type ScoreBoardProps = {
  players: RoomPlayer[]
  score: Record<string, number>
}

export function ScoreBoard({ players, score }: ScoreBoardProps) {
  // Ordenar por puntaje (descendente)
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = score[a.id] || 0
    const scoreB = score[b.id] || 0
    return scoreB - scoreA
  })

  // Mostrar top 3 o los jugadores activos
  const displayPlayers = sortedPlayers.slice(0, 3)

  return (
    <div className="w-full rounded-2xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {displayPlayers.map((p, i) => {
          const currentScore = score[p.id] || 0
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  i === 0
                    ? 'bg-yellow-100 text-yellow-700'
                    : i === 1
                    ? 'bg-zinc-200 text-zinc-600'
                    : 'bg-orange-100 text-orange-700'
                }`}
              >
                {i + 1}
              </div>
              <span className="max-w-[80px] truncate text-sm font-medium sm:max-w-[120px]">
                {p.name}
              </span>
              <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-600">
                {currentScore}
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
