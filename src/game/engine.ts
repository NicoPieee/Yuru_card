import { CATEGORY_LABEL, CATEGORY_LIST, DESCRIPTORS, buildAgents, getBodyParts } from './data'
import { REAL_PREFECTURE_CHARACTERS, AVAILABLE_PREFECTURES } from './yuruData'
import type { YuruCharacterInfo } from './yuruData'
import { createSeededRng } from './rng'
import type { Agent, AnnotationCard, BodyPart, Category, CharacterCard, DescriptorCard, GameAction, GameState, JudgeReaction, JudgePreferenceInsight, Placement, PlayerState, WhereCard } from './types'

const DEFAULT_MAX_ROUNDS = 3
const FIELD_SIZE = 3
const THREE_CATEGORY_RATE = 0.2
const STARTING_WHERE_CARDS = 5
const STARTING_DESCRIPTOR_CARDS = 5

function makeCardId(prefix: string, serial: number) {
  return `${prefix}-${serial}`
}

function rollAllowedCategories(rng: ReturnType<typeof createSeededRng>): Category[] {
  if (rng.next() < THREE_CATEGORY_RATE) {
    return [...CATEGORY_LIST]
  }

  const excluded = CATEGORY_LIST[rng.int(CATEGORY_LIST.length)]
  return CATEGORY_LIST.filter((category) => category !== excluded)
}

function buildAnnotationDeck(seed: string): AnnotationCard[] {
  const rng = createSeededRng(`${seed}:annotation`)
  const deck: AnnotationCard[] = []
  let serial = 1

  for (let copy = 0; copy < 2; copy += 1) {
    for (const bodyPart of getBodyParts()) {
      deck.push({
        id: makeCardId('where', serial),
        type: 'where',
        bodyPart,
        allowedCategories: rollAllowedCategories(rng),
      })
      serial += 1
    }

    for (const category of CATEGORY_LIST) {
      for (const text of DESCRIPTORS[category]) {
        deck.push({
          id: makeCardId('desc', serial),
          type: 'descriptor',
          category,
          text,
        })
        serial += 1
      }
    }
  }

  return rng.shuffle(deck)
}

function drawCards(state: GameState, count: number): AnnotationCard[] {
  const drawn: AnnotationCard[] = []

  for (let i = 0; i < count; i += 1) {
    if (state.annotationDeck.length === 0) {
      if (state.discardPile.length === 0) {
        break
      }
      const rng = createSeededRng(`${state.config.seed}:reshuffle:${state.logs.length}:${i}`)
      state.annotationDeck = rng.shuffle(state.discardPile)
      state.discardPile = []
    }

    const card = state.annotationDeck.shift()
    if (card) {
      drawn.push(card)
    }
  }

  return drawn
}

function drawCardByType(state: GameState, cardType: AnnotationCard['type'], salt: string): AnnotationCard | null {
  let attempts = 0

  while (attempts < 2) {
    const index = state.annotationDeck.findIndex((card) => card.type === cardType)
    if (index >= 0) {
      const [card] = state.annotationDeck.splice(index, 1)
      return card ?? null
    }

    if (state.discardPile.length === 0) {
      return null
    }

    const rng = createSeededRng(`${state.config.seed}:init-reshuffle:${salt}:${attempts}`)
    state.annotationDeck = rng.shuffle(state.discardPile)
    state.discardPile = []
    attempts += 1
  }

  return null
}

function drawInitialHand(state: GameState): AnnotationCard[] {
  const hand: AnnotationCard[] = []

  for (let i = 0; i < STARTING_WHERE_CARDS; i += 1) {
    const card = drawCardByType(state, 'where', `where-${i}`)
    if (!card) {
      break
    }
    hand.push(card)
  }

  for (let i = 0; i < STARTING_DESCRIPTOR_CARDS; i += 1) {
    const card = drawCardByType(state, 'descriptor', `desc-${i}`)
    if (!card) {
      break
    }
    hand.push(card)
  }

  return hand
}

function drawBalancedRefreshHand(state: GameState): AnnotationCard[] {
  const hand: AnnotationCard[] = []

  for (let i = 0; i < STARTING_WHERE_CARDS; i += 1) {
    const card = drawCardByType(state, 'where', `refresh-where-${i}`)
    if (!card) {
      break
    }
    hand.push(card)
  }

  for (let i = 0; i < STARTING_DESCRIPTOR_CARDS; i += 1) {
    const card = drawCardByType(state, 'descriptor', `refresh-desc-${i}`)
    if (!card) {
      break
    }
    hand.push(card)
  }

  return hand
}

function getPlayer(state: GameState): PlayerState {
  return state.players[state.currentPlayerIndex]
}

function chooseJudge(seed: string, turnKey: string, pool: Agent[]): Agent {
  const rng = createSeededRng(`${seed}:judge:${turnKey}`)
  return pool[rng.int(pool.length)]
}

function buildTurnKey(state: Pick<GameState, 'round' | 'currentPlayerIndex' | 'turnInRound'>): string {
  return `${state.round}-${state.currentPlayerIndex}-${state.turnInRound}`
}

function buildRoundPrefectures(seed: string, maxRounds: number): string[] {
  const rng = createSeededRng(`${seed}:round-prefectures`)
  const rounds: string[] = []
  for (let i = 0; i < maxRounds; i += 1) {
    rounds.push(AVAILABLE_PREFECTURES[rng.int(AVAILABLE_PREFECTURES.length)])
  }
  return rounds
}

function buildCharacterPools(seed: string): { pools: Record<string, YuruCharacterInfo[]>; cursor: Record<string, number> } {
  const pools: Record<string, YuruCharacterInfo[]> = {}
  const cursor: Record<string, number> = {}

  Object.entries(REAL_PREFECTURE_CHARACTERS).forEach(([prefecture, characters]) => {
    const rng = createSeededRng(`${seed}:chars:${prefecture}`)
    pools[prefecture] = rng.shuffle([...characters])
    cursor[prefecture] = 0
  })

  return { pools, cursor }
}

function nextCharacterFromPrefecture(state: GameState, prefecture: string): CharacterCard {
  const characters = state.characterPools[prefecture]
  let cursor = state.characterCursor[prefecture]

  if (cursor >= characters.length) {
    const rng = createSeededRng(`${state.config.seed}:chars:refresh:${prefecture}:${state.nextCharacterSerial}`)
    state.characterPools[prefecture] = rng.shuffle([...REAL_PREFECTURE_CHARACTERS[prefecture]])
    state.characterCursor[prefecture] = 0
    cursor = 0
  }

  const charInfo = state.characterPools[prefecture][cursor]
  state.characterCursor[prefecture] += 1

  const card: CharacterCard = {
    id: `char-${state.nextCharacterSerial}-${charInfo.id}`,
    name: charInfo.name,
    prefecture,
    imagePath: charInfo.imagePath,
    placements: [],
  }

  state.nextCharacterSerial += 1
  return card
}

function scorePlacement(judge: Agent, whereCard: WhereCard, descriptor: DescriptorCard): { score: number; naturalnessPenalty: number } {
  let score = 1
  if (judge.like === descriptor.category) {
    score = 2
  }
  if (judge.dislike === descriptor.category) {
    score = 0
  }

  let naturalnessPenalty = 0
  const unnaturalParts: BodyPart[] = ['目', '口', 'まゆげ']
  if (descriptor.category === 'onomatopoeia' && unnaturalParts.includes(whereCard.bodyPart)) {
    naturalnessPenalty = -1
  }

  return {
    score: score + naturalnessPenalty,
    naturalnessPenalty,
  }
}

function buildJudgeReaction(judge: Agent, descriptor: DescriptorCard, naturalnessPenalty: number): JudgeReaction {
  if (naturalnessPenalty < 0) {
    return {
      agentId: judge.id,
      message: 'ダメです',
      tone: 'bad',
    }
  }
  if (judge.like === descriptor.category) {
    return {
      agentId: judge.id,
      message: 'いいね！',
      tone: 'like',
    }
  }
  if (judge.dislike === descriptor.category) {
    return {
      agentId: judge.id,
      message: 'まあまあ',
      tone: 'dislike',
    }
  }
  return {
    agentId: judge.id,
    message: 'OK!',
    tone: 'neutral',
  }
}

function formatPlacementSummary(whereCard: WhereCard, descriptor: DescriptorCard): string {
  return `${whereCard.bodyPart} + ${descriptor.text}(${CATEGORY_LABEL[descriptor.category]})`
}

function getOverflowCount(state: GameState, player: PlayerState): number {
  return Math.max(0, player.hand.length - state.config.handLimit)
}

function labelCard(card: AnnotationCard): string {
  if (card.type === 'where') {
    return `どこが:${card.bodyPart}`
  }
  return `どういう:${card.text}`
}

function advanceTurn(state: GameState) {
  if (state.gameOver) {
    return
  }

  if (state.currentPlayerIndex >= state.players.length - 1) {
    state.currentPlayerIndex = 0
    state.turnInRound = 0
    state.round += 1
    if (state.round > state.config.maxRounds) {
      state.gameOver = true
      const max = Math.max(...state.players.map((p) => p.score))
      state.winnerIds = state.players.filter((p) => p.score === max).map((p) => p.id)
      state.logs.unshift({
        id: `log-${state.logs.length + 1}`,
        round: state.config.maxRounds,
        playerName: 'システム',
        judgeName: '-',
        action: 'system',
        message: `ゲーム終了。最高得点は ${max} 点。`,
      })
      return
    }
  } else {
    state.currentPlayerIndex += 1
    state.turnInRound += 1
  }

  const turnKey = buildTurnKey(state)
  state.currentJudge = chooseJudge(state.config.seed, turnKey, state.judgePool)
  state.usedEscapeThisTurn = false
}

function initPlayers(playerCount: number): PlayerState[] {
  return Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i + 1}`,
    name: `プレイヤー${i + 1}`,
    score: 0,
    hand: [],
  }))
}

function refillCharacterField(state: GameState) {
  state.fieldCharacters = state.fieldCharacters.filter((character) => character.prefecture === state.currentPrefecture)

  while (state.fieldCharacters.length < FIELD_SIZE) {
    state.fieldCharacters.push(nextCharacterFromPrefecture(state, state.currentPrefecture))
  }
}

export function createInitialState(seed: string, playerCount: number, startPrefecture?: string): GameState {
  const roundPrefectures = buildRoundPrefectures(seed, DEFAULT_MAX_ROUNDS)
  if (startPrefecture && REAL_PREFECTURE_CHARACTERS[startPrefecture]) {
    roundPrefectures[0] = startPrefecture
  }
  const { pools, cursor } = buildCharacterPools(seed)
  const judgePool = buildAgents(4)
  const judgeInsights = judgePool.reduce<Record<string, JudgePreferenceInsight>>((acc, judge) => {
    acc[judge.id] = { like: null, dislike: null }
    return acc
  }, {})

  const state: GameState = {
    config: {
      seed,
      playerCount,
      maxRounds: DEFAULT_MAX_ROUNDS,
      handLimit: 10,
      startingHand: 10,
    },
    round: 1,
    turnInRound: 0,
    currentPlayerIndex: 0,
    currentPrefecture: roundPrefectures[0],
    roundPrefectures,
    players: initPlayers(playerCount),
    fieldCharacters: [],
    annotationDeck: buildAnnotationDeck(seed),
    discardPile: [],
    judgePool,
    judgeInsights,
    currentJudge: judgePool[0],
    characterPools: pools,
    characterCursor: cursor,
    nextCharacterSerial: 1,
    logs: [],
    usedEscapeThisTurn: false,
    pendingOverflowDiscard: 0,
    lastJudgeReaction: null,
    lastPlacementCheer: null,
    gameOver: false,
    winnerIds: [],
  }

  for (const player of state.players) {
    player.hand.push(...drawInitialHand(state))
  }

  refillCharacterField(state)
  state.currentJudge = chooseJudge(seed, buildTurnKey(state), state.judgePool)
  state.logs.unshift({
    id: 'log-1',
    round: 1,
    playerName: 'システム',
    judgeName: state.currentJudge.name,
    action: 'system',
    message: `ゲーム開始。第1ラウンドは ${state.currentPrefecture}。審査員は ${state.currentJudge.name}。`,
  })

  return state
}

function isValidPair(whereCard: WhereCard, descriptorCard: DescriptorCard): boolean {
  return whereCard.allowedCategories.includes(descriptorCard.category)
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET_GAME') {
    return createInitialState(action.payload.seed, action.payload.playerCount, action.payload.prefecture)
  }

  if (state.gameOver) {
    return state
  }

  const nextState: GameState = {
    ...state,
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    fieldCharacters: state.fieldCharacters.map((ch) => ({ ...ch, placements: [...ch.placements] })),
    annotationDeck: [...state.annotationDeck],
    discardPile: [...state.discardPile],
    logs: [...state.logs],
    judgeInsights: Object.fromEntries(
      Object.entries(state.judgeInsights).map(([id, insight]) => [id, { ...insight }]),
    ),
    characterPools: Object.fromEntries(Object.entries(state.characterPools).map(([k, v]) => [k, [...v]])),
    characterCursor: { ...state.characterCursor },
  }

  const player = getPlayer(nextState)

  if (action.type === 'DISCARD_OVERFLOW') {
    const required = nextState.pendingOverflowDiscard
    if (required <= 0) {
      return state
    }

    const uniqueIds = [...new Set(action.payload.cardIds)]
    if (uniqueIds.length !== required) {
      return state
    }

    const keep = player.hand.filter((card) => !uniqueIds.includes(card.id))
    const discarded = player.hand.filter((card) => uniqueIds.includes(card.id))
    if (discarded.length !== required) {
      return state
    }

    player.hand = keep
    nextState.discardPile.push(...discarded)
    nextState.pendingOverflowDiscard = 0
    nextState.lastJudgeReaction = null
    nextState.lastPlacementCheer = null
    nextState.logs.unshift({
      id: `log-${nextState.logs.length + 1}`,
      round: nextState.round,
      playerName: player.name,
      judgeName: nextState.currentJudge.name,
      action: 'discard',
      message: `${player.name}は手札調整で ${discarded.map((card) => labelCard(card)).join(' / ')} を捨てた。`,
    })
    return nextState
  }

  if (action.type === 'TAKE_ESCAPE') {
    if (nextState.usedEscapeThisTurn || nextState.pendingOverflowDiscard > 0) {
      return state
    }

    player.hand.push(...drawCards(nextState, 2))
    nextState.pendingOverflowDiscard = Math.min(2, player.hand.length)

    nextState.logs.unshift({
      id: `log-${nextState.logs.length + 1}`,
      round: nextState.round,
      playerName: player.name,
      judgeName: nextState.currentJudge.name,
      action: 'escape',
      message: `${player.name}は2ドローして、入れ替える2枚を選択中。`,
    })

    nextState.usedEscapeThisTurn = true
    nextState.lastJudgeReaction = null
    nextState.lastPlacementCheer = null
    return nextState
  }

  if (action.type === 'REFRESH_HAND') {
    if (nextState.usedEscapeThisTurn || nextState.pendingOverflowDiscard > 0) {
      return state
    }

    player.score -= 1
    nextState.discardPile.push(...player.hand)
    player.hand = drawBalancedRefreshHand(nextState)
    nextState.pendingOverflowDiscard = getOverflowCount(nextState, player)

    nextState.logs.unshift({
      id: `log-${nextState.logs.length + 1}`,
      round: nextState.round,
      playerName: player.name,
      judgeName: nextState.currentJudge.name,
      action: 'refresh',
      message: `${player.name}は-1ptして手札を全て入れ替えた。`,
    })

    nextState.usedEscapeThisTurn = true
    nextState.lastJudgeReaction = null
    nextState.lastPlacementCheer = null
    return nextState
  }

  if (action.type === 'TAKE_SKIP') {
    if (!nextState.usedEscapeThisTurn || nextState.pendingOverflowDiscard > 0) {
      return state
    }

    nextState.logs.unshift({
      id: `log-${nextState.logs.length + 1}`,
      round: nextState.round,
      playerName: player.name,
      judgeName: nextState.currentJudge.name,
      action: 'skip',
      message: `${player.name}はドロー後にスキップ。`,
    })

    nextState.lastJudgeReaction = null
    nextState.lastPlacementCheer = null
    advanceTurn(nextState)
    return nextState
  }

  if (nextState.pendingOverflowDiscard > 0) {
    return state
  }

  const whereIndex = player.hand.findIndex((card) => card.id === action.payload.whereCardId && card.type === 'where')
  const descriptorIndex = player.hand.findIndex(
    (card) => card.id === action.payload.descriptorCardId && card.type === 'descriptor',
  )

  if (whereIndex < 0 || descriptorIndex < 0) {
    return state
  }

  const whereCard = player.hand[whereIndex] as WhereCard
  const descriptorCard = player.hand[descriptorIndex] as DescriptorCard

  if (!isValidPair(whereCard, descriptorCard)) {
    return state
  }

  const target = nextState.fieldCharacters.find((character) => character.id === action.payload.characterId)
  if (!target) {
    return state
  }

  const { score, naturalnessPenalty } = scorePlacement(nextState.currentJudge, whereCard, descriptorCard)
  const placementFxId = `fx-${nextState.logs.length + 1}`
  nextState.lastPlacementCheer = {
    id: placementFxId,
    message: `「${whereCard.bodyPart}」「${descriptorCard.text}」かわいい！`,
  }
  const judgeReaction = buildJudgeReaction(nextState.currentJudge, descriptorCard, naturalnessPenalty)
  nextState.lastJudgeReaction = judgeReaction
  const insight = nextState.judgeInsights[nextState.currentJudge.id]
  if (insight) {
    if (judgeReaction.tone === 'like') {
      insight.like = descriptorCard.category
    } else if (judgeReaction.tone === 'dislike') {
      insight.dislike = descriptorCard.category
    }
  }
  const placement: Placement = {
    whereCard,
    descriptorCard,
    judgeId: nextState.currentJudge.id,
    scored: score,
    byPlayerId: player.id,
  }

  target.placements.push(placement)
  player.score += score

  const removeIds = new Set([whereCard.id, descriptorCard.id])
  const consumed = player.hand.filter((card) => removeIds.has(card.id))
  player.hand = player.hand.filter((card) => !removeIds.has(card.id))
  nextState.discardPile.push(...consumed)

  const naturalnessText = naturalnessPenalty === 0 ? '' : '（不自然 -1）'
  nextState.logs.unshift({
    id: `log-${nextState.logs.length + 1}`,
    round: nextState.round,
    playerName: player.name,
    judgeName: nextState.currentJudge.name,
    action: 'placement',
    message: `${player.name} が ${target.name} に ${formatPlacementSummary(whereCard, descriptorCard)} を配置。${score}点 ${naturalnessText}`,
  })

  if (target.placements.length >= 3) {
    nextState.logs.unshift({
      id: `log-${nextState.logs.length + 1}`,
      round: nextState.round,
      playerName: 'システム',
      judgeName: nextState.currentJudge.name,
      action: 'system',
      message: `${target.name} が完成して退場。新しいゆるキャラを補充。`,
    })
    nextState.fieldCharacters = nextState.fieldCharacters.filter((c) => c.id !== target.id)
    refillCharacterField(nextState)
  }

  player.hand.push(...drawCards(nextState, 2))
  advanceTurn(nextState)

  return nextState
}

export function canPlace(whereCard: WhereCard | null, descriptorCard: DescriptorCard | null): boolean {
  if (!whereCard || !descriptorCard) {
    return false
  }
  return isValidPair(whereCard, descriptorCard)
}
