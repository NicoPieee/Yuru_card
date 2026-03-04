import type { Agent, BodyPart, Category } from './types'

export const CATEGORY_LABEL: Record<Category, string> = {
  color: '色',
  shape: '形状',
  onomatopoeia: 'オノマトペ',
}

export const DESCRIPTORS: Record<Category, string[]> = {
  color: ['赤い', '青い', '黄色い', '緑色', 'ピンク', '紫色', 'オレンジ', '白い', '黒い'],
  shape: ['大きい', '小さい', '長い', '短い', '細い', '太い', '丸い'],
  onomatopoeia: ['ふわふわ', 'もこもこ', 'もふもふ', 'つやつや', 'きらきら', 'ころころ', 'ぽてぽて'],
}

export const BODY_PART_RULES: Record<BodyPart, Category[]> = {
  顔: ['color', 'shape'],
  目: ['color'],
  ほっぺ: ['color', 'shape', 'onomatopoeia'],
  口: ['color'],
  まゆげ: ['color'],
  体: ['color', 'shape', 'onomatopoeia'],
  おなか: ['color', 'shape', 'onomatopoeia'],
  手: ['shape', 'onomatopoeia'],
  足: ['shape'],
  服: ['color', 'shape', 'onomatopoeia'],
  帽子: ['color', 'shape', 'onomatopoeia'],
}

export const PREFECTURE_CHARACTERS: Record<string, string[]> = {
  北まる県: ['まるぴょん', 'しらたまん', 'ぽてみ', 'ゆきころ', 'ほわりん', 'しろくる', 'もふ丸', 'なごみん', 'ふゆち', 'とろりん'],
  きらめき県: ['きらにゃ', 'つやぽん', 'ひかりん', 'ぴかり', 'ほしころ', 'きらる', 'ルミたん', 'しんくる', 'ぱぁるん', 'しゅわり'],
  もこもこ県: ['もこた', 'ぽよんぬ', 'ふわち', 'ころたん', 'ぷにべえ', 'もふすけ', 'こっとん', 'ぬくみ', 'ましゅまろ', 'ぽてん'],
}

const AGENT_NAMES = ['さくら審査員', 'あおい審査員', 'もも審査員', 'くろ審査員', 'みどり審査員', 'ゆず審査員']

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
