import { motion } from 'framer-motion'
import type { GameQuestion } from '@/lib/models/quiz'
import { useGameSounds } from '@/hooks/useGameSounds'

export type QuestionViewProps = {
  question: GameQuestion
  playerId: string | null
  triquiWinnerId: string | null
  triquiWinnerName: string
  isHost: boolean
  answer: number | null
  revealed: boolean
  onAnswer: (index: number) => void
}

export function QuestionView({
  question,
  playerId,
  triquiWinnerId,
  triquiWinnerName,
  isHost,
  answer,
  revealed,
  onAnswer,
}: QuestionViewProps) {
  const canAnswer = playerId === triquiWinnerId && !revealed && answer === null
  const { playClick } = useGameSounds()

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Pregunta para {triquiWinnerName}
        </h2>
        <p className="mt-3 text-lg font-medium leading-snug text-zinc-900">
          {question.prompt}
        </p>
      </div>

      <div className="grid gap-3">
        {question.options.map((opt, idx) => {
          const isSelected = answer === idx
          const isCorrect = revealed && idx === question.correct_index
          const isWrong = revealed && isSelected && idx !== question.correct_index

          // Colores de la opción
          let btnClass = 'border-zinc-200 bg-white text-zinc-900'
          if (revealed) {
            if (isCorrect) btnClass = 'border-green-500 bg-green-50 text-green-900'
            else if (isWrong) btnClass = 'border-red-500 bg-red-50 text-red-900'
            else btnClass = 'border-zinc-100 bg-zinc-50 text-zinc-400 opacity-50'
          } else if (isSelected) {
            btnClass = 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
          } else if (canAnswer || isHost) {
            btnClass = 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300'
          }

          return (
            <motion.button
              key={idx}
              type="button"
              whileTap={canAnswer || (isHost && !revealed) ? { scale: 0.98 } : undefined}
              disabled={(!canAnswer && !isHost) || revealed}
              onClick={() => {
                if (canAnswer || (isHost && !revealed)) {
                  playClick()
                  onAnswer(idx)
                }
              }}
              className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-colors ${btnClass}`}
            >
              <span className="font-medium">{opt}</span>
              {revealed && isCorrect && (
                <span className="text-sm font-bold text-green-600">✓</span>
              )}
              {revealed && isWrong && (
                <span className="text-sm font-bold text-red-600">✗</span>
              )}
            </motion.button>
          )
        })}
      </div>

      {revealed && question.explanation ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-blue-50 p-5 text-sm text-blue-900 shadow-sm"
        >
          <span className="font-bold">Explicación:</span> {question.explanation}
        </motion.div>
      ) : null}

      {!isHost && playerId !== triquiWinnerId && !revealed ? (
        <p className="text-center text-sm text-zinc-500">
          Esperando a que {triquiWinnerName} responda...
        </p>
      ) : null}
    </div>
  )
}
