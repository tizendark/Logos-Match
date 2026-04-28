'use client'

import { useCallback, useEffect, useState } from 'react'
import useSound from 'use-sound'

const MUTE_STORAGE_KEY = 'logosmatch_mute_sounds'

export function useGameSounds() {
  const [isMuted, setIsMuted] = useState(false)

  // Initialize mute state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem(MUTE_STORAGE_KEY)
      if (stored === 'true') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsMuted(true)
      }
    }
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MUTE_STORAGE_KEY, String(next))
      }
      return next
    })
  }, [])

  const [playClickRaw] = useSound('/sounds/click.wav', { volume: 0.5, soundEnabled: !isMuted })
  const [playClickPrimaryRaw] = useSound('/sounds/click-primary.wav', { volume: 0.7, soundEnabled: !isMuted })
  const [playJoinRaw] = useSound('/sounds/join.wav', { volume: 0.6, soundEnabled: !isMuted })
  const [playPlaceRaw] = useSound('/sounds/place.wav', { volume: 0.5, soundEnabled: !isMuted })
  const [playCorrectRaw] = useSound('/sounds/correct.wav', { volume: 0.7, soundEnabled: !isMuted })
  const [playCorrectPerfectRaw] = useSound('/sounds/correct-perfect.wav', { volume: 0.85, soundEnabled: !isMuted })
  const [playWrongRaw] = useSound('/sounds/wrong.wav', { volume: 0.7, soundEnabled: !isMuted })
  const [playWinRaw] = useSound('/sounds/win.wav', { volume: 0.8, soundEnabled: !isMuted })

  return {
    isMuted,
    toggleMute,
    playClick: () => playClickRaw(),
    playClickPrimary: () => playClickPrimaryRaw(),
    playJoin: () => playJoinRaw(),
    playPlace: () => playPlaceRaw(),
    playCorrect: () => playCorrectRaw(),
    playCorrectPerfect: () => playCorrectPerfectRaw(),
    playWrong: () => playWrongRaw(),
    playWin: () => playWinRaw(),
  }
}
