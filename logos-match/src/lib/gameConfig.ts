export type GameTimingConfig = {
  lobbyReadyTimeoutMs: number
  turnDurationMs: number
  questionDurationMs: number
  roundAnswerMs: number
  roundRevealMs: number
  roundIntermissionMs: number
}

export type GameRuleConfig = {
  maxPlayers: number
  maxRounds: number
  allowLateJoin: boolean
  lockAnswerAfterSubmit: boolean
}

export type GameScoringConfig = {
  triviaCorrect: number
  triviaWrong: number
  triviaTimeout: number
}

export type GameConfig = {
  timing: GameTimingConfig
  rules: GameRuleConfig
  scoring: GameScoringConfig
}

export const GAME_CONFIG_LIMITS = {
  maxPlayers: { min: 2, max: 20 },
  maxRounds: { min: 1, max: 50 },
  lobbyReadyTimeoutMs: { min: 10_000, max: 300_000 },
  turnDurationMs: { min: 5_000, max: 120_000 },
  questionDurationMs: { min: 5_000, max: 120_000 },
  roundAnswerMs: { min: 5_000, max: 120_000 },
  roundRevealMs: { min: 0, max: 20_000 },
  roundIntermissionMs: { min: 0, max: 60_000 },
  scoring: {
    triviaCorrect: { min: 0, max: 10_000 },
    triviaWrong: { min: -10_000, max: 0 },
    triviaTimeout: { min: -10_000, max: 0 },
  },
} as const

export const DEFAULT_GAME_CONFIG: GameConfig = {
  timing: {
    lobbyReadyTimeoutMs: 60_000,
    turnDurationMs: 20_000,
    questionDurationMs: 25_000,
    roundAnswerMs: 25_000,
    roundRevealMs: 2_500,
    roundIntermissionMs: 3_000,
  },
  rules: {
    maxPlayers: 8,
    maxRounds: 10,
    allowLateJoin: false,
    lockAnswerAfterSubmit: true,
  },
  scoring: {
    triviaCorrect: 100,
    triviaWrong: 0,
    triviaTimeout: 0,
  },
}
