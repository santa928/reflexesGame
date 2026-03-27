# reflexesGame Render Quality Design

## Goal

Issue #3 の「文字や UI が濁って見える」問題に対し、Phaser 3 の制約を踏まえた現実的な改善策で見た目をシャープにする。

## Requirement Ledger

| ID | Status | Requirement |
| --- | --- | --- |
| REQ-001 | 維持 | 3x3 盤面、ネオン制御室の世界観、ホーム/ポーズ/終了導線は維持する |
| REQ-002 | 維持 | 既存のゲーム進行、判定、タイマー、音切替の状態遷移は変えない |
| REQ-003 | 追加 | 文字 UI は Retina 相当環境でもにじみを抑え、ブラウザ文字として鮮明に見えること |
| REQ-004 | 追加 | 改善は最小差分とし、盤面描画や当たり判定の大規模リライトを避けること |
| REQ-005 | 追加 | `390x844` と `768x1024` の両方で、HUD / ホーム / 終了 / メニューの文字配置が既存レイアウトと矛盾しないこと |

## Root Cause Summary

- Playwright で `devicePixelRatio=2` を再現しても、Phaser の WebGL canvas は `canvas.width == clientWidth` のままで、描画バッファが 1x のままだった
- Phaser 3 系は HighDPI を正式には扱いきれておらず、`resolution` は v3 系で実質無効化されている
- そのため「canvas 全体を真の 2x/3x へ上げる」方向は、今回の repo では低リスクに実装できない

## Options

### Option A: Phaser 3 の描画基盤を保ったまま、文字 UI を DOM overlay へ逃がす

- 盤面、エフェクト、ボタン形状、当たり判定は Phaser のまま残す
- スコア、時間、補助文言、ホーム/終了/メニュー文言、ボタンラベルだけを HTML overlay に出す
- ブラウザ文字になるため Retina で鮮明に見える
- 既存レイアウト helper を流用しやすく、状態遷移も保ちやすい

### Option B: Phaser 3 上で canvas 全体の高DPI hack を試す

- canvas の内部サイズや WebGL viewport を手動でいじる
- 理論上は全体を鮮明にできる可能性がある
- ただし Phaser 3 の内部前提と衝突しやすく、リサイズ、FBO、camera、input で回帰リスクが高い

### Option C: 描画基盤を別ライブラリや Phaser 4 相当に載せ替える

- 根本解決には近い
- ただし今回の issue に対しては差分が大きすぎ、既存挙動の再検証範囲も広い

## Chosen Direction

Gemini 相談は `2026-03-28` 時点で `gemini-3.1-pro-preview` が `429 MODEL_CAPACITY_EXHAUSTED` を返し取得できなかったため、Codex 側で Option A を採用する。

- Phaser 3 の canvas は盤面・背景・図形・ヒットエリアに専念させる
- 文字 UI だけを `#game-ui-overlay` へ移し、ブラウザ文字として描画する
- 既存の Phaser `Text` は測定専用として残し、レイアウト計算と copy の真実源にする
- ボタンは形状と入力を Phaser のまま残し、ラベルだけを DOM overlay で重ねる

## World Dictionary

- 背景: 宇宙色の「制御室」
- 盤面: 反応対象を叩く「トレーニングパネル」
- HUD: スコア/時間/レベルを示す「計器表示」
- ホーム/終了/メニュー文言: プレイ導線を示す「管制表示」
- ボタンラベル: 発光ボタンの中央に載る「管制文字」

## UI Spec

### DOM Overlay

- `#app` の中に `#game-ui-overlay` を追加し、canvas の上に absolute 配置する
- overlay 自体は `pointer-events: none` とし、入力は引き続き Phaser 側が受ける
- 文字は CSS `text-shadow` で既存ネオン感を維持する

### Measured Text Strategy

- Phaser `Text` は消さずに保持し、`fontSize` や `height` 測定に使う
- 画面に見せるのは DOM 側のみとし、Phaser 側文字は透明化する
- 既存の `updateScoreText`, `updateTimeText`, `setStatusText`, `updateHomeCopy`, `refreshOverlayCopy`, `refreshMenuCopy` で DOM copy も同期する

### Button Labels

- ボタン背景、hit area、hover/press の見た目は Phaser のまま
- ラベル文字だけ DOM 側へ出し、通常状態の位置・字サイズ・色を既存 button spec から反映する
- hover/press では厳密な 1 フレーム追従までは狙わず、中心位置と通常縮尺の一致を優先する

## Non-goals

- Phaser 3 を別 renderer へ全面移行すること
- 盤面やエフェクトの描画ロジックを SVG / DOM 化すること
- ボタン形状そのものを HTML/CSS 実装へ置き換えること

## Risks And Mitigations

- DOM と Phaser の表示状態がズレるリスク:
  `refreshScreenUi()` を単一の visibility 同期ポイントにする
- CSS と layout helper のズレで文字位置がずれるリスク:
  `layout()` で fontSize / position を一括同期し、viewport 2 種で確認する
- service worker の古い JS を見間違えるリスク:
  Playwright 前に cache-busting URL か service worker / cache 削除を行う

## Acceptance Checklist

- [ ] `390x844` と `768x1024` で、HUD / ホーム / 終了 / メニュー文言が鮮明に読める
- [ ] 既存のボタン入力、ポーズメニュー、ホーム復帰、カウントダウンは壊れない
- [ ] 文字 overlay は状態遷移に追従し、表示/非表示が Phaser 側と矛盾しない
- [ ] README と progress に Issue #3 対応内容を反映する
