import type { Agent, BodyPart, Category } from './types'

export const CATEGORY_LABEL: Record<Category, string> = {
  color: '色',
  shape: '形状',
  onomatopoeia: 'オノマトペ',
}

export const DESCRIPTORS: Record<Category, string[]> = {
  color: ['赤色の', '青色の', '黄色の', '緑色の', 'ピンク色の', '紫色の', 'オレンジ色の', '白色の', '黒色の'],
  shape: ['大きい', '小さい', '長い', '短い', '細い', '太い', '丸い'],
  onomatopoeia: ['ふわふわ', 'もこもこ', 'もふもふ', 'つるつる', 'きらきら', 'ころころ', 'ぽてぽて'],
}

export const BODY_PART_RULES: Record<BodyPart, Category[]> = {
  顔: ['color', 'shape', 'onomatopoeia'],
  目: ['color', 'shape'],
  ほっぺ: ['color', 'shape', 'onomatopoeia'],
  口: ['color', 'shape'],
  まゆげ: ['color', 'shape'],
  体: ['color', 'shape', 'onomatopoeia'],
  おなか: ['color', 'shape', 'onomatopoeia'],
  手: ['color', 'shape', 'onomatopoeia'],
  足: ['color', 'shape'],
  服: ['color', 'shape', 'onomatopoeia'],
  帽子: ['color', 'shape', 'onomatopoeia'],
}

export const PREFECTURE_CHARACTERS: Record<string, string[]> = {
  北まる県: ['まるぴょん', 'しらたまん', 'ぽてみ', 'ゆきころ', 'ほわりん', 'しろくる', 'もふ丸', 'なごみん', 'ふゆち', 'とろりん'],
  きらめき県: ['きらにゃ', 'つやぽん', 'ひかりん', 'ぴかり', 'ほしころ', 'きらる', 'ルミたん', 'しんくる', 'ぱぁるん', 'しゅわり'],
  もこもこ県: ['もこた', 'ぽよんぬ', 'ふわち', 'ころたん', 'ぷにべえ', 'もふすけ', 'こっとん', 'ぬくみ', 'ましゅまろ', 'ぽてん'],
}

const AGENT_NAMES = ['審査員1', '審査員2', '審査員3', '審査員4', '審査員5', '審査員6']

export const CATEGORY_LIST: Category[] = ['color', 'shape', 'onomatopoeia']

export function getBodyParts(): BodyPart[] {
  return Object.keys(BODY_PART_RULES) as BodyPart[]
}

export function buildAgents(agentCount: number): Agent[] {
  const agents: Agent[] = []
  for (let i = 0; i < agentCount; i += 1) {
    const like = CATEGORY_LIST[i % CATEGORY_LIST.length]
    const dislike = CATEGORY_LIST[(i + 1) % CATEGORY_LIST.length]
    agents.push({
      id: `agent-${i + 1}`,
      name: AGENT_NAMES[i % AGENT_NAMES.length],
      like,
      dislike,
    })
  }
  return agents
}
