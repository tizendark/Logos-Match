'use client'

import { motion } from 'framer-motion'
import { X, Circle } from 'lucide-react'

export type TicTacToeBoardProps = {
  board: (string | null)[]
  onMove: (index: number) => void
  disabled: boolean
  winnerLine: number[] | null
  player1Id: string | null
  player2Id: string | null
}

export function TicTacToeBoard({
  board,
  onMove,
  disabled,
  winnerLine,
  player1Id,
  player2Id,
}: TicTacToeBoardProps) {
  return (
    <div className="mx-auto flex w-full max-w-[320px] sm:max-w-sm flex-col items-center justify-center">
      <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-2 sm:gap-3">
        {board.map((cell, i) => {
          const isWinnerCell = winnerLine?.includes(i)
          const isPlayer1 = cell === player1Id && player1Id !== null
          const isPlayer2 = cell === player2Id && player2Id !== null
          
          let Icon = null
          let iconColorClass = 'text-zinc-400'
          if (isPlayer1) {
            Icon = X
            iconColorClass = 'text-blue-500'
          } else if (isPlayer2) {
            Icon = Circle
            iconColorClass = 'text-rose-500'
          } else if (cell) {
            Icon = X // Fallback para un jugador desconocido
            iconColorClass = 'text-zinc-600'
          }

          return (
            <motion.button
              key={i}
              type="button"
              whileTap={!cell && !disabled ? { scale: 0.92 } : undefined}
              className={`
                flex items-center justify-center rounded-2xl border-2 text-4xl shadow-sm transition-colors sm:text-6xl
                ${cell ? 'border-zinc-200 bg-white' : 'border-zinc-100 bg-zinc-50 hover:bg-zinc-100'}
                ${isWinnerCell ? 'border-green-300 bg-green-50 ring-4 ring-green-500/20' : ''}
                ${disabled && !cell ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
              `}
              onClick={() => {
                if (!cell && !disabled) onMove(i)
              }}
              disabled={!!cell || disabled}
              aria-label={`Casilla ${i + 1}`}
            >
              {Icon ? (
                <motion.div
                  initial={{ scale: 0, rotate: -45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ type: 'spring', bounce: 0.5, duration: 0.5 }}
                >
                  <Icon
                    className={`h-12 w-12 sm:h-16 sm:w-16 ${iconColorClass} ${isWinnerCell ? 'drop-shadow-sm' : ''}`}
                    strokeWidth={2.5}
                  />
                </motion.div>
              ) : null}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
