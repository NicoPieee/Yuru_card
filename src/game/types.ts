export type Category = 'color' | 'shape' | 'onomatopoeia'

import type { YuruCharacterInfo } from './yuruData'

export type CardType = 'where' | 'descriptor'

export interface BaseCard {
  id: string
  type: CardType
}

export interface WhereCard extends BaseCard {
  type: 'where'
  bodyPart: BodyPart
  allowedCategories: Category[]
}

export interface DescriptorCard extends BaseCard {
  type: 'descriptor'
  category: Category
  text: string
}

export type AnnotationCard = WhereCard | DescriptorCard

export type BodyPart =
  | '顔'
  | '目'
  | 'ほっぺ'
  | '口'
  | 'まゆげ'
  | '体'
  | 'おなか'
  | '手'
  | '足'
  | '服'
  | '帽子'

export interface Placement {
  whereCard: WhereCard
  descriptorCard: DescriptorCard
  judgeId: string
  scored: number
  byPlayerId: string
}

export interface CharacterCard {
  id: string
  name: string
  prefecture: string
  imagePath: string
  placements: Placement[]
}

export interface Agent {
  id: string
  name: string
  like: Category
  dislike: Category
}

export type JudgeReactionTone = 'like' | 'neutral' | 'dislike' | 'bad'

export interface JudgeReaction {
  agentId: string
  message: string
  tone: JudgeReactionTone
}

export interface JudgePreferenceInsight {
  like: Category | null
  dislike: Category | null
}

export interface PlacementCheer {
  id: string
  message: string
}

export interface PlayerState {
  id: string
  name: string
  score: number
  hand: AnnotationCard[]
}

export interface TurnLog {
  id: string
  round: number
  playerName: string
  judgeName: string
  action: 'placement' | 'escape' | 'skip' | 'discard' | 'system'
  message: string
}

export interface GameConfig {
  seed: string
  playerCount: number
  maxRounds: number
  handLimit: number
  startingHand: number
}

export interface GameState {
  config: GameConfig
  round: number
  turnInRound: number
  currentPlayerIndex: number
  currentPrefecture: string
  roundPrefectures: string[]
  players: PlayerState[]
  fieldCharacters: CharacterCard[]
  annotationDeck: AnnotationCard[]
  discardPile: AnnotationCard[]
  judgePool: Agent[]
  judgeInsights: Record<string, JudgePreferenceInsight>
  currentJudge: Agent
  characterPools: Record<string, YuruCharacterInfo[]>
  characterCursor: Record<string, number>
  nextCharacterSerial: number
  logs: TurnLog[]
  usedEscapeThisTurn: boolean
  pendingOverflowDiscard: number
  lastJudgeReaction: JudgeReaction | null
  lastPlacementCheer: PlacementCheer | null
  gameOver: boolean
  winnerIds: string[]
}

export type PlayResult = {
  score: number
  naturalnessPenalty: number
}

export type GameAction =
  | { type: 'RESET_GAME'; payload: { seed: string; playerCount: number } }
  | {
    type: 'PLAY_PLACEMENT'
    payload: {
      whereCardId: string
      descriptorCardId: string
      characterId: string
    }
  }
  | { type: 'TAKE_ESCAPE' }
  | { type: 'TAKE_SKIP' }
  | {
    type: 'DISCARD_OVERFLOW'
    payload: {
      cardIds: string[]
    }
  }
