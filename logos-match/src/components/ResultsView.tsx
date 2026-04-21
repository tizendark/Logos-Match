import { motion } from 'framer-motion'
import { Trophy, Medal, Award } from 'lucide-react'
import type { RoomPlayer } from '@/lib/models/quiz'

export type ResultsViewProps = {
  players: RoomPlayer[]
  score: Record<string, number>
}

export function ResultsView({ players, score }: ResultsViewProps) {
  // Ordenar de mayor a menor puntaje
  const sortedPlayers = [...players].sort((a, b) => {
    const sA = score[a.id] || 0
    const sB = score[b.id] || 0
    return sB - sA
  })

  // Obtener top 3 para el podio
  const top3 = sortedPlayers.slice(0, 3)
  const rest = sortedPlayers.slice(3)

  return (
    <div className="flex flex-col items-center w-full max-w-md gap-8 py-8">
      <div className="text-center">
        <h1 className="text-4xl font-black text-amber-500 drop-shadow-sm">¡Resultados!</h1>
        <p className="text-stone-600 mt-2 font-medium">La partida ha finalizado</p>
      </div>

      {/* Podium */}
      <div className="flex items-end justify-center gap-4 h-56 mt-4 w-full">
        {/* Segundo lugar */}
        {top3[1] && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="mb-2 text-stone-600 flex flex-col items-center">
              <Medal className="w-8 h-8 text-stone-400 mb-1" />
              <span className="font-bold text-sm truncate max-w-[80px]">{top3[1].name}</span>
              <span className="text-xs font-bold">{score[top3[1].id] || 0} pts</span>
            </div>
            <div className="w-20 h-28 bg-stone-300 rounded-t-xl border-t-4 border-stone-400 flex items-start justify-center pt-2 shadow-inner">
              <span className="text-2xl font-black text-stone-500 opacity-50">2</span>
            </div>
          </motion.div>
        )}

        {/* Primer lugar */}
        {top3[0] && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center z-10"
          >
            <div className="mb-2 text-amber-600 flex flex-col items-center">
              <Trophy className="w-12 h-12 text-amber-500 mb-1 drop-shadow-md" />
              <span className="font-black text-base truncate max-w-[100px]">{top3[0].name}</span>
              <span className="text-sm font-black bg-amber-100 px-2 py-0.5 rounded-md mt-1">{score[top3[0].id] || 0} pts</span>
            </div>
            <div className="w-24 h-36 bg-amber-400 rounded-t-xl border-t-4 border-amber-300 flex items-start justify-center pt-2 shadow-lg">
              <span className="text-3xl font-black text-amber-600 opacity-50">1</span>
            </div>
          </motion.div>
        )}

        {/* Tercer lugar */}
        {top3[2] && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="mb-2 text-orange-700 flex flex-col items-center">
              <Award className="w-7 h-7 text-orange-400 mb-1" />
              <span className="font-bold text-sm truncate max-w-[80px]">{top3[2].name}</span>
              <span className="text-xs font-bold">{score[top3[2].id] || 0} pts</span>
            </div>
            <div className="w-20 h-24 bg-orange-200 rounded-t-xl border-t-4 border-orange-300 flex items-start justify-center pt-2 shadow-inner">
              <span className="text-2xl font-black text-orange-400 opacity-50">3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Rest of the players */}
      {rest.length > 0 && (
        <div className="w-full bg-white rounded-2xl p-4 shadow-sm border border-stone-100 mt-4 space-y-2">
          {rest.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between px-2 py-2 border-b border-stone-50 last:border-0">
              <div className="flex items-center gap-3">
                <span className="text-stone-400 font-bold text-sm w-4">{i + 4}</span>
                <span className="font-medium text-slate-800">{p.name}</span>
              </div>
              <span className="text-sm font-bold text-stone-600">{score[p.id] || 0} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
