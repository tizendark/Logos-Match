'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { TicTacToeBoard } from '@/components/TicTacToeBoard'
import { useGameState } from '@/hooks/useGameState'
import { useHostToken } from '@/hooks/useHostToken'
import { usePlayerPresence } from '@/hooks/usePlayerPresence'
import { checkWinner } from '@/lib/gameUtils'
import type { GameQuestion, Room, RoomPlayer } from '@/lib/models/quiz'
import { QuestionView } from '@/components/QuestionView'
import { ScoreBoard } from '@/components/ScoreBoard'
import { LogOut } from 'lucide-react'

export function GameView({ roomId }: { roomId: string }) {
  const hostToken = useHostToken()
  const searchParams = useSearchParams()
  const playerId = searchParams.get('playerId')
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [questions, setQuestions] = useState<GameQuestion[]>([])
  const [loading, setLoading] = useState(true)

  // Asumimos isHost si tenemos hostToken en localStorage,
  // luego validaremos con la sala real.
  const isHost = Boolean(hostToken)
  const [closing, setClosing] = useState(false)
  const [showTurnModal, setShowTurnModal] = useState(false)

  // Iniciar latidos para el jugador si no es Host
  usePlayerPresence(!isHost ? playerId : null)

  const { gameState, updateGameState, sendPlayerAction, closeRoomBroadcast } = useGameState(
    roomId,
    isHost,
    (action: unknown) => {
      const act = action as { type?: string; index?: number; playerId?: string }
      if (!isHost) return

      if (act?.type === 'PLAYER_MOVE' && typeof act.index === 'number') {
        handleMove(act.index, act.playerId ?? null)
      } else if (act?.type === 'ANSWER_QUESTION' && typeof act.index === 'number') {
        handleAnswer(act.index, act.playerId ?? null)
      }
    }
  )

  // Finalizar partida si quedan menos de 2 jugadores en la sala
  useEffect(() => {
    if (!isHost) return
    if (loading) return
    if (players.length < 2 && !closing) {
      handleCloseGame()
    }
  }, [isHost, loading, players.length, closing]) // eslint-disable-line react-hooks/exhaustive-deps

  // Disparar modal cuando el tablero se limpia y hay un turno asignado
  useEffect(() => {
    if (gameState.phase === 'TRIQUI' && gameState.turn) {
      const empty = gameState.board.every((cell) => cell === null)
      if (empty) {
        setShowTurnModal(true)
      }
    }
  }, [gameState.board, gameState.turn, gameState.phase])

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
        if (data.questions) setQuestions(data.questions)

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

  // Función de movimiento. 
  // Los jugadores envían `PLAYER_MOVE` vía sendPlayerAction.
  // El Host actualiza el estado directamente si es él quien hace el click.
  function handleMove(index: number, movePlayerId: string | null) {
    if (!isHost) {
      if (movePlayerId === gameState.turn) {
        sendPlayerAction({ type: 'PLAYER_MOVE', index, playerId: movePlayerId })
      }
      return
    }

    if (winResult.winner || winResult.isDraw) return
    if (gameState.board[index]) return
    if (gameState.turn !== movePlayerId) return // No es su turno

    const newBoard = [...gameState.board]
    newBoard[index] = movePlayerId

    const newTurn =
      movePlayerId === gameState.playerX ? gameState.playerO : gameState.playerX

    updateGameState({
      board: newBoard,
      turn: newTurn,
    })
  }

  // Lógica de avance automático para el Host
  useEffect(() => {
    if (!isHost) return

    let timeout: number | null = null

    // Si la fase es Triqui y hay un resultado definitivo, esperar 5s y avanzar
    if (gameState.phase === 'TRIQUI' && (winResult.winner || winResult.isDraw)) {
      timeout = window.setTimeout(() => {
        if (winResult.winner && questions[gameState.currentQuestionIndex]) {
          updateGameState({
            phase: 'QUESTION',
            triquiWinnerId: winResult.winner,
          })
        } else {
          // Si fue empate o no hay más preguntas, resetear el tablero para otra ronda
          updateGameState({
            board: Array(9).fill(null),
            turn: gameState.playerO,
          })
        }
      }, 5000)
    }

    // Si la fase es Question y la respuesta ya fue revelada, esperar 5s y volver a Triqui
    if (gameState.phase === 'QUESTION' && gameState.questionRevealed) {
      const currentQuestion = questions[gameState.currentQuestionIndex]
      timeout = window.setTimeout(() => {
        if (!currentQuestion) return
        const isCorrect = gameState.questionAnswer === currentQuestion.correct_index
        const newScore = { ...gameState.score }
        
        if (isCorrect && gameState.triquiWinnerId) {
          newScore[gameState.triquiWinnerId] = (newScore[gameState.triquiWinnerId] || 0) + 100
        }

        updateGameState({
          phase: 'TRIQUI',
          board: Array(9).fill(null),
          turn: gameState.playerO, // Alternar inicio de ronda
          score: newScore,
          currentQuestionIndex: gameState.currentQuestionIndex + 1,
          triquiWinnerId: null,
          questionAnswer: null,
          questionRevealed: false,
        })
      }, 5000)
    }

    return () => {
      if (timeout) window.clearTimeout(timeout)
    }
  }, [
    isHost,
    gameState.phase,
    winResult.winner,
    winResult.isDraw,
    gameState.questionRevealed,
    gameState.currentQuestionIndex,
    gameState.questionAnswer,
    gameState.triquiWinnerId,
    gameState.score,
    gameState.playerO,
    questions,
    updateGameState,
  ])

  function handleAnswer(index: number, answerPlayerId: string | null) {
    if (!isHost) {
      if (answerPlayerId === gameState.triquiWinnerId) {
        sendPlayerAction({ type: 'ANSWER_QUESTION', index, playerId: answerPlayerId })
      }
      return
    }

    if (gameState.phase !== 'QUESTION') return
    if (gameState.questionRevealed) return
    if (gameState.triquiWinnerId !== answerPlayerId) return

    updateGameState({ questionAnswer: index })
  }

  async function handleCloseGame() {
    if (!isHost || closing) return
    const confirm = window.confirm('¿Seguro que deseas cerrar la partida sin ganadores definidos?')
    if (!confirm) return

    setClosing(true)
    try {
      closeRoomBroadcast()
      await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hostToken }),
      })
      window.location.href = '/'
    } catch (error) {
      console.error(error)
      setClosing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">Cargando partida...</p>
      </div>
    )
  }

  const currentQuestion = questions[gameState.currentQuestionIndex]

  if (gameState.phase === 'QUESTION' && currentQuestion) {
    const triquiWinnerName =
      players.find((p) => p.id === gameState.triquiWinnerId)?.name || 'Jugador'

    return (
      <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-8 text-zinc-950">
        <main className="flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center justify-between">
            <ScoreBoard players={players} score={gameState.score} />
            {isHost ? (
              <button
                onClick={handleCloseGame}
                disabled={closing}
                className="ml-4 flex shrink-0 items-center justify-center rounded-xl bg-red-50 p-3 text-red-600 hover:bg-red-100 disabled:opacity-50"
                title="Cerrar partida sin ganadores"
              >
                <LogOut className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <QuestionView
            question={currentQuestion}
            playerId={playerId}
            triquiWinnerId={gameState.triquiWinnerId}
            triquiWinnerName={triquiWinnerName}
            isHost={isHost}
            answer={gameState.questionAnswer}
            revealed={gameState.questionRevealed}
            onAnswer={(index) => handleAnswer(index, isHost ? gameState.triquiWinnerId : playerId)}
          />

          {isHost ? (
            <div className="flex flex-col gap-3">
              {!gameState.questionRevealed ? (
                <button
                  onClick={() => updateGameState({ questionRevealed: true })}
                  disabled={gameState.questionAnswer === null}
                  className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm disabled:opacity-50"
                >
                  Revelar Respuesta
                </button>
              ) : (
                <button
                  onClick={() => {
                    const isCorrect = gameState.questionAnswer === currentQuestion.correct_index
                    const newScore = { ...gameState.score }
                    
                    if (isCorrect && gameState.triquiWinnerId) {
                      newScore[gameState.triquiWinnerId] = (newScore[gameState.triquiWinnerId] || 0) + 100
                    }

                    updateGameState({
                      phase: 'TRIQUI',
                      board: Array(9).fill(null),
                      turn: gameState.playerO, // Alternar inicio de ronda
                      score: newScore,
                      currentQuestionIndex: gameState.currentQuestionIndex + 1,
                      triquiWinnerId: null,
                      questionAnswer: null,
                      questionRevealed: false,
                    })
                  }}
                  className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm"
                >
                  Siguiente Ronda de Triqui
                </button>
              )}
            </div>
          ) : null}
        </main>
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
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-8 text-zinc-950 relative">
      {/* Modal de inicio de ronda */}
      {showTurnModal ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-xl">
            <h2 className="text-xl font-bold tracking-tight text-zinc-900">
              ¡Nueva Ronda!
            </h2>
            <p className="mt-3 text-zinc-600">
              Es el turno de empezar para:
            </p>
            <p className="mt-2 text-3xl font-black text-blue-600">
              {isPlayerXTurn ? playerXName : isPlayerOTurn ? playerOName : '—'}
            </p>
            <button
              onClick={() => setShowTurnModal(false)}
              className="mt-8 w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm"
            >
              ¡Entendido!
            </button>
          </div>
        </div>
      ) : null}

      <main className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <ScoreBoard players={players} score={gameState.score} />
          {isHost ? (
            <button
              onClick={handleCloseGame}
              disabled={closing}
              className="flex shrink-0 items-center justify-center rounded-xl bg-red-50 p-3 text-red-600 hover:bg-red-100 disabled:opacity-50"
              title="Cerrar partida sin ganadores"
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : null}
        </div>

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

        <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm relative overflow-hidden">
          <div
            className={`absolute bottom-0 left-0 h-1 w-1/2 bg-blue-500 transition-all duration-300 ${
              isPlayerXTurn && !winResult.winner ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`absolute bottom-0 right-0 h-1 w-1/2 bg-rose-500 transition-all duration-300 ${
              isPlayerOTurn && !winResult.winner ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div
            className={`flex flex-col items-center transition-all duration-300 ${
              isPlayerXTurn && !winResult.winner
                ? 'scale-110 opacity-100 drop-shadow-md'
                : 'scale-90 opacity-40'
            }`}
          >
            <div className="text-xl font-black text-blue-500">X</div>
            <span
              className={`text-xs ${
                isPlayerXTurn && !winResult.winner
                  ? 'font-bold text-blue-600'
                  : 'font-medium text-zinc-500'
              }`}
            >
              {playerXName}
            </span>
          </div>

          <div className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-400">
            VS
          </div>

          <div
            className={`flex flex-col items-center transition-all duration-300 ${
              isPlayerOTurn && !winResult.winner
                ? 'scale-110 opacity-100 drop-shadow-md'
                : 'scale-90 opacity-40'
            }`}
          >
            <div className="text-xl font-black text-rose-500">O</div>
            <span
              className={`text-xs ${
                isPlayerOTurn && !winResult.winner
                  ? 'font-bold text-rose-600'
                  : 'font-medium text-zinc-500'
              }`}
            >
              {playerOName}
            </span>
          </div>
        </div>

        <TicTacToeBoard
          board={gameState.board}
          onMove={(index) => handleMove(index, isHost ? gameState.turn : playerId)}
          disabled={(!isHost && playerId !== gameState.turn) || !!winResult.winner || winResult.isDraw}
          winnerLine={winResult.line}
          player1Id={gameState.playerX}
          player2Id={gameState.playerO}
        />

        {isHost && (winResult.winner || winResult.isDraw) ? (
          <div className="flex flex-col gap-3">
            {winResult.winner && currentQuestion ? (
              <button
                className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm"
                onClick={() => {
                  updateGameState({
                    phase: 'QUESTION',
                    triquiWinnerId: winResult.winner,
                  })
                }}
              >
                Ir a Pregunta para el Ganador
              </button>
            ) : null}

            <button
              className={`w-full rounded-xl px-4 py-3 font-medium shadow-sm ${
                winResult.winner && currentQuestion
                  ? 'bg-zinc-200 text-zinc-800' // Botón secundario si hay pregunta
                  : 'bg-zinc-950 text-white' // Botón primario si fue empate o no hay más preguntas
              }`}
              onClick={() => {
                updateGameState({
                  board: Array(9).fill(null),
                  turn: gameState.playerO, // Cambiar quién empieza
                })
              }}
            >
              {winResult.winner && currentQuestion
                ? 'Omitir y Siguiente Ronda'
                : 'Siguiente Ronda de Triqui'}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  )
}
