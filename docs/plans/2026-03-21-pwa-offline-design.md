# reflexesGame Self-Contained PWA Design

## Goal

`ぴかぴかタッチ` を自己完結型の PWA にし、いちど読み込んだ端末ではネットワーク断でも起動して遊べるようにする。

## Worldview Dictionary

- 背景: ネオンアーケードの暗い宇宙
- 盤面: 発光する 3x3 ノードグリッド
- HUD: ひと目で読める大きな残り時間とスコア
- ボタン: 既存のネオンカプセルを維持
- ターゲット: 発光ノード
- 文言: 3歳向けのやさしい日本語を維持
- エフェクト: 現在のヒット、警告、レベルアップ演出を維持
- PWA 追加要素: 見た目を増やさず、ホーム画面追加とオフライン起動だけを裏側で支える

## Problem

- 現在の [index.html](/Users/santa/Documents/reflexesGame/index.html) は `Phaser 3.70.0` を CDN から読んでおり、ネットワーク断ではゲーム本体が起動しない
- PWA 用の `manifest.webmanifest`、アイコン、`service worker` 登録が存在しない
- GitHub Pages のような静的配信では成立する構成だが、オフライン再訪時の配信保証がない

## Chosen Direction

見た目を変えない **最小自己完結 PWA** を採用する。

- `Phaser 3.70.0` を repo 内に同梱し、外部 CDN 参照をなくす
- manifest とアイコンを追加して、ホーム画面追加に必要な情報を定義する
- `service-worker.js` でアプリシェルを事前キャッシュし、再訪時はオフラインでも起動できるようにする
- 更新通知 UI やインストール促進 UI は入れず、今回の変更対象を起動保証に絞る

## Requirement Ledger

- `REQ-001` 維持: 既存のゲーム画面、盤面、HUD、操作文言を変えない
- `REQ-002` 追加: `Phaser` をローカル同梱し、外部 CDN なしで起動できる
- `REQ-003` 追加: PWA manifest を追加し、`standalone` 表示とアプリアイコンを定義する
- `REQ-004` 追加: `service worker` により、読み込み済み端末ではオフライン再読込で起動できる
- `REQ-005` 追加: 更新時は古いキャッシュを削除し、アプリシェルの不整合を避ける
- `REQ-006` 追加: README と progress に PWA 化の要点と確認手順を残す

## Requirement Diff

| 要件 | 状態 | 内容 |
| --- | --- | --- |
| `REQ-001` | 維持 | ゲーム体験と見た目は維持 |
| `REQ-002` | 追加 | `Phaser` 自己完結化 |
| `REQ-003` | 追加 | manifest とアイコン追加 |
| `REQ-004` | 追加 | オフライン再訪対応 |
| `REQ-005` | 追加 | キャッシュ世代管理 |
| `REQ-006` | 追加 | ドキュメント更新 |

## Architecture

- HTML エントリで manifest とローカル `Phaser` を読み、起動時に `service worker` を登録する
- `service-worker.js` はアプリシェルキャッシュ戦略を採用し、`install` で静的ファイルを事前キャッシュ、`activate` で古いキャッシュを削除する
- アイコンは追加アセットとして `icons/` に置き、manifest から参照する

## File Responsibilities

- `index.html`: manifest / icon / theme-color / local Phaser / service worker registration の受け口
- `vendor/phaser.min.js`: `Phaser 3.70.0` の固定済み配布物
- `manifest.webmanifest`: PWA のメタデータ
- `service-worker.js`: オフラインキャッシュ管理
- `icons/*`: PWA 用アイコン
- `tests/pwa.test.mjs`: manifest と事前キャッシュ対象の回帰テスト
- `README.md`: 公開手順とオフライン利用説明
- `progress.md`: 今回の変更記録

## Offline Strategy

- 事前キャッシュ対象は `index.html`, `styles.css`, `src/*.js`, `vendor/phaser.min.js`, `manifest.webmanifest`, `icons/*`
- ナビゲーション要求は `index.html` へフォールバックし、単一ページの起動を優先する
- 新キャッシュ名へ更新したら `activate` で旧世代を削除する

## Non-goals

- 初回訪問をオフラインだけで成立させること
- インストール促進 UI
- 更新通知 UI
- スコア保存、通知、バックグラウンド同期

## Acceptance Criteria

- ホーム画面追加に必要な manifest と icon が読み込まれる
- 1 回オンライン読み込み後は、オフライン再読込でもゲーム画面が立ち上がる
- `390x844` と `768x1024` で HUD、盤面、下部ボタンのアンカー関係が崩れない
- `Phaser` CDN 参照が repo から消える

## Non-target

- インストール案内文やゲーム内 CTA の追加
- 既存ゲームロジックや難易度調整

## Risks and Mitigations

- リスク: キャッシュ漏れでオフライン起動時に白画面になる
  対策: 事前キャッシュ対象をテストで固定する
- リスク: `service worker` 更新反映が遅れて古い資産が残る
  対策: バージョン付きキャッシュ名と `activate` での掃除を入れる
- リスク: アイコン追加で配信パスを誤る
  対策: manifest の参照パスをテストで検証する

## Performance Target

- 追加アセット込みでも、初回ロード後の再読込で即座にゲーム開始画面へ戻れること
- オフライン再訪時にネットワークリクエスト失敗でゲームが停止しないこと
