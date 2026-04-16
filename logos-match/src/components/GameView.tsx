'use client'

import { useEffect, useState } from 'react'

import { TicTacToeBoard } from '@/components/TicTacToeBoard'
import { useGameState } from '@/hooks/useGameState'
import { useHostToken } from '@/hooks/useHostToken'
import { checkWinner } from '@/lib/gameUtils'
import type { Room, RoomPlayer } from '@/lib/models/quiz'

export function GameView({ roomId }: { roomId: string }) {
  const hostToken = useHostToken()
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [loading, setLoading] = useState(true)

  // Asumimos isHost si tenemos hostToken en localStorage,
  // luego validaremos con la sala real.
  const isHost = Boolean(hostToken)

  const { gameState, updateGameState } = useGameState(
    roomId,
    isHost,
    (action: unknown) => {
      const act = action as { type?: string; index?: number; playerId?: string }
      if (isHost && act?.type === 'PLAYER_MOVE' && typeof act.index === 'number') {
        handleMove(act.index, act.playerId ?? null)
      }
    }
  )

  useEffect(() => {
    async function load() {
      try {
        // El Host pide toda la info (preguntas, estado), el jugador solo necesita validarse
        const url = isHost
          ? `/api/rooms/${roomId}/game?hostToken=${hostToken}`
          : `/api/rooms/${roomId}`

        const response = await fetch(url)
        if (!response.ok) throw new Error('Failed to load room')

        const data = await response.json()
        setRoom(data.room)
        setPlayers(data.players || [])

        // Si es Host y el estado actual de la sala estaba vacío, inicializamos el juego
        if (isHost && data.room?.host_token === hostToken) {
          const persistedState = data.room.current_state as Record<string, unknown>
          if (
            persistedState &&
            typeof persistedState === 'object' &&
            Object.keys(persistedState).length > 0
          ) {
            updateGameState(persistedState as Parameters<typeof updateGameState>[0])
          } else {
            // Inicializar Triqui con los 2 primeros jugadores
            const activePlayers = data.players || []
            const pX = activePlayers[0]?.id ?? null
            const pO = activePlayers[1]?.id ?? null

            updateGameState({
              phase: 'TRIQUI',
              board: Array(9).fill(null),
              playerX: pX,
              playerO: pO,
              turn: pX, // Empieza el jugador X
            })
          }
        }
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [roomId, hostToken, isHost]) // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar estado en BD periódicamente o cuando cambie (debounce simplificado o directo al cambiar turno)
  useEffect(() => {
    if (!isHost || !hostToken || !room) return

    fetch(`/api/rooms/${roomId}/state`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hostToken, state: gameState }),
    }).catch(console.error)
  }, [gameState, isHost, hostToken, roomId, room])

  const winResult = checkWinner(gameState.board)

  // Función de movimiento. En este MVP, permitimos que el Host haga clic en el tablero
  // en nombre de los jugadores, o bien para probar localmente.
  // En un entorno real, los jugadores envían `PLAYER_MOVE` vía sendPlayerAction.
  function handleMove(index: number, playerId: string | null = gameState.turn) {
    if (!isHost) return
    if (winResult.winner || winResult.isDraw) return
    if (gameState.board[index]) return
    if (gameState.turn !== playerId) return // No es su turno

    const newBoard = [...gameState.board]
    newBoard[index] = playerId

    const newTurn =
      playerId === gameState.playerX ? gameState.playerO : gameState.playerX

    updateGameState({
      board: newBoard,
      turn: newTurn,
    })
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Cargando partida...</p>
      </div>
    )
  }

  const playerXName =
    players.find((p) => p.id === gameState.playerX)?.name || 'Jugador X'
  const playerOName =
    players.find((p) => p.id === gameState.playerO)?.name || 'Jugador O'

  const isPlayerXTurn = gameState.turn === gameState.playerX
  const isPlayerOTurn = gameState.turn === gameState.playerO

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-8 text-zinc-950">
      <main className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight">Triqui</h1>
          {winResult.winner ? (
            <p className="mt-2 text-lg font-medium text-green-600">
              ¡Ganó {winResult.winner === gameState.playerX ? playerXName : playerOName}!
            </p>
          ) : winResult.isDraw ? (
            <p className="mt-2 text-lg font-medium text-zinc-600">
              ¡Empate!
            </p>
          ) : (
            <p className="mt-2 text-sm text-zinc-600">
              Turno de:{' '}
              <span className="font-semibold text-zinc-900">
                {isPlayerXTurn ? playerXName : isPlayerOTurn ? playerOName : '—'}
              </span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
          <div className={`flex flex-col items-center ${isPlayerXTurn && !winResult.winner ? 'opacity-100' : 'opacity-50'}`}>
            <div className="text-xl font-bold text-blue-500">X</div>
            <span className="text-xs font-medium">{playerXName}</span>
          </div>
          <div className="text-xs text-zinc-400">vs</div>
          <div className={`flex flex-col items-center ${isPlayerOTurn && !winResult.winner ? 'opacity-100' : 'opacity-50'}`}>
            <div className="text-xl font-bold text-rose-500">O</div>
            <span className="text-xs font-medium">{playerOName}</span>
          </div>
        </div>

        <TicTacToeBoard
          board={gameState.board}
          onMove={(index) => handleMove(index)}
          disabled={!isHost || !!winResult.winner || winResult.isDraw}
          winnerLine={winResult.line}
          player1Id={gameState.playerX}
          player2Id={gameState.playerO}
        />

        {isHost && (winResult.winner || winResult.isDraw) ? (
          <button
            className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm"
            onClick={() => {
              // Resetear el tablero para otra ronda
              updateGameState({
                board: Array(9).fill(null),
                turn: gameState.playerO, // Cambiar quién empieza
              })
            }}
          >
            Siguiente Ronda
          </button>
        ) : null}
      </main>
    </div>
  )
}
