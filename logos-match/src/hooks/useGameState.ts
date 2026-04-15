import { useState } from 'react'

import type { GameConfig } from '@/lib/gameConfig'

export type GameRole = 'host' | 'player'
export type RoomStatus = 'lobby' | 'playing' | 'results' | 'ended'

export type PlayerState = {
  id: string
  name: string
  score: number
  status: 'connected' | 'disconnected'
}

export type RoomState = {
  roomId: string
  status: RoomStatus
  hostId: string | null
  players: PlayerState[]
  gameConfig: GameConfig
}

export function useGameState() {
  return useState<RoomState | null>(null)
}
