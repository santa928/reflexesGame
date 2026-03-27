# reflexesGame Level Up Banner Position Design

## Goal

Issue #2 の「レベルアップ表示がプレイエリアで邪魔になる」問題を解消し、盤面を隠さずに達成感だけを残す。

## Requirement Ledger

| ID | Status | Requirement |
| --- | --- | --- |
| REQ-001 | 維持 | 3x3 盤面、上部 HUD、右上ポーズ、やさしい日本語、ネオン制御室の世界観を維持する |
| REQ-002 | 追加 | `レベルアップ!` 表示はプレイエリア外に置き、ターゲットや盤面中心を隠さないこと |
| REQ-003 | 追加 | `390x844` と `768x1024` の両方で、通知帯が HUD / status / 盤面と重ならないこと |
| REQ-004 | 追加 | 配置は盤面比率の決め打ちではなく、HUD 下端と盤面上端の実寸から決めること |
| REQ-005 | 追加 | 既存の `status` 文と役割が衝突しないこと |

## World Dictionary

- 背景: 暗い宇宙色の「制御室」
- HUD: スコア、時間、レベルを示す「計器パネル」
- 盤面: 反応対象を叩く「トレーニングパネル」
- レベルアップ通知: システム更新を短く知らせる「通知帯」
- status 文: 操作状況を伝える「補助メッセージ」

## Options

### Option A: HUD 直下の通知帯

- HUD カードのすぐ下、status 文と同じ帯域の上側に短い通知帯を出す
- 盤面を一切隠さず、視線移動も最小で済む
- 既存 HUD の文脈に自然につながる

### Option B: HUD 上端のタグ

- HUD カードの上辺に小さなタグとして貼り付ける
- 盤面からは離れるが、右上ポーズと近くなり視線競合しやすい
- 狭い縦幅では safe area 依存が増える

## Chosen Direction

Gemini 相談は `2026-03-27` に `gemini-3.1-pro-preview` で `429 MODEL_CAPACITY_EXHAUSTED` が連続し取得できなかったため、Codex 側で Option A を採用する。

- `levelBanner` は盤面中央演出をやめ、HUD 直下の通知帯へ移す
- 通知帯の高さ・Y 座標は `hudBottom` と `boardTop` の間の実寸から helper で算出する
- `status` 文は通常時の補助メッセージに専念し、`levelBanner` 表示中だけは一時的に隠して帯域競合を避ける
- 通知帯は既存の黄色発光を維持しつつ、横長で薄いトースト形状へ縮める

## Layout Rules

### Level Up Banner

- `hudBottom` の下に最小 top gap を取り、通知帯をその直後へ置く
- 通知帯の高さは `textHeight + verticalPadding * 2` を基準にし、過剰に太くしない
- 下端は `boardTop - bottomGap` を超えない
- 狭い viewport ではフォントを先に縮め、それでも不足する場合のみバナー高さを抑える

### Relationship With Status Text

- `levelBanner` は「イベント通知」、`status` は「継続的な操作文言」に役割を分ける
- レベルアップ通知中は `status` を一時的に隠し、帯域競合と重複文言を避ける
- 通知終了後は通常の `status` 表示へ戻す

## Responsive Rules

- `390x844`: 通知帯は横幅を HUD 幅の約 70-78% に抑え、status 帯域を食い切らない
- `768x1024`: 横幅は広げても最大幅を設け、巨大な看板にしない
- どちらも「通知帯中心」ではなく「通知帯下端が盤面上端より上」を優先する

## Acceptance Criteria

- [ ] `レベルアップ!` が盤面中央ではなく HUD 直下に表示される
- [ ] `390x844` と `768x1024` の両方で通知帯下端が盤面へ重ならない
- [ ] レベルアップ通知中は `status` が隠れ、通知終了後に通常表示へ戻る
- [ ] 既存のレベルアップ判定・効果音・難易度更新ロジックは変わらない

## Non-goals

- レベルアップ条件や難易度テーブルの変更
- HUD 文言や配色の全面刷新
- ポーズメニューやホーム画面レイアウトの変更

## Risks And Mitigations

- status 文が長い場面で帯域不足になるリスク:
  通知帯専用 helper で下端境界を先に固定し、必要ならフォントを縮める
- viewport により通知帯が太りすぎるリスク:
  最大幅と padding を clamp する
- 修正後に古い service worker で旧配置を見間違えるリスク:
  Playwright 検証前に service worker / cache を削除する

## Performance Target

- 追加計算はレイアウト時の軽い四則演算のみとし、ゲーム進行中の体感差を出さない
