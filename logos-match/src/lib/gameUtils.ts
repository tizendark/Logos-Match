export type GamePhase = 'LOBBY' | 'TRIQUI' | 'QUESTION' | 'RESULTS' | 'ENDED'

export type GameState = {
  phase: GamePhase
  board: (string | null)[] // 9 cells
  turn: string | null // playerId ('X' or 'O' equivalents)
  playerX?: string | null // playerId assigned to X
  playerO?: string | null // playerId assigned to O
  score: Record<string, number> // playerId -> score
  currentQuestionIndex?: number
  triquiWinnerId?: string | null
  questionAnswer?: number | null // The option index selected
  questionRevealed?: boolean // Host revealed the answer
}

export type WinResult = {
  winner: string | null
  line: number[] | null
  isDraw: boolean
}

/**
 * Función pura que evalúa el estado del tablero de Triqui
 * @param board Array de 9 elementos con los IDs de los jugadores o null
 * @returns Objeto con el ganador (si hay), la línea ganadora, y si es empate
 */
export function checkWinner(board: (string | null)[]): WinResult {
  const lines = [
    [0, 1, 2], // Fila superior
    [3, 4, 5], // Fila central
    [6, 7, 8], // Fila inferior
    [0, 3, 6], // Columna izquierda
    [1, 4, 7], // Columna central
    [2, 5, 8], // Columna derecha
    [0, 4, 8], // Diagonal principal
    [2, 4, 6], // Diagonal secundaria
  ]

  for (const line of lines) {
    const [a, b, c] = line
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line, isDraw: false }
    }
  }

  const isDraw = board.every((cell) => cell !== null)
  return { winner: null, line: null, isDraw }
}
