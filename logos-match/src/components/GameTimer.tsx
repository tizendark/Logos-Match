'use client'

import { motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export type GameTimerProps = {
  startTimestamp: number | null
  durationMs: number | null
  variant?: 'normal' | 'steal'
  playTick?: () => void
  playBuzzer?: () => void
}

export function GameTimer({
  startTimestamp,
  durationMs,
  variant = 'normal',
  playTick,
  playBuzzer,
}: GameTimerProps) {
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
  const isSteal = variant === 'steal'
  const pulse = isSteal || isDanger

  return (
    <motion.div
      className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 shadow-sm"
      animate={pulse ? { scale: [1, 1.03, 1] } : { scale: 1 }}
      transition={pulse ? { duration: isSteal ? 0.22 : 0.35, repeat: Infinity } : { duration: 0.2 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Tiempo
        </span>
        <motion.span
          key={remainingSeconds}
          className={`text-sm font-black ${pulse ? 'text-red-600' : 'text-slate-900'}`}
          animate={isSteal ? { scale: [1, 1.22, 1] } : { scale: 1 }}
          transition={isSteal ? { duration: 0.18 } : { duration: 0.2 }}
        >
          {remainingSeconds}s
        </motion.span>
      </div>

      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-100">
        <motion.div
          className={`h-full ${pulse ? 'bg-red-500' : 'bg-emerald-500'}`}
          animate={{ width: `${Math.round(percent * 100)}%` }}
          transition={{ ease: 'linear', duration: 0.12 }}
        />
      </div>
    </motion.div>
  )
}
