# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```


# Yuru Card - ゲーム概要（現状）

## 1. ゲーム概要
**Yuru Card** は、カードを使って進行するカジュアルゲーム。  
プレイヤーは手札・場札・効果を使って、勝利条件の達成を目指す。

> このREADMEは「現状の仕様整理用」です。実装に合わせて更新してください。

---

## 2. 現在の目的
- ゲームの基本ループ（開始 → ターン進行 → 終了）を成立させる
- 最低限のUIでプレイ可能にする
- ルール・効果・勝敗判定を段階的に追加する

---

## 3. ゲームの流れ（基本）
1. **ゲーム開始**
   - デッキをシャッフル
   - 初期手札を配る
2. **ターン開始**
   - ドロー（必要なら）
   - ターン開始時効果の処理
3. **メイン行動**
   - カードを出す
   - 効果を発動する
   - 必要に応じて追加行動
4. **ターン終了**
   - ターン終了時効果の処理
   - 次プレイヤーへ交代
5. **勝敗判定**
   - 勝利条件を満たした時点で終了

---

## 4. 現状の機能（実装チェック）
- [ ] タイトル/開始画面
- [ ] ゲーム画面表示
- [ ] デッキ・手札管理
- [ ] カード使用処理
- [ ] 効果処理（単体）
- [ ] ターン制御
- [ ] 勝敗判定
- [ ] リザルト画面
- [ ] リスタート導線

---

## 5. 画面構成（想定）
- **タイトル画面**
  - Start / Option / Quit
- **ゲーム画面**
  - プレイヤー情報（HP/スコアなど）
  - 手札エリア
  - 場エリア
  - ログ表示
- **リザルト画面**
  - 勝者表示
  - 再戦 / タイトルへ戻る

---

## 6. ルール詳細（暫定）
- 手札上限: `TODO`
- 1ターンの行動回数: `TODO`
- カードコスト制: `TODO`
- 勝利条件:
  - `TODO: 例）相手HPを0にする / 目標スコア達成`

---

## 7. データ設計メモ（暫定）

### Card
- id
- name
- type
- cost
- effect
- rarity（任意）

### Player
- id
- hp / score
- hand[]
- deck[]
- discard[]

### GameState
- currentTurnPlayer
- phase
- boardState
- log[]

---

## 8. 今後のタスク
1. 仕様FIX（勝利条件・カードタイプ）
2. 最小プレイアブル版の完成
3. バランス調整
4. 演出・SE・UI改善
5. セーブ/ロード（必要なら）

---

## 9. 更新履歴
- 2026-03-04: 初版作成