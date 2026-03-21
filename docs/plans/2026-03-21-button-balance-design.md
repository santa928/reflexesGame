# reflexesGame Button Balance Fix Design

## Goal

日本語化後に崩れた下部ボタンの重心を整え、3歳向けのやさしい見た目とネオン感を両立する。

## Problem

- 左アクセントバーが日本語ラベルの字面と干渉している
- ラベルが中央固定のままなので、英語前提の非対称構図が日本語で崩れている
- フォントサイズと glow が強く、文字が上に浮いて見える

## Chosen Direction

Gemini 推奨の `中央アンダーライン化` を採用する。

- アクセントバーは左上の短冊ではなく、文字の下を支える短い光ラインへ移す
- ラベルは中央揃えを維持しつつ、少し上へ寄せる
- フォントサイズを下げ、字間と glow を日本語向けに調整する

## Spec

- `accentBar`: `x: -40`, `y: 12`, `width: 80`, `height: 6`, `radius: 3`
- `label offset`: `x: 0`, `y: -4`
- `font size`: `24`
- `letter spacing`: `4`
- `glow alpha`: `0.6`

## Non-goals

- ボタン色や全体サイズの再設計
- ボタン配置ロジックの再調整
- 盤面や HUD のデザイン変更
