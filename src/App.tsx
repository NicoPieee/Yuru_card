import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type SyntheticEvent } from 'react'
import './App.css'
import { canPlace, createInitialState, gameReducer } from './game/engine'
import { CATEGORY_LABEL } from './game/data'
import { AVAILABLE_PREFECTURES, AVAILABLE_REGIONS, PREFECTURES_BY_REGION, REAL_PREFECTURE_CHARACTERS, getRegionByPrefecture } from './game/yuruData'
import type { AnnotationCard, Category, DescriptorCard, JudgeReactionTone, WhereCard } from './game/types'

const DEFAULT_SEED = 'yuru-2026'
const CHARACTER_FALLBACK_IMAGE = '/image.png'
const START_SCREEN_ROW_COUNT = 4
const START_SCREEN_IMAGES_PER_ROW = 18
const START_SCREEN_IMAGE_POOL = Object.values(REAL_PREFECTURE_CHARACTERS)
  .flatMap((characters) => characters.map((character) => character.imagePath))
const DEFAULT_PREFECTURE = AVAILABLE_PREFECTURES[0] ?? ''
const DEFAULT_REGION = getRegionByPrefecture(DEFAULT_PREFECTURE)

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
  const [playerCount, setPlayerCount] = useState(2)
  const [selectedRegion, setSelectedRegion] = useState(DEFAULT_REGION)
  const [selectedPrefecture, setSelectedPrefecture] = useState(DEFAULT_PREFECTURE)
  const [showStartScreen, setShowStartScreen] = useState(true)
  const [showGameTutorial, setShowGameTutorial] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedWhereId, setSelectedWhereId] = useState<string | null>(null)
  const [selectedDescriptorId, setSelectedDescriptorId] = useState<string | null>(null)
  const [selectedDiscardIds, setSelectedDiscardIds] = useState<string[]>([])

  const [cheerBanner, setCheerBanner] = useState<string | null>(null)
  const [reactionPopup, setReactionPopup] = useState<{ agentId: string; message: string; tone: JudgeReactionTone } | null>(null)
  const [reactionBurst, setReactionBurst] = useState<string | null>(null)
  const [reactionTone, setReactionTone] = useState<JudgeReactionTone>('neutral')
  const [turnStartMessage, setTurnStartMessage] = useState<string | null>(null)
  const [enteringCharacterIds, setEnteringCharacterIds] = useState<string[]>([])
  const previousFieldIdsRef = useRef<string[]>([])

  const [state, dispatch] = useReducer(gameReducer, null, () => createInitialState(DEFAULT_SEED, 2))

  const regionOptions = useMemo(() => [...AVAILABLE_REGIONS], [])

  const prefectureOptions = useMemo(
    () => [...(PREFECTURES_BY_REGION[selectedRegion] ?? [])],
    [selectedRegion],
  )

  useEffect(() => {
    if (prefectureOptions.length === 0) {
      return
    }
    if (!prefectureOptions.includes(selectedPrefecture)) {
      setSelectedPrefecture(prefectureOptions[0])
    }
  }, [prefectureOptions, selectedPrefecture])

  const startScreenRows = useMemo(() => {
    const source = START_SCREEN_IMAGE_POOL.length > 0 ? START_SCREEN_IMAGE_POOL : [CHARACTER_FALLBACK_IMAGE]
    return Array.from({ length: START_SCREEN_ROW_COUNT }, (_, rowIndex) => {
      return Array.from({ length: START_SCREEN_IMAGES_PER_ROW }, (_, imageIndex) => {
        const sourceIndex = (rowIndex * START_SCREEN_IMAGES_PER_ROW + imageIndex) % source.length
        return source[sourceIndex]
      })
    })
  }, [])

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
    let turnStartTimer: number | undefined
    let turnStartHideTimer: number | undefined

    setCheerBanner(state.lastPlacementCheer.message)
    setReactionPopup(null)
    setReactionBurst(null)
    setTurnStartMessage(null)

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

        const nextPlayer = state.players[state.currentPlayerIndex]
        turnStartTimer = window.setTimeout(() => {
          setTurnStartMessage(`${nextPlayer.name}のターン`)
          turnStartHideTimer = window.setTimeout(() => {
            setTurnStartMessage(null)
          }, 2000)
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
      if (turnStartTimer) {
        window.clearTimeout(turnStartTimer)
      }
      if (turnStartHideTimer) {
        window.clearTimeout(turnStartHideTimer)
      }
    }
  }, [state.currentPlayerIndex, state.lastJudgeReaction, state.lastPlacementCheer, state.players])

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

  const resetGame = (showTutorial = true) => {
    const randomSeed = `yuru-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-4)}`
    dispatch({
      type: 'RESET_GAME',
      payload: {
        seed: randomSeed,
        playerCount,
        prefecture: selectedPrefecture,
      },
    })
    setShowGameTutorial(showTutorial)
    setSelectedWhereId(null)
    setSelectedDescriptorId(null)
    setSelectedDiscardIds([])
    setSettingsOpen(false)
    setCheerBanner(null)
    setReactionPopup(null)
    setReactionBurst(null)
  }

  const backToStartScreen = () => {
    setShowStartScreen(true)
    setShowGameTutorial(false)
    setSettingsOpen(false)
    setSelectedWhereId(null)
    setSelectedDescriptorId(null)
    setSelectedDiscardIds([])
    setCheerBanner(null)
    setReactionPopup(null)
    setReactionBurst(null)
    setTurnStartMessage(null)
  }

  const startGame = () => {
    resetGame(true)
    setShowStartScreen(false)
  }

  return (
    <div className="app">
      {showStartScreen && (
        <div className="start-screen" aria-label="スタート画面">
          <div className="start-screen-bg" aria-hidden="true">
            {startScreenRows.map((rowImages, rowIndex) => (
              <div
                key={`start-row-${rowIndex}`}
                className={`start-screen-row ${rowIndex % 2 === 0 ? 'forward' : 'reverse'}`}
                style={{
                  '--start-row-duration': `${44 + rowIndex * 6}s`,
                  '--start-row-delay': `-${rowIndex * 5}s`,
                } as CSSProperties}
              >
                {[...rowImages, ...rowImages].map((imagePath, imageIndex) => (
                  <div key={`start-image-${rowIndex}-${imageIndex}`} className="start-screen-image-chip">
                    <img
                      className="start-screen-image"
                      src={imagePath}
                      alt="ゆるキャラ"
                      loading="lazy"
                      onError={handleCharacterImageError}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="start-screen-card">
            <h1>Yuru Card</h1>
            <p className="start-screen-caption">地方 → 県（ステージ） → プレイヤー数の順に選んで開始しよう！</p>
            <div className="controls">
              <label>
                地方
                <select value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>{region}</option>
                  ))}
                </select>
              </label>
              <label>
                県（ステージ）
                <select value={selectedPrefecture} onChange={(e) => setSelectedPrefecture(e.target.value)}>
                  {prefectureOptions.map((prefecture) => (
                    <option key={prefecture} value={prefecture}>{prefecture}</option>
                  ))}
                </select>
              </label>
              <label>
                プレイヤー数
                <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                </select>
              </label>
              <button type="button" onClick={startGame}>ゲーム開始</button>
            </div>
          </div>
        </div>
      )}

      {showGameTutorial && !showStartScreen && (
        <section className="tutorial-overlay" role="dialog" aria-modal="true" aria-label="遊び方ガイド">
          <div className="tutorial-card">
            <h2>かんたん遊び方ガイド</h2>
            <ol className="tutorial-steps">
              <li>手札から「どこが」1枚 + 「どういう」1枚を選ぶ</li>
              <li>場のゆるキャラをクリックして配置し、点数を獲得する</li>
              <li>毎ターン2ドロー。手札が多すぎると捨て札調整が必要</li>
              <li>ラウンド終了時、合計点が高いプレイヤーが有利</li>
            </ol>
            <div className="tutorial-ui-note">
              左: 審査員とスコア / 右上: ラウンド情報 / 下: 手札と配置先
            </div>
            <button type="button" onClick={() => setShowGameTutorial(false)}>OK、はじめる</button>
          </div>
        </section>
      )}

      {cheerBanner && <div className="fx-banner fx-cheer">{cheerBanner}</div>}
      {reactionBurst && <div className={`fx-banner fx-reaction tone-${reactionTone}`}>{reactionBurst}</div>}
      {turnStartMessage && <div className="fx-banner fx-turn-start">{turnStartMessage}</div>}
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
            <button type="button" onClick={() => resetGame(true)}>もう一回あそぶ</button>
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
                  プレイヤー数
                  <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
                <button
                  onClick={() => resetGame(true)}
                >
                  新規ゲーム
                </button>
                <button
                  type="button"
                  onClick={backToStartScreen}
                >
                  スタート画面に戻る
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

                <button
                  onClick={() => {
                    dispatch({ type: 'REFRESH_HAND' })
                    setSelectedWhereId(null)
                    setSelectedDescriptorId(null)
                  }}
                  disabled={state.gameOver || state.usedEscapeThisTurn || inOverflowDiscardMode}
                >
                  -2ptして手札入れ替え
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
