'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

export function GameStageTransition({
  children,
  stageKey,
}: {
  children: ReactNode
  stageKey: string
}) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stageKey}
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: -50, scale: 0.95 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 2,
        }}
        className="flex flex-1 flex-col w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
