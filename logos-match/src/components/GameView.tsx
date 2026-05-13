'use client'

import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'

import { TicTacToeBoard } from '@/components/TicTacToeBoard'
import { useGameState } from '@/hooks/useGameState'
import { useHostToken } from '@/hooks/useHostToken'
import { usePlayerPresence } from '@/hooks/usePlayerPresence'
import { checkWinner } from '@/lib/gameUtils'
import type { GameQuestion, Room, RoomPlayer } from '@/lib/models/quiz'
import { QuestionView } from '@/components/QuestionView'
import { ScoreBoard } from '@/components/ScoreBoard'
import { ResultsView } from '@/components/ResultsView'
import { LogOut, Volume2, VolumeX } from 'lucide-react'
import { useGameSounds } from '@/hooks/useGameSounds'
import { triggerConfetti } from '@/utils/confetti'
import { GameStageTransition } from '@/components/GameStageTransition'
import { DEFAULT_GAME_CONFIG } from '@/lib/gameConfig'
import { GameTimer } from '@/components/GameTimer'
import { RoundScoreboard } from '@/components/RoundScoreboard'

export function GameView({ roomId }: { roomId: string }) {
  const hostToken = useHostToken()
  const searchParams = useSearchParams()
  const playerId = searchParams.get('playerId')
  const [room, setRoom] = useState<Room | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [questions, setQuestions] = useState<GameQuestion[]>([])
  const [loading, setLoading] = useState(true)

  const isHost = Boolean(hostToken && room?.host_token === hostToken)
  const [closing, setClosing] = useState(false)
  const [showTurnModal, setShowTurnModal] = useState(false)
  const { isMuted, toggleMute, playPlace, playCorrect, playCorrectPerfect, playWrong, playWin, playClick } = useGameSounds()

  usePlayerPresence(!isHost ? playerId : null)

  const rawTiming = (room?.game_config as { timing?: Record<string, unknown> } | null)?.timing
  const turnDurationMs =
    typeof rawTiming?.turnDurationMs === 'number'
      ? rawTiming.turnDurationMs
      : DEFAULT_GAME_CONFIG.timing.turnDurationMs
  const questionDurationMs =
    typeof rawTiming?.questionDurationMs === 'number'
      ? rawTiming.questionDurationMs
      : typeof rawTiming?.roundAnswerMs === 'number'
        ? rawTiming.roundAnswerMs
        : DEFAULT_GAME_CONFIG.timing.roundAnswerMs

  const rawScoring = (room?.game_config as { scoring?: Record<string, unknown> } | null)?.scoring
  const triviaCorrect =
    typeof rawScoring?.triviaCorrect === 'number'
      ? rawScoring.triviaCorrect
      : DEFAULT_GAME_CONFIG.scoring.triviaCorrect

  const rawRules = (room?.game_config as { rules?: Record<string, unknown> } | null)?.rules
  const maxRounds =
    typeof rawRules?.maxRounds === 'number'
      ? rawRules.maxRounds
      : DEFAULT_GAME_CONFIG.rules.maxRounds

  const timerRequestInFlightRef = useRef(false)

  async function startTimer(durationMs: number) {
    if (!isHost || !hostToken) return
    if (timerRequestInFlightRef.current) return
    if (!durationMs) return
    timerRequestInFlightRef.current = true
    try {
      const res = await fetch(`/api/rooms/${roomId}/timer`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hostToken, durationMs }),
      })
      if (!res.ok) return
      const payload = (await res.json().catch(() => null)) as
        | { timerStartTimestamp?: number; timerDurationMs?: number }
        | null
      const timerStartTimestamp =
        typeof payload?.timerStartTimestamp === 'number'
          ? payload.timerStartTimestamp
          : null
      const timerDurationMs =
        typeof payload?.timerDurationMs === 'number' ? payload.timerDurationMs : null
      if (timerStartTimestamp && timerDurationMs) {
        updateGameState({ timerStartTimestamp, timerDurationMs })
      }
    } catch {
      return
    } finally {
      timerRequestInFlightRef.current = false
    }
  }

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

  const gameStateRef = useRef(gameState)
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

  // Efecto para sonidos de victoria y resultados de trivia
  const [prevPhase, setPrevPhase] = useState(gameState.phase)
  const [prevRevealed, setPrevRevealed] = useState(gameState.questionRevealed)
  
  useEffect(() => {
    if (gameState.phase === 'RESULTS' && prevPhase !== 'RESULTS') {
      playWin()
      triggerConfetti()
    }
    setPrevPhase(gameState.phase)
  }, [gameState.phase, prevPhase, playWin])

  useEffect(() => {
    if (gameState.phase === 'STEAL_ATTEMPT' && prevPhase !== 'STEAL_ATTEMPT') {
      playWrong()
    }
  }, [gameState.phase, prevPhase, playWrong])

  useEffect(() => {
    if (gameState.questionRevealed && !prevRevealed) {
      const currentQ = questions[gameState.currentQuestionIndex ?? 0]
      if (currentQ && gameState.questionAnswer === currentQ.correct_index) {
        if (gameState.phase === 'STEAL_ATTEMPT') {
          playCorrect()
        } else {
          const startedAt = gameState.questionStartedAt ?? null
          const answeredAt = gameState.questionAnsweredAt ?? null
          const elapsed = typeof startedAt === 'number' && typeof answeredAt === 'number'
            ? answeredAt - startedAt
            : null
          const perfectWindowMs = Math.round(DEFAULT_GAME_CONFIG.timing.roundAnswerMs * 0.15)
          if (typeof elapsed === 'number' && elapsed <= perfectWindowMs) {
            playCorrectPerfect()
          } else {
            playCorrect()
          }
        }
      } else if (currentQ) {
        playWrong()
      }
    }
    setPrevRevealed(gameState.questionRevealed)
  }, [gameState.questionRevealed, prevRevealed, gameState.questionAnswer, gameState.currentQuestionIndex, questions, playCorrect, playCorrectPerfect, playWrong, gameState.questionStartedAt, gameState.questionAnsweredAt, gameState.phase])

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
        console.log('GameView load', {
          playerId,
          isHost,
          players: Array.isArray(data.players) ? data.players.length : 0,
          turn: (data.room?.current_state as { turn?: unknown } | undefined)?.turn ?? null,
        })

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
              timerStartTimestamp: null,
              timerDurationMs: null,
            })
            void startTimer(turnDurationMs)
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
  const sessionQuestions = Array.isArray(gameState.triviaQuestions)
    ? gameState.triviaQuestions
    : []
  const currentQuestion =
    sessionQuestions[gameState.currentQuestionIndex ?? 0] ?? null

  useEffect(() => {
    if (!isHost) return
    if (winResult.winner || winResult.isDraw) return

    if (gameState.phase === 'TRIQUI' && gameState.turn) {
      if (!gameState.timerStartTimestamp || !gameState.timerDurationMs) {
        void startTimer(turnDurationMs)
      }
      return
    }

    if (gameState.phase === 'QUESTION') {
      if (!currentQuestion) return
      if (gameState.questionRevealed) return
      if (gameState.questionAnswer !== null) return
      if (!gameState.timerStartTimestamp || !gameState.timerDurationMs) {
        void startTimer(questionDurationMs)
      }
    }

    if (gameState.phase === 'STEAL_ATTEMPT') {
      if (!currentQuestion) return
      if (gameState.questionRevealed) return
      if (gameState.questionAnswer !== null) return
      if (!gameState.timerStartTimestamp || !gameState.timerDurationMs) {
        void startTimer(5000)
      }
    }
    if (gameState.phase === 'ROUND_RESULTS') return
  }, [
    isHost,
    winResult.winner,
    winResult.isDraw,
    currentQuestion,
    gameState.phase,
    gameState.turn,
    gameState.currentQuestionIndex,
    gameState.questionRevealed,
    gameState.questionAnswer,
    gameState.timerStartTimestamp,
    gameState.timerDurationMs,
    turnDurationMs,
    questionDurationMs,
  ])

  useEffect(() => {
    if (!isHost) return
    if (gameState.phase !== 'QUESTION' && gameState.phase !== 'STEAL_ATTEMPT') return
    if (!gameState.questionRevealed) return
    if (!currentQuestion) return

    const isCorrectAnswer = gameState.questionAnswer === currentQuestion.correct_index
    const prevScore = { ...(gameState.score ?? {}) }
    const nextScore = { ...prevScore }

    const awardedToId =
      isCorrectAnswer && gameState.triquiWinnerId ? gameState.triquiWinnerId : null

    if (awardedToId) {
      nextScore[awardedToId] = (nextScore[awardedToId] || 0) + triviaCorrect
    }

    updateGameState({
      phase: 'ROUND_RESULTS',
      score: nextScore,
      roundPrevScore: prevScore,
      roundAwardedToId: awardedToId,
      roundWasSteal: gameState.phase === 'STEAL_ATTEMPT',
      timerStartTimestamp: null,
      timerDurationMs: null,
    })
  }, [
    isHost,
    gameState.phase,
    gameState.questionRevealed,
    gameState.questionAnswer,
    gameState.triquiWinnerId,
    gameState.score,
    currentQuestion,
    triviaCorrect,
    updateGameState,
  ])

  useEffect(() => {
    if (!isHost) return
    const start = gameState.timerStartTimestamp ?? null
    const duration = gameState.timerDurationMs ?? null
    if (!start || !duration) return

    const remaining = start + duration - Date.now()
    if (remaining <= 0) return

    const timeoutId = window.setTimeout(() => {
      const latest = gameStateRef.current
      const latestWin = checkWinner(latest.board)
      if (latestWin.winner || latestWin.isDraw) return

      if (latest.phase === 'TRIQUI' && latest.turn) {
        const nextTurn =
          latest.turn === latest.playerX ? latest.playerO : latest.playerX
        updateGameState({
          turn: nextTurn ?? null,
          timerStartTimestamp: null,
          timerDurationMs: null,
        })
        if (nextTurn) void startTimer(turnDurationMs)
        return
      }

      if (latest.phase === 'QUESTION') {
        if (latest.questionRevealed) return
        if (latest.questionAnswer !== null) return

        window.setTimeout(() => {
          const again = gameStateRef.current
          if (again.phase !== 'QUESTION') return
          if (again.questionRevealed) return
          if (again.questionAnswer !== null) return

          const stealerId =
            again.triquiWinnerId === again.playerX ? again.playerO : again.playerX

          updateGameState({
            phase: 'STEAL_ATTEMPT',
            triquiWinnerId: stealerId ?? null,
            questionAnswer: null,
            questionAnsweredAt: null,
            questionRevealed: false,
            timerStartTimestamp: null,
            timerDurationMs: null,
          })
          void startTimer(5000)
        }, 500)
        return
      }

      if (latest.phase === 'STEAL_ATTEMPT') {
        if (latest.questionRevealed) return
        if (latest.questionAnswer !== null) return
        updateGameState({
          questionRevealed: true,
          timerStartTimestamp: null,
          timerDurationMs: null,
        })
      }
    }, remaining + 20)

    return () => window.clearTimeout(timeoutId)
  }, [
    isHost,
    gameState.timerStartTimestamp,
    gameState.timerDurationMs,
    gameState.phase,
    gameState.turn,
    gameState.playerX,
    gameState.playerO,
    gameState.questionRevealed,
    gameState.questionAnswer,
    winResult.winner,
    winResult.isDraw,
    turnDurationMs,
  ])

  // Trigger confetti when someone wins a round
  const [prevWinner, setPrevWinner] = useState<string | null>(null)
  useEffect(() => {
    if (winResult.winner && prevWinner !== winResult.winner) {
      triggerConfetti()
    }
    setPrevWinner(winResult.winner)
  }, [winResult.winner, prevWinner])

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
      timerStartTimestamp: null,
      timerDurationMs: null,
    })
    void startTimer(turnDurationMs)
  }

  // Lógica de avance automático para el Host
  useEffect(() => {
    if (!isHost) return

    let timeout: number | null = null

    // Si la fase es Triqui y hay un resultado definitivo, esperar 5s y avanzar
    if (gameState.phase === 'TRIQUI' && (winResult.winner || winResult.isDraw)) {
      if (gameState.timerStartTimestamp || gameState.timerDurationMs) {
        updateGameState({ timerStartTimestamp: null, timerDurationMs: null })
      }
      timeout = window.setTimeout(() => {
        if (winResult.isDraw) {
          updateGameState({
            board: Array(9).fill(null),
            turn: gameState.playerO,
            timerStartTimestamp: null,
            timerDurationMs: null,
          })
          return
        }

        if (!winResult.winner || !hostToken) return

        const questionsPerSession = 2 + Math.floor(Math.random() * 3)

        fetch(`/api/rooms/${roomId}/trivia-session`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ hostToken, count: questionsPerSession }),
        })
          .then((r) => r.json())
          .then((payload) => {
            const qs = Array.isArray(payload?.questions) ? payload.questions : []
            if (!qs.length) {
              updateGameState({
                phase: 'RESULTS',
                timerStartTimestamp: null,
                timerDurationMs: null,
              })
              return
            }

            updateGameState({
              phase: 'QUESTION',
              triviaQuestions: qs.slice(0, questionsPerSession),
              questionsPerSession,
              sessionOwnerId: winResult.winner,
              currentQuestionIndex: 0,
              triquiWinnerId: winResult.winner,
              questionAnswer: null,
              questionRevealed: false,
              questionStartedAt: Date.now(),
              questionAnsweredAt: null,
              roundPrevScore: null,
              roundAwardedToId: null,
              roundWasSteal: null,
              timerStartTimestamp: null,
              timerDurationMs: null,
            })
            void startTimer(questionDurationMs)
          })
          .catch(() => {})
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
    gameState.playerO,
    gameState.timerStartTimestamp,
    gameState.timerDurationMs,
    roomId,
    hostToken,
    questionDurationMs,
    startTimer,
    updateGameState,
  ])

  function handleAnswer(index: number, answerPlayerId: string | null) {
    if (!isHost) {
      if (answerPlayerId === gameState.triquiWinnerId) {
        sendPlayerAction({ type: 'ANSWER_QUESTION', index, playerId: answerPlayerId })
      }
      return
    }

    if (gameState.phase !== 'QUESTION' && gameState.phase !== 'STEAL_ATTEMPT') return
    if (gameState.questionRevealed) return
    if (gameState.triquiWinnerId !== answerPlayerId) return

    updateGameState({
      questionAnswer: index,
      questionAnsweredAt: Date.now(),
      timerStartTimestamp: null,
      timerDurationMs: null,
    })
  }

  async function handleCloseGame() {
    playClick()
    if (!isHost || closing) return
    const confirm = window.confirm('¿Seguro que deseas cerrar la sesión y eliminar la sala para todos?')
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

  let content = null

  if (loading) {
    content = (
      <div key="loading" className="flex flex-1 items-center justify-center bg-stone-50 h-full w-full">
        <p className="text-stone-500">Cargando partida...</p>
      </div>
    )
  } else if (gameState.phase === 'RESULTS') {
    content = (
      <div key="results" className="flex flex-1 flex-col items-center bg-stone-50 px-4 py-8 text-slate-900 overflow-y-auto h-full w-full">
        <ResultsView players={players} score={gameState.score} />
        {isHost ? (
          <div className="mt-8 w-full max-w-md px-4 pb-8">
            <button
              onClick={handleCloseGame}
              disabled={closing}
              className="w-full rounded-xl bg-red-600 px-4 py-3 text-base font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              Cerrar sesión (Eliminar Sala)
            </button>
          </div>
        ) : (
          <div className="mt-8 w-full max-w-md px-4 pb-8 text-center text-stone-500">
            Esperando a que el Host cierre la sesión...
          </div>
        )}
      </div>
    )
  } else if (gameState.phase === 'ROUND_RESULTS') {
    const aPlayer = players.find((p) => p.id === gameState.playerX) ?? null
    const bPlayer = players.find((p) => p.id === gameState.playerO) ?? null
    const prevScore = gameState.roundPrevScore ?? {}
    const maxScore = Math.max(1, maxRounds * triviaCorrect)
    const awardedTo = gameState.roundAwardedToId ?? null
    const awardedName = awardedTo
      ? players.find((p) => p.id === awardedTo)?.name ?? '—'
      : null
    const wasSteal = Boolean(gameState.roundWasSteal)

    const nextIndex = (gameState.currentQuestionIndex ?? 0) + 1
    const sessionTotal =
      typeof gameState.questionsPerSession === 'number'
        ? gameState.questionsPerSession
        : sessionQuestions.length
    const hasMoreQuestions = nextIndex < Math.max(0, sessionTotal)
    const reachedGoal = Object.values(gameState.score ?? {}).some(
      (s) => typeof s === 'number' && s >= maxScore,
    )

    content = (
      <div key="round-results" className="flex flex-1 flex-col items-center bg-stone-50 px-4 py-8 text-slate-900 h-full w-full">
        <main className="flex w-full max-w-md flex-col gap-6">
          <div className="text-center">
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {awardedName ? `¡PUNTO PARA ${awardedName}!` : 'NADIE SUMÓ ESTA VEZ'}
            </h1>
            {wasSteal && awardedName ? (
              <div className="mt-3 inline-flex rounded-full bg-amber-100 px-4 py-1 text-xs font-black text-amber-800">
                ¡Gran Robo!
              </div>
            ) : wasSteal ? (
              <div className="mt-3 inline-flex rounded-full bg-stone-200 px-4 py-1 text-xs font-black text-stone-700">
                Robo fallido
              </div>
            ) : null}
          </div>

          <RoundScoreboard
            playerA={aPlayer}
            playerB={bPlayer}
            prevScore={prevScore}
            score={gameState.score}
            maxScore={maxScore}
            awardedToId={awardedTo}
          />

          {isHost ? (
            <button
              className="w-full rounded-xl bg-slate-900 px-4 py-3 font-bold text-white shadow-sm"
              onClick={() => {
                playClick()
                if (reachedGoal) {
                  updateGameState({
                    phase: 'RESULTS',
                    triviaQuestions: null,
                    questionsPerSession: null,
                    sessionOwnerId: null,
                    currentQuestionIndex: 0,
                    roundPrevScore: null,
                    roundAwardedToId: null,
                    roundWasSteal: null,
                    timerStartTimestamp: null,
                    timerDurationMs: null,
                  })
                  return
                }
                if (hasMoreQuestions) {
                  updateGameState({
                    phase: 'QUESTION',
                    currentQuestionIndex: nextIndex,
                    triquiWinnerId: gameState.sessionOwnerId ?? null,
                    questionAnswer: null,
                    questionRevealed: false,
                    questionStartedAt: Date.now(),
                    questionAnsweredAt: null,
                    roundPrevScore: null,
                    roundAwardedToId: null,
                    roundWasSteal: null,
                    timerStartTimestamp: null,
                    timerDurationMs: null,
                  })
                  return
                }
                updateGameState({
                  phase: 'TRIQUI',
                  board: Array(9).fill(null),
                  turn: gameState.playerO,
                  triviaQuestions: null,
                  questionsPerSession: null,
                  sessionOwnerId: null,
                  currentQuestionIndex: 0,
                  triquiWinnerId: null,
                  questionAnswer: null,
                  questionRevealed: false,
                  questionStartedAt: null,
                  questionAnsweredAt: null,
                  roundPrevScore: null,
                  roundAwardedToId: null,
                  roundWasSteal: null,
                  timerStartTimestamp: null,
                  timerDurationMs: null,
                })
              }}
            >
              {reachedGoal
                ? 'Ver Resultados Finales'
                : hasMoreQuestions
                  ? 'Siguiente Pregunta'
                  : 'Siguiente Ronda'}
            </button>
          ) : (
            <div className="text-center text-sm text-stone-500">
              Esperando al Host…
            </div>
          )}
        </main>
      </div>
    )
  } else if ((gameState.phase === 'QUESTION' || gameState.phase === 'STEAL_ATTEMPT') && currentQuestion) {
    const triquiWinnerName =
      players.find((p) => p.id === gameState.triquiWinnerId)?.name || 'Jugador'

    const isStealAttempt = gameState.phase === 'STEAL_ATTEMPT'

    content = (
      <motion.div
        key="question"
        className={`flex flex-1 flex-col items-center px-4 py-8 text-zinc-950 h-full w-full ${
          isStealAttempt ? 'bg-amber-50' : 'bg-zinc-50'
        }`}
        animate={
          isStealAttempt
            ? { backgroundColor: ['#FFFBEB', '#FEF3C7', '#FFFBEB'] }
            : undefined
        }
        transition={isStealAttempt ? { duration: 0.9, repeat: Infinity } : undefined}
      >
        <main className="flex w-full max-w-md flex-col gap-6">
          <div className="flex items-center justify-between">
            <ScoreBoard players={players} score={gameState.score} />
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="ml-2 flex shrink-0 items-center justify-center rounded-xl bg-stone-100 p-3 text-stone-600 hover:bg-stone-200 transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
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
          </div>

          <GameTimer
            startTimestamp={gameState.timerStartTimestamp ?? null}
            durationMs={gameState.timerDurationMs ?? null}
            variant={isStealAttempt ? 'steal' : 'normal'}
            playTick={playClick}
            playBuzzer={playWrong}
          />

          {typeof gameState.questionsPerSession === 'number' ? (
            <div className="flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm border border-stone-100">
              <div className="text-sm font-bold text-slate-900">
                Pregunta {(gameState.currentQuestionIndex ?? 0) + 1} de {gameState.questionsPerSession}
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: gameState.questionsPerSession }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-2 w-2 rounded-full ${
                      i <= (gameState.currentQuestionIndex ?? 0)
                        ? 'bg-emerald-500'
                        : 'bg-stone-200'
                    }`}
                    animate={
                      i === (gameState.currentQuestionIndex ?? 0)
                        ? { scale: [1, 1.25, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.35 }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <motion.div
            key={`q-${gameState.currentQuestionIndex ?? 0}-${gameState.phase}`}
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.22 }}
          >
            <QuestionView
              question={currentQuestion}
              playerId={playerId}
              triquiWinnerId={gameState.triquiWinnerId ?? null}
              triquiWinnerName={triquiWinnerName}
              isHost={isHost}
              mode={isStealAttempt ? 'steal' : 'question'}
              answer={gameState.questionAnswer ?? null}
              revealed={gameState.questionRevealed ?? false}
              onAnswer={(index) => handleAnswer(index, isHost ? (gameState.triquiWinnerId ?? null) : playerId)}
            />
          </motion.div>

          {isHost ? (
            <div className="flex flex-col gap-3">
              {!gameState.questionRevealed ? (
                <button
                  onClick={() => {
                    playClick()
                    updateGameState({
                      questionRevealed: true,
                      timerStartTimestamp: null,
                      timerDurationMs: null,
                    })
                  }}
                  disabled={gameState.questionAnswer === null}
                  className="w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm disabled:opacity-50"
                >
                  Revelar Respuesta
                </button>
              ) : null}
            </div>
          ) : null}
        </main>
      </motion.div>
    )
  } else {
    const playerXName =
      players.find((p) => p.id === gameState.playerX)?.name || 'Jugador X'
    const playerOName =
      players.find((p) => p.id === gameState.playerO)?.name || 'Jugador O'

    const isPlayerXTurn = gameState.turn === gameState.playerX
    const isPlayerOTurn = gameState.turn === gameState.playerO

    content = (
      <div key="triqui" className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-8 text-zinc-950 relative h-full w-full">
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
                onClick={() => {
                  playClick()
                  setShowTurnModal(false)
                }}
                className="mt-8 w-full rounded-xl bg-zinc-950 px-4 py-3 font-medium text-white shadow-sm"
              >
                ¡Entendido!
              </button>
            </div>
          </div>
        ) : null}

        <main className="flex w-full max-w-md flex-col gap-8">
          <div className="flex items-center justify-between">
            <ScoreBoard players={players} score={gameState.score} />
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="ml-2 flex shrink-0 items-center justify-center rounded-xl bg-stone-100 p-3 text-stone-600 hover:bg-stone-200 transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
              >
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
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
          </div>

          <GameTimer
            startTimestamp={gameState.timerStartTimestamp ?? null}
            durationMs={gameState.timerDurationMs ?? null}
            playTick={playClick}
            playBuzzer={playWrong}
          />

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

          <div className="mx-auto mb-6 flex w-full max-w-[320px] sm:max-w-sm items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-stone-100">
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
            onMove={(index) => handleMove(index, playerId)}
            disabled={
              isHost ||
              !playerId ||
              playerId !== gameState.turn ||
              !!winResult.winner ||
              winResult.isDraw
            }
            winnerLine={winResult.line}
            player1Id={gameState.playerX ?? null}
            player2Id={gameState.playerO ?? null}
            playPlace={playPlace}
          />

          {isHost && (winResult.winner || winResult.isDraw) ? (
            <div className="flex flex-col gap-3">
              {winResult.winner && currentQuestion ? (
                <button
                  className="w-full rounded-xl bg-slate-900 px-4 py-3 font-medium text-white shadow-sm"
                  onClick={() => {
                    playClick()
                    updateGameState({
                      phase: 'QUESTION',
                      triquiWinnerId: winResult.winner,
                      questionStartedAt: Date.now(),
                      questionAnsweredAt: null,
                      questionAnswer: null,
                      questionRevealed: false,
                      timerStartTimestamp: null,
                      timerDurationMs: null,
                    })
                  }}
                >
                  Ir a Pregunta para el Ganador
                </button>
              ) : null}

              <button
                className={`w-full rounded-xl px-4 py-3 font-medium shadow-sm ${
                  winResult.winner && currentQuestion
                    ? 'bg-stone-200 text-stone-800' // Botón secundario si hay pregunta
                    : 'bg-slate-900 text-white' // Botón primario si fue empate o no hay más preguntas
                }`}
                onClick={() => {
                  playClick()
                  if (!currentQuestion) {
                    updateGameState({
                      phase: 'RESULTS',
                      timerStartTimestamp: null,
                      timerDurationMs: null,
                    })
                  } else {
                    updateGameState({
                      board: Array(9).fill(null),
                      turn: gameState.playerO, // Cambiar quién empieza
                      timerStartTimestamp: null,
                      timerDurationMs: null,
                    })
                  }
                }}
              >
                {!currentQuestion
                  ? 'Ver Resultados'
                  : winResult.winner
                  ? 'Omitir y Siguiente Ronda'
                  : 'Siguiente Ronda de Triqui'}
              </button>
            </div>
          ) : null}
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-1 w-full h-full relative overflow-hidden">
      <GameStageTransition stageKey={loading ? 'loading' : gameState.phase}>
        {content}
      </GameStageTransition>
    </div>
  )
}
