// Assume yuru_gp_data.json is loaded via an API/fetch call in the real app,
// but since Vite can import JSON statically for the bundle, we can just import it.
import yuruDataRaw from '../../public/yuru_gp_data.json'

export interface YuruCharacterRecord {
    'キャラクタ名': string
    '都道府県': string
    '所属': string
    'PRコメント': string
}

// Ensure the raw data has the expected root shape of Record<string, YuruCharacterRecord>
const yuruData = yuruDataRaw as Record<string, YuruCharacterRecord>

export interface YuruCharacterInfo {
    id: string
    name: string
    prefecture: string
    imagePath: string
}

const PREFECTURE_GROUPS: Record<string, YuruCharacterInfo[]> = {}

// Initialize empty clusters based on raw parsing
Object.entries(yuruData).forEach(([characterId, data]) => {
    const prefecture = data['都道府県']

    // Skip invalid/empty prefectures (e.g. "企業・その他" or overseas)
    if (!prefecture || prefecture === '海外' || prefecture.includes('企業')) {
        return
    }

    if (!PREFECTURE_GROUPS[prefecture]) {
        PREFECTURE_GROUPS[prefecture] = []
    }

    PREFECTURE_GROUPS[prefecture].push({
        id: characterId,
        name: data['キャラクタ名'],
        prefecture,
        imagePath: `/Yuru_Chara_images_all/${characterId}.jpg` // Maps to the public/ folder structure
    })
})

// Filter out prefectures that might have 0 valid characters
export const REAL_PREFECTURE_CHARACTERS = Object.fromEntries(
    Object.entries(PREFECTURE_GROUPS).filter(([_, chars]) => chars.length > 0)
)

export const AVAILABLE_PREFECTURES = Object.keys(REAL_PREFECTURE_CHARACTERS)
