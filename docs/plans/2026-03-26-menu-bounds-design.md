# reflexesGame Menu Bounds Fix Design

## Goal

HUD バッジとポーズメニューボタンがカード枠をまたいで見える崩れをなくし、今後は viewport が変わっても「カード内要素の総高さから逆算して収める」配置に統一する。

## Requirement Ledger

| ID | Status | Requirement |
| --- | --- | --- |
| REQ-001 | 維持 | ネオン世界観、3x3 盤面、上部 HUD、右上ポーズ導線は維持する |
| REQ-002 | 追加 | HUD の `レベル` バッジはカードの内側に完全に収まること |
| REQ-003 | 追加 | ポーズメニューの `つづける / おと / おうちへ` はカードの内側に完全に収まること |
| REQ-004 | 追加 | 配置は viewport 比率の決め打ちではなく、要素群の実寸から算出すること |
| REQ-005 | 追加 | `390x844` と `768x1024` の両方で、枠はみ出しと重なりが起きないこと |

## World Dictionary

- 背景: 暗い宇宙色の中にネオン格子が浮かぶ「制御室」
- HUD: 盤面の状態を示す「計器パネル」
- メニュー: プレイを一時停止して切り替える「操作コンソール」
- ボタン: 発光したカプセル型スイッチ
- レベルバッジ: 計器パネル内の小型インジケーター

## Chosen Direction

Gemini 相談は既定 preview モデルが `429 MODEL_CAPACITY_EXHAUSTED` となったため、stable Pro へフォールバックを試行したうえで、Codex 側では以下の最小差分方針で設計する。

- HUD とポーズメニューの両方に「必要高さを先に計算する pure helper」を追加する
- `main.js` では helper が返す `cardHeight / gap / scale / centerY` を使って配置する
- `cardHeight` は固定値ではなく `requiredHeight` 以上を保証する
- 収まり条件は pure test で固定し、source-level の目視頼みを避ける

## Layout Rules

### HUD

- 計器パネルは `score -> time -> level badge` の順で縦積みする
- `score` と `time` のテキスト高、`badge` の実高、上下 padding から `cardHeight` を算出する
- `status` テキストは従来どおりパネル外に置いてよいが、`badge` の下端は必ずカード内に残す

### Pause Menu

- メニューカードは `title -> buttons` の順で縦積みする
- ボタン 3 個の実高と gap、タイトル領域、上下 padding から `requiredCardHeight` を求める
- `centerY` は盤面中央寄りを優先しつつ、`cardHeight` 全体が viewport 内に収まるよう clamp する
- 余白が不足する viewport では `buttonScale` を先に縮め、それでも不足する場合のみ `cardHeight` を伸ばす

## Responsive Rules

- `390x844`: 狭い縦幅でも `bottom padding` を残し、最下段ボタンが下枠に触れない
- `768x1024`: カード幅は広がってもボタンは過度に大型化せず、gap と padding を増やしすぎない
- どちらも「カードの中心」ではなく「カード全体の bounding box が安全域に入ること」を優先する

## Acceptance Criteria

- [ ] HUD の `レベル` バッジ下端がカード外へ出ない
- [ ] ポーズメニュー最下段 `おうちへ` の下端がカード外へ出ない
- [ ] `390x844` と `768x1024` の両方で同じ helper により収まりが保証される
- [ ] `main.js` は helper を経由して card height と button position を決める

## Non-goals

- ボタンの見た目や色設計の刷新
- 盤面サイズや難易度ロジックの変更
- HUD 文言の全面変更

## Risks And Mitigations

- テキスト高さが想定より増えて再度はみ出すリスク:
  helper に実際の text height を渡して必要高さを再計算する
- viewport ごとにメニューが上下へ寄りすぎるリスク:
  `centerY` を `cardHeight` と safe area で clamp する
- 修正後に別カードで同じ事故が起きるリスク:
  収まり条件を README と AGENTS のチェック項目へ反映する

## Performance Target

- 追加計算はレイアウト再計算時の四則演算のみとし、描画パフォーマンスへの体感影響を出さない
