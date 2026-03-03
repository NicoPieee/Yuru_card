export interface SeededRng {
  seed: string
  next: () => number
  int: (maxExclusive: number) => number
  pick: <T>(items: T[]) => T
  shuffle: <T>(items: T[]) => T[]
}

function xmur3(str: string) {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }

  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return (h ^= h >>> 16) >>> 0
  }
}

function mulberry32(a: number) {
  return () => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createSeededRng(seed: string): SeededRng {
  const makeSeed = xmur3(seed)
  const random = mulberry32(makeSeed())

  return {
    seed,
    next: () => random(),
    int: (maxExclusive: number) => {
      if (maxExclusive <= 0) {
        return 0
      }
      return Math.floor(random() * maxExclusive)
    },
    pick: <T>(items: T[]): T => {
      if (items.length === 0) {
        throw new Error('pick called with empty array')
      }
      return items[Math.floor(random() * items.length)]
    },
    shuffle: <T>(items: T[]): T[] => {
      const arr = [...items]
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(random() * (i + 1))
        ;[arr[i], arr[j]] = [arr[j], arr[i]]
      }
      return arr
    },
  }
}
