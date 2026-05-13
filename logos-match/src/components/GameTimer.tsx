'use client'

import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export type GameTimerProps = {
  startTimestamp: number | null
  durationMs: number | null
  playTick?: () => void
  playBuzzer?: () => void
}

export function GameTimer({ startTimestamp, durationMs, playTick, playBuzzer }: GameTimerProps) {
  const [now, setNow] = useState(() => Date.now())
  const lastSecondRef = useRef<number | null>(null)
  const buzzedRef = useRef(false)

  useEffect(() => {
    setNow(Date.now())
    lastSecondRef.current = null
    buzzedRef.current = false
  }, [startTimestamp, durationMs])

  useEffect(() => {
    if (!startTimestamp || !durationMs) return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [startTimestamp, durationMs])

  const remainingMs = useMemo(() => {
    if (!startTimestamp || !durationMs) return 0
    return Math.max(0, startTimestamp + durationMs - now)
  }, [startTimestamp, durationMs, now])

  const percent = useMemo(() => {
    if (!durationMs) return 0
    return clamp(remainingMs / durationMs, 0, 1)
  }, [remainingMs, durationMs])

  const remainingSeconds = useMemo(() => Math.ceil(remainingMs / 1000), [remainingMs])

  useEffect(() => {
    if (!startTimestamp || !durationMs) return

    if (remainingSeconds <= 5 && remainingSeconds > 0) {
      if (lastSecondRef.current !== remainingSeconds) {
        lastSecondRef.current = remainingSeconds
        playTick?.()
      }
    }
    if (remainingSeconds === 0 && !buzzedRef.current) {
      buzzedRef.current = true
      playBuzzer?.()
    }
  }, [startTimestamp, durationMs, remainingSeconds, playTick, playBuzzer])

  if (!startTimestamp || !durationMs) return null

  const isDanger = percent <= 0.25

  return (
    <motion.div
      className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
      animate={isDanger ? { scale: [1, 1.02, 1] } : { scale: 1 }}
      transition={isDanger ? { duration: 0.35, repeat: Infinity } : { duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Tiempo
        </span>
        <span className={`text-sm font-black ${isDanger ? 'text-red-600' : 'text-slate-900'}`}>
          {remainingSeconds}s
        </span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
        <motion.div
          className={`h-full ${isDanger ? 'bg-red-500' : 'bg-emerald-500'}`}
          animate={{ width: `${Math.round(percent * 100)}%` }}
          transition={{ ease: 'linear', duration: 0.12 }}
        />
      </div>
    </motion.div>
  )
}

