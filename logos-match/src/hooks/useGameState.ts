import { useEffect, useRef, useState } from 'react'
import { createClient, type RealtimeChannel } from '@supabase/supabase-js'

import { insforgeConfig } from '@/lib/insforge'
import type { GameState } from '@/lib/gameUtils'

const supabase =
  insforgeConfig.url && insforgeConfig.anonKey
    ? createClient(insforgeConfig.url, insforgeConfig.anonKey)
    : null

export function useGameState(
  roomId: string,
  isHost: boolean,
  onPlayerAction?: (action: unknown) => void,
) {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'LOBBY',
    board: Array(9).fill(null),
    turn: null,
    score: {},
    playerX: null,
    playerO: null,
    currentQuestionIndex: 0,
    triquiWinnerId: null,
    questionAnswer: null,
    questionRevealed: false,
    questionStartedAt: null,
    questionAnsweredAt: null,
  })

  const channelRef = useRef<RealtimeChannel | null>(null)
  const gameStateRef = useRef<GameState>(gameState)
  
  const onPlayerActionRef = useRef(onPlayerAction)

  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  useEffect(() => {
    onPlayerActionRef.current = onPlayerAction
  }, [onPlayerAction])

  useEffect(() => {
    if (!supabase || !roomId) return

    const channel = supabase.channel(`room:${roomId}`, {
      config: {
        broadcast: { ack: false, self: true },
      },
    })
    channelRef.current = channel

    channel
      .on('broadcast', { event: 'sync_state' }, (payload) => {
        setGameState(payload.payload)
      })
      .on('broadcast', { event: 'sync_request' }, () => {
        if (isHost) {
          channel.send({
            type: 'broadcast',
            event: 'sync_state',
            payload: gameStateRef.current,
          })
        }
      })
      .on('broadcast', { event: 'player_action' }, (payload) => {
        if (isHost && onPlayerActionRef.current) {
          onPlayerActionRef.current(payload.payload)
        }
      })
      .on('broadcast', { event: 'room_cancelled' }, () => {
        if (!isHost) {
          window.alert('La partida ha sido cerrada por el anfitrión.')
          localStorage.removeItem('logosmatch_player_session')
          window.location.href = '/'
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (isHost) {
            channel.send({
              type: 'broadcast',
              event: 'sync_state',
              payload: gameStateRef.current,
            })
          } else {
            channel.send({
              type: 'broadcast',
              event: 'sync_request',
            })
          }
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, isHost])

  const updateGameState = (newState: Partial<GameState>) => {
    if (!isHost) return
    const nextState = { ...gameStateRef.current, ...newState }
    setGameState(nextState)
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'sync_state',
        payload: nextState,
      })
    }
  }

  const sendPlayerAction = (action: unknown) => {
    if (isHost) return
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_action',
        payload: action,
      })
    }
  }

  const closeRoomBroadcast = () => {
    if (!isHost) return
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'room_cancelled',
        payload: {},
      })
    }
  }

  return { gameState, updateGameState, sendPlayerAction, closeRoomBroadcast }
}
