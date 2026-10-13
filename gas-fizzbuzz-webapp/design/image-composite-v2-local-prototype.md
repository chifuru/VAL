# 実装便2 — モック画像を使った透過PNGレイヤー合成（ローカル試作）

状態: **未承認・未統合**。このGitHub文書は実装結果の目録であり、画像アセットや試作ソースがGitHubリポジトリに反映済みという意味ではない。

## 方針
現行の64×64 Canvas手続き描画を最終採用せず、参照モックに基づく透過画像パーツのCanvas `drawImage` 重ね合わせを次期の主描画方式とする。既存の系統分岐・DNA同一性・アンカー・経験値・成熟固定・FizzBuzz原文N件出力を保持する。

## ローカル実装成果物（会話添付ZIP）

配布名: `fizzbuzz_image_composite_v2.zip`。
ディレクトリ: `gas-fizzbuzz-image-composite-prototype/`。

- `assets/composite/`: 透過画像35点 = 不変の原型ボディ2点 + ∅反記銘5器官×Lv1〜3 + ⌁VALIS異化6器官×Lv1〜3
- `assets/references/`: ユーザーの保持指定に対応する中核モック9点（先行3＋後続4＋VALIS異化2）
- `assets/auxiliary/`: 反記銘系画像パーツ抽出に用いた追加原本（中核9点には数えない）
- `src/creature-engine.js`: NのDNA固定、環境依存2系統分岐、器官ごとの経験値・Lv閾値1/6/16、旧相の継承、P=10/35/100、FizzBuzzのN件完走
- `src/app.js`: Canvasで背面パーツ→身体→継承器官→前面パーツを実際に描画合成、軽い待機アニメ、図鑑見本・HUD・相別サムネイル
- `src/Index.template.html` + `src/styles.css`: ユーザーのモックに寄せた3カラムUI、入力/ログ/環境、メイン画像、成長Lv、進化履歴、図鑑
- `build.py` → `dist/GAS_Index.html`: PNGをData URIとして同梱した単一HTML（約1.46MB）
- `tests/creature-engine.test.cjs`、`tests/browser-smoke.py`: ローカル検証と回帰スクリプト

## 検証済み範囲

- Node.js単体テスト: **9件成功 / 失敗0件**
- Chromiumの `set_content` による描画/操作テスト: 反記銘・VALIS切替、11パーツ画像のLv1/Lv3描画差分、500行FizzBuzz完走、中核9画像の表示、画面幅420pxで横はみ出しなし、JavaScript例外なし
- 実ブラウザのスクリーンショットを配布ファイルと共に保存
- `src/Code.gs` は未統合のローカル例。**GitHubの承認済みCode.gsは変更しない**。

## 未完了・次の差分

1. 素材を元モックのデザインに揃えて手作業でクリーンアップ。初回の自動切り抜きには背景光・罫線などが一部残る。
2. この2系統の画像合成を既存GitHub版の14系統、進化記録、承認済みVALIS A/B/C/D/Eノードと統合（既存承認状態は変更しない）。
3. 実GAS HtmlServiceとモバイルブラウザでの配信/操作/FPSの実機確認。
4. 第4相の解放判定と本画像パーツは未実装。デプロイ・公開は行わない。

この実装便は、参照モックを1枚貼るだけの旧試作と異なり、透過画像部品を複数枚重ね、経験値に応じて別画像を選ぶコードまで動作する。ただし、最終画質や14系統全体の統合を完了したと主張しない。
