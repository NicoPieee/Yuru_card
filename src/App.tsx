import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import './App.css'
import { canPlace, createInitialState, gameReducer } from './game/engine'
import { CATEGORY_LABEL } from './game/data'
import type { AnnotationCard, Category, DescriptorCard, JudgeReactionTone, WhereCard } from './game/types'

const DEFAULT_SEED = 'yuru-2026'
const CHARACTER_FALLBACK_IMAGE = '/image.png'

function isWhereCard(card: AnnotationCard): card is WhereCard {
  return card.type === 'where'
}

function isDescriptorCard(card: AnnotationCard): card is DescriptorCard {
  return card.type === 'descriptor'
}

function categoryClass(category: string) {
  return `cat-badge cat-${category}`
}

const CATEGORY_ICON: Record<string, string> = {
  color: '🎨',
  shape: '🔷',
  onomatopoeia: '✨',
}

const CATEGORY_ORDER: Record<Category, number> = {
  color: 0,
  shape: 1,
  onomatopoeia: 2,
}

function handleCharacterImageError(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget
  if (image.dataset.fallbackApplied === 'true') {
    return
  }
  image.dataset.fallbackApplied = 'true'
  image.src = CHARACTER_FALLBACK_IMAGE
}

function getFanLayout(total: number) {
  if (total <= 10) {
    return { width: 142, overlap: 38, angleStep: 2.2, liftStep: 2 }
  }
  if (total <= 12) {
    return { width: 134, overlap: 46, angleStep: 1.9, liftStep: 1.8 }
  }
  if (total <= 14) {
    return { width: 126, overlap: 54, angleStep: 1.6, liftStep: 1.5 }
  }
  return { width: 118, overlap: 60, angleStep: 1.35, liftStep: 1.2 }
}

function fanCardStyle(index: number, total: number, selected: boolean): CSSProperties {
  const layout = getFanLayout(total)
  const center = (total - 1) / 2
  const offset = index - center
  return {
    '--fan-rotate': `${offset * layout.angleStep}deg`,
    '--fan-lift': `${Math.abs(offset) * layout.liftStep}px`,
    '--fan-overlap': `${-layout.overlap}px`,
    '--fan-width': `${layout.width}px`,
    zIndex: selected ? 40 : index + 1,
  } as CSSProperties
}

function App() {
  const [seedInput, setSeedInput] = useState(DEFAULT_SEED)
  const [playerCount, setPlayerCount] = useState(2)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedWhereId, setSelectedWhereId] = useState<string | null>(null)
  const [selectedDescriptorId, setSelectedDescriptorId] = useState<string | null>(null)
  const [selectedDiscardIds, setSelectedDiscardIds] = useState<string[]>([])

  const [cheerBanner, setCheerBanner] = useState<string | null>(null)
  const [reactionPopup, setReactionPopup] = useState<{ agentId: string; message: string; tone: JudgeReactionTone } | null>(null)
  const [reactionBurst, setReactionBurst] = useState<string | null>(null)
  const [reactionTone, setReactionTone] = useState<JudgeReactionTone>('neutral')
  const [enteringCharacterIds, setEnteringCharacterIds] = useState<string[]>([])
  const previousFieldIdsRef = useRef<string[]>([])

  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState(DEFAULT_SEED, 2))

  const currentPlayer = state.players[state.currentPlayerIndex]
  const hand = currentPlayer.hand
  const whereCards = useMemo(() => hand.filter(isWhereCard), [hand])
  const descriptorCards = useMemo(
    () => hand
      .filter(isDescriptorCard)
      .sort((a, b) => {
        const categoryDiff = CATEGORY_ORDER[a.category] - CATEGORY_ORDER[b.category]
        if (categoryDiff !== 0) {
          return categoryDiff
        }
        return a.text.localeCompare(b.text, 'ja')
      }),
    [hand],
  )
  const sortedHand = useMemo<AnnotationCard[]>(
    () => [...whereCards, ...descriptorCards],
    [whereCards, descriptorCards],
  )
  const pendingDiscardCount = state.pendingOverflowDiscard
  const inOverflowDiscardMode = pendingDiscardCount > 0

  const selectedWhere = useMemo(() => {
    const card = hand.find((item) => item.id === selectedWhereId)
    return card && isWhereCard(card) ? card : null
  }, [hand, selectedWhereId])

  const selectedDescriptor = useMemo(() => {
    const card = hand.find((item) => item.id === selectedDescriptorId)
    return card && isDescriptorCard(card) ? card : null
  }, [hand, selectedDescriptorId])

  const pairValid = canPlace(selectedWhere, selectedDescriptor)

  useEffect(() => {
    if (!inOverflowDiscardMode) {
      setSelectedDiscardIds([])
      return
    }

    setSelectedWhereId(null)
    setSelectedDescriptorId(null)
    setSelectedDiscardIds((current) => {
      const handIds = new Set(hand.map((card) => card.id))
      const filtered = current.filter((id) => handIds.has(id))
      return filtered.slice(0, pendingDiscardCount)
    })
  }, [hand, inOverflowDiscardMode, pendingDiscardCount])

  useEffect(() => {
    const currentIds = state.fieldCharacters.map((character) => character.id)
    const previousIds = previousFieldIdsRef.current
    const enteringIds = currentIds.filter((id) => !previousIds.includes(id))
    previousFieldIdsRef.current = currentIds

    if (enteringIds.length === 0) {
      return
    }

    setEnteringCharacterIds((current) => [...new Set([...current, ...enteringIds])])
    const timer = window.setTimeout(() => {
      setEnteringCharacterIds((current) => current.filter((id) => !enteringIds.includes(id)))
    }, 1700)

    return () => window.clearTimeout(timer)
  }, [state.fieldCharacters])

  useEffect(() => {
    if (!state.lastPlacementCheer) {
      return
    }

    let burstTimer: number | undefined
    let reactionHideTimer: number | undefined

    setCheerBanner(state.lastPlacementCheer.message)
    setReactionPopup(null)
    setReactionBurst(null)

    const cheerTimer = window.setTimeout(() => {
      setCheerBanner(null)
      if (state.lastJudgeReaction) {
        setReactionTone(state.lastJudgeReaction.tone)
        setReactionPopup(state.lastJudgeReaction)
        setReactionBurst(state.lastJudgeReaction.message)

        burstTimer = window.setTimeout(() => {
          setReactionBurst(null)
        }, 1700)

        reactionHideTimer = window.setTimeout(() => {
          setReactionPopup(null)
        }, 3700)
      }
    }, 1800)

    return () => {
      window.clearTimeout(cheerTimer)
      if (burstTimer) {
        window.clearTimeout(burstTimer)
      }
      if (reactionHideTimer) {
        window.clearTimeout(reactionHideTimer)
      }
    }
  }, [state.lastPlacementCheer?.id, state.lastJudgeReaction])

  const actionMessage = selectedWhere && selectedDescriptor
    ? pairValid
      ? '配置可能です。置きたいゆるキャラをクリックしてください。'
      : 'その組み合わせは制約違反です（配置不可）。'
    : inOverflowDiscardMode
      ? `手札が ${pendingDiscardCount} 枚オーバーしています。捨てるカードを選択してください。`
    : state.usedEscapeThisTurn
      ? 'ドロー後は、配置するかスキップ。'
      : '配置するカードを選択してください。'
  const winnerNames = state.players.filter((player) => state.winnerIds.includes(player.id)).map((player) => player.name)
  const rankedPlayers = [...state.players].sort((a, b) => b.score - a.score)

  const resetGame = () => {
    dispatch({ type: 'RESET_GAME', payload: { seed: seedInput || DEFAULT_SEED, playerCount } })
    setSelectedWhereId(null)
    setSelectedDescriptorId(null)
    setSelectedDiscardIds([])
    setSettingsOpen(false)
    setCheerBanner(null)
    setReactionPopup(null)
    setReactionBurst(null)
  }

  const randomizeSeed = () => {
    const randomPart = Math.random().toString(36).slice(2, 8)
    const timePart = Date.now().toString(36).slice(-4)
    setSeedInput(`yuru-${randomPart}-${timePart}`)
  }

  return (
    <div className="app">
      {cheerBanner && <div className="fx-banner fx-cheer">{cheerBanner}</div>}
      {reactionBurst && <div className={`fx-banner fx-reaction tone-${reactionTone}`}>{reactionBurst}</div>}
      {state.gameOver && (
        <section className="gameover-overlay" role="dialog" aria-modal="true" aria-label="ゲーム終了">
          <div className="gameover-card">
            <h2>ゲーム終了！</h2>
            <p className="gameover-stage">ステージ: {state.currentPrefecture}</p>
            <p className="gameover-winner">優勝: {winnerNames.join(' / ')}</p>
            <div className="gameover-ranking">
              {rankedPlayers.map((player, index) => (
                <div key={player.id} className="gameover-rank-row">
                  <span>#{index + 1} {player.name}</span>
                  <strong>{player.score} 点</strong>
                </div>
              ))}
            </div>
            <button type="button" onClick={resetGame}>もう一回あそぶ</button>
          </div>
        </section>
      )}

      <header className="top-strip">
        <div className="status-inline">
          <span className="status-chip">ラウンド {state.round} / {state.config.maxRounds}</span>
          <span className="status-chip">ステージ: {state.currentPrefecture}</span>
          <span className="status-chip">手番: {currentPlayer.name}</span>
          <span className="status-chip">審査員: {state.currentJudge.name}</span>
        </div>

        <div className="settings-menu">
          <button
            className="menu-button"
            type="button"
            aria-label="ゲーム設定"
            onClick={() => setSettingsOpen((open) => !open)}
          >
            ⋯
          </button>
          {settingsOpen && (
            <section className="settings-popover">
              <h2>ゲーム設定</h2>
              <div className="controls">
                <label>
                  Seed
                  <div className="seed-input-row">
                    <input value={seedInput} onChange={(e) => setSeedInput(e.target.value)} />
                    <button
                      type="button"
                      className="seed-random-button"
                      onClick={randomizeSeed}
                      aria-label="Seedをランダム生成"
                    >
                      🎲
                    </button>
                  </div>
                </label>
                <label>
                  プレイヤー数
                  <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
                <button
                  onClick={resetGame}
                >
                  新規ゲーム
                </button>
              </div>
            </section>
          )}
        </div>
      </header>

      <div className="layout">
        <aside className="info-panel">
          <section>
            <h2>審査員プール</h2>
            <div className="judge-stack">
              {state.judgePool.map((agent) => {
                const isCurrent = agent.id === state.currentJudge.id
                const reaction = reactionPopup?.agentId === agent.id ? reactionPopup : null
                const insight = state.judgeInsights[agent.id]
                const judgeItemClass = ['judge-item', isCurrent ? 'current' : '', reaction ? 'reaction-active' : '']
                  .filter(Boolean)
                  .join(' ')
                return (
                  <div key={agent.id} className={judgeItemClass}>
                    <div className="judge-line">
                      <span className={isCurrent ? 'agent current' : 'agent'}>{agent.name}</span>
                    </div>
                    <div className="judge-pref">
                      <div className="judge-pref-row">
                        <span className="judge-pref-label">好き：</span>
                        <span className="judge-pref-value">{insight?.like ? CATEGORY_LABEL[insight.like] : ''}</span>
                      </div>
                      <div className="judge-pref-row">
                        <span className="judge-pref-label">嫌い：</span>
                        <span className="judge-pref-value">{insight?.dislike ? CATEGORY_LABEL[insight.dislike] : ''}</span>
                      </div>
                    </div>
                    {reaction && (
                      <div className={`judge-bubble tone-${reaction.tone} reacting`}>
                        {reaction.message}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <section>
            <h2>スコア</h2>
            <div className="scores">
              {state.players.map((player) => (
                <div key={player.id} className={player.id === currentPlayer.id ? 'score-card active' : 'score-card'}>
                  {player.name}: {player.score} 点
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2>アクション</h2>
            <div className="action-row">
              <div className="action-buttons">
                <button
                  onClick={() => {
                    dispatch({ type: 'TAKE_ESCAPE' })
                    setSelectedWhereId(null)
                    setSelectedDescriptorId(null)
                  }}
                  disabled={state.gameOver || state.usedEscapeThisTurn || inOverflowDiscardMode}
                >
                  -1ptして2ドロー
                </button>

                {inOverflowDiscardMode && (
                  <button
                    className="discard-button"
                    onClick={() => {
                      dispatch({ type: 'DISCARD_OVERFLOW', payload: { cardIds: selectedDiscardIds } })
                    }}
                    disabled={state.gameOver || selectedDiscardIds.length !== pendingDiscardCount}
                  >
                    選択したカードを捨てる（{selectedDiscardIds.length}/{pendingDiscardCount}）
                  </button>
                )}

                {state.usedEscapeThisTurn && !inOverflowDiscardMode && (
                  <button
                    className="skip-button"
                    onClick={() => {
                      dispatch({ type: 'TAKE_SKIP' })
                      setSelectedWhereId(null)
                      setSelectedDescriptorId(null)
                    }}
                    disabled={state.gameOver}
                  >
                    スキップ
                  </button>
                )}
              </div>
              <span className={pairValid ? 'action-note ready' : 'action-note'}>{actionMessage}</span>
            </div>
          </section>
        </aside>

        <main className="play-panel">
          <section className="character-section" aria-label="場のゆるキャラ">
            <div className="characters">
              {state.fieldCharacters.map((character, index) => {
                const placeable = pairValid && !inOverflowDiscardMode
                const entering = enteringCharacterIds.includes(character.id)
                const characterClassName = ['character', placeable ? 'placeable' : '', entering ? 'entering' : '']
                  .filter(Boolean)
                  .join(' ')
                const characterStyle = entering
                  ? ({ '--enter-delay': `${index * 90}ms` } as CSSProperties)
                  : undefined
                return (
                  <button
                    key={character.id}
                    className={characterClassName}
                    style={characterStyle}
                    onClick={() => {
                      if (!selectedWhere || !selectedDescriptor || !pairValid || state.gameOver) {
                        return
                      }
                      dispatch({
                        type: 'PLAY_PLACEMENT',
                        payload: {
                          whereCardId: selectedWhere.id,
                          descriptorCardId: selectedDescriptor.id,
                          characterId: character.id,
                        },
                      })
                      setSelectedWhereId(null)
                      setSelectedDescriptorId(null)
                    }}
                    disabled={!placeable || state.gameOver}
                  >
                    <div className="character-head">
                      <div className="character-name">{character.name}</div>
                      <div className="character-pref">@ {character.prefecture}</div>
                    </div>
                    <div className="character-image-wrap">
                      <img
                        className="character-image"
                        src={character.imagePath}
                        alt={`${character.name}の画像`}
                        loading="lazy"
                        onError={handleCharacterImageError}
                      />
                    </div>
                    <div className="progress">セット数: {character.placements.length} / 3</div>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="hand-section" aria-label="手札">
            <div className="hand-list fan-list">
              {sortedHand.map((card, index) => {
                const whereCard = isWhereCard(card)
                const selected = whereCard ? selectedWhereId === card.id : selectedDescriptorId === card.id
                const discardMarked = selectedDiscardIds.includes(card.id)
                const cardTypeClass = whereCard ? 'card-type-where' : 'card-type-descriptor'
                const descriptorToneClass = isDescriptorCard(card) ? `descriptor-${card.category}` : ''
                const cardClasses = [
                  'card',
                  'fan-card',
                  cardTypeClass,
                  descriptorToneClass,
                  selected ? 'selected' : '',
                  discardMarked ? 'discard-marked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <button
                    key={card.id}
                    className={cardClasses}
                    style={fanCardStyle(index, sortedHand.length, selected)}
                    onClick={() => {
                      if (inOverflowDiscardMode) {
                        setSelectedDiscardIds((current) => {
                          if (current.includes(card.id)) {
                            return current.filter((id) => id !== card.id)
                          }
                          if (current.length >= pendingDiscardCount) {
                            return current
                          }
                          return [...current, card.id]
                        })
                        return
                      }
                      if (whereCard) {
                        setSelectedWhereId((current) => (current === card.id ? null : card.id))
                      } else {
                        setSelectedDescriptorId((current) => (current === card.id ? null : card.id))
                      }
                    }}
                  >
                    <div className="card-title">{whereCard ? card.bodyPart : card.text}</div>
                    {whereCard ? (
                      <ul className="allow-list">
                        {card.allowedCategories.map((category) => (
                          <li key={`${card.id}-${category}`}>・{CATEGORY_LABEL[category]}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className={categoryClass(card.category)}>
                        {CATEGORY_ICON[card.category]} {CATEGORY_LABEL[card.category]}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
