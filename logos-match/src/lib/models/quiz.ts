export type QuestionTemplate = {
  id: string
  title: string
  description: string | null
  difficulty: string | null
  category: string | null
  is_published: boolean
  created_at: string
}

export type TemplateQuestion = {
  id: string
  template_id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string | null
  tags: string[] | null
  created_at: string
}

export type CustomQuiz = {
  id: string
  title: string
  host_token: string
  created_at: string
}

export type CustomQuizQuestion = {
  id: string
  quiz_id: string
  prompt: string
  options: string[]
  correct_index: number
  explanation: string | null
  created_at: string
}

export type RoomStatus = 'lobby' | 'playing' | 'results' | 'ended'

export type Room = {
  id: string
  code: string
  host_token: string
  status: RoomStatus
  game_config: unknown
  current_state: unknown
  created_at: string
}

export type RoomPlayer = {
  id: string
  room_id: string
  name: string
  score: number
  status: 'connected' | 'disconnected'
  created_at: string
}

export type GameQuestion = {
  id: string
  room_id: string
  source_type: 'template' | 'custom'
  source_id: string | null
  prompt: string
  options: string[]
  correct_index: number
  order_index: number
  explanation?: string | null
  created_at: string
}

export type QuizDraftQuestion = {
  prompt: string
  options: string[]
  correctIndex: number
  explanation?: string
}

export type QuizDraft = {
  title: string
  questions: QuizDraftQuestion[]
}

