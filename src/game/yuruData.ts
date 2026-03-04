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

const REGION_PREFECTURE_ORDER: Record<string, string[]> = {
    '北海道・東北': ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県'],
    '関東': ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県'],
    '中部': ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県'],
    '近畿': ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県'],
    '中国': ['鳥取県', '島根県', '岡山県', '広島県', '山口県'],
    '四国': ['徳島県', '香川県', '愛媛県', '高知県'],
    '九州・沖縄': ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'],
}

const availablePrefectureSet = new Set(AVAILABLE_PREFECTURES)

export const PREFECTURES_BY_REGION = Object.fromEntries(
    Object.entries(REGION_PREFECTURE_ORDER)
        .map(([region, prefectures]) => [
            region,
            prefectures.filter((prefecture) => availablePrefectureSet.has(prefecture)),
        ])
        .filter(([, prefectures]) => (prefectures as string[]).length > 0)
) as Record<string, string[]>

export const AVAILABLE_REGIONS = Object.keys(PREFECTURES_BY_REGION)

export function getRegionByPrefecture(prefecture: string): string {
    const match = Object.entries(PREFECTURES_BY_REGION).find(([, prefectures]) => prefectures.includes(prefecture))
    return match?.[0] ?? AVAILABLE_REGIONS[0] ?? ''
}
