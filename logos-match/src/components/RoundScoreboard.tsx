'use client'

import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { RoomPlayer } from '@/lib/models/quiz'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function useRollingNumber(from: number, to: number, durationMs: number) {
  const [value, setValue] = useState(from)

  useEffect(() => {
    setValue(from)
    const start = performance.now()
    let raf = 0

    const tick = (t: number) => {
      const p = clamp((t - start) / durationMs, 0, 1)
      const next = Math.round(from + (to - from) * p)
      setValue(next)
      if (p < 1) raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [from, to, durationMs])

  return value
}

export type RoundScoreboardProps = {
  playerA: RoomPlayer | null
  playerB: RoomPlayer | null
  prevScore: Record<string, number>
  score: Record<string, number>
  maxScore: number
  awardedToId: string | null
}

export function RoundScoreboard({
  playerA,
  playerB,
  prevScore,
  score,
  maxScore,
  awardedToId,
}: RoundScoreboardProps) {
  const aId = playerA?.id ?? null
  const bId = playerB?.id ?? null

  const aPrev = aId ? prevScore[aId] ?? 0 : 0
  const bPrev = bId ? prevScore[bId] ?? 0 : 0
  const aNow = aId ? score[aId] ?? 0 : 0
  const bNow = bId ? score[bId] ?? 0 : 0

  const safeMax = Math.max(1, maxScore)

  const aPct = useMemo(() => clamp(aNow / safeMax, 0, 1), [aNow, safeMax])
  const bPct = useMemo(() => clamp(bNow / safeMax, 0, 1), [bNow, safeMax])

  const aRolling = useRollingNumber(aPrev, aNow, 1500)
  const bRolling = useRollingNumber(bPrev, bNow, 1500)

  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      <PlayerCard
        label="Equipo A"
        player={playerA}
        value={aRolling}
        pct={aPct}
        color="indigo"
        isWinner={Boolean(awardedToId && awardedToId === aId)}
      />
      <PlayerCard
        label="Equipo B"
        player={playerB}
        value={bRolling}
        pct={bPct}
        color="amber"
        isWinner={Boolean(awardedToId && awardedToId === bId)}
      />
    </div>
  )
}

function PlayerCard({
  label,
  player,
  value,
  pct,
  color,
  isWinner,
}: {
  label: string
  player: RoomPlayer | null
  value: number
  pct: number
  color: 'indigo' | 'amber'
  isWinner: boolean
}) {
  const initial = (player?.name?.trim()?.[0] ?? '?').toUpperCase()
  const name = player?.name ?? '—'
  const barClass = color === 'indigo' ? 'bg-indigo-600' : 'bg-amber-500'
  const ringClass = color === 'indigo' ? 'ring-indigo-500/20' : 'ring-amber-500/20'
  const avatarClass = color === 'indigo' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-800'

  return (
    <motion.div
      className={`rounded-2xl border border-stone-100 bg-white p-5 shadow-sm ${isWinner ? `ring-4 ${ringClass}` : ''}`}
      animate={isWinner ? { scale: [1, 1.06, 1] } : { scale: 1 }}
      transition={isWinner ? { delay: 1.55, duration: 0.35 } : { duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${avatarClass}`}>
            {initial}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
              {label}
            </div>
            <div className="truncate text-base font-bold text-slate-900">{name}</div>
          </div>
        </div>
        <div className="rounded-xl bg-stone-100 px-3 py-1 text-sm font-black text-stone-700">
          {value}
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-stone-100">
        <motion.div
          className={`h-full ${barClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${Math.round(pct * 100)}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 18, duration: 1.5 }}
        />
      </div>
    </motion.div>
  )
}

