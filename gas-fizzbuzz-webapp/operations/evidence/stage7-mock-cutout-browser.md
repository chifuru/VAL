# 工程7便1 / FLOW-08 — C01/C02縮小モック画素の透過Lv器官化

日付: 2026-10-14、対象branch `work/valis-mock-cutout-batch1-20261014`、PR #3。
基準head（実行成功対象）: `944e44084016a5d7f967140f58b891b601419790`。

## 一次CI証跡

- push: https://github.com/chifuru/VAL/actions/runs/38491952107 — **success**（Node+Chromium）。
- pull_request: https://github.com/chifuru/VAL/actions/runs/38491956437 — **success**（同一head）。
- Node `npm test`: **45/45成功・0失敗**（工程6の41+今回4）。
- 既存68バイナリ復元一致: **68/68、2,178,777 bytes**。35 PNG・24 WebP・9 JPEGを変更していない。
- `npm run check:composite`: 2実行HTMLが一致・再生成一致。対象SHA-256 `94b7ddcf83afabd5e54a273b1770ff481091ec3e482469d2882fc0537a56b2e5`。
- 実Chromium: **C01/C02 JPEGからのCanvas切り出し**2系統×3Lvの6点がPNG化・ロード成功。旧12系統の残10系統×3Lv＝30SVGをfallbackとして維持、warning 0。全104/104画像がdecode。
- 図鑑14系統のLv0/Lv3 Canvas差14/14。N15/1000ローカル完走・skip/成熟、GAS不正mock応答拒否、420px横はみ出しなし（scrollWidth420 / canvasWidth402）、未捕捉JS例外0。
- Chromiumスクリーンショット＋report.json: https://github.com/chifuru/VAL/actions/runs/38491952107/artifacts/11861749269

## 画素の出所を厳密に区別する

- **GitHub実行バンドルに入ったのはC01/C02の既存縮小JPEGから切り出した低解像PNG6点のランタイム生成処理**であり、ユーザーの今回の添付PNG原寸画像をそのまま登録したものではない。
- 別途、今回ユーザーが添付した1448×1086スクリーンショットの原寸画素から6点をローカル切り出し、crop/screenshot-SHA/alphaを保存した `mock-stage7-parts-draft.zip` を会話側成果物として作成。**GitHubにはこのZIPそのものも新PNG本体もまだ収録していない**。
- 残旧10系統は草案SVGを継続。すべての旧12系統は24 WebP全身肖像を基盤にしているため、頭・眼・腕・背部など全身を真の個別器官で再構成する段階ではない。
- 元中核9枚高解像PNG本体/ZIP SHA、v4.2改善24肖像、真正器官アトラス、背景ラベル残渣の人間品質評価、実GAS/実スマホFPS・第四相は未合格。

## 検証済みと検証待ちの境界

E16は**草案の独立証跡**。正常デコードとCanvas描画差は、原画画質の合格を意味しない。今回のスクリプトは旧33透過PNGやFizzBuzzの配列出力形式を変更しない。実装コードとバンドルをともに検証したため、ソースのみの同期成功とは区別できる。新証跡追加後の最終HEAD CIは別途再確認する。
