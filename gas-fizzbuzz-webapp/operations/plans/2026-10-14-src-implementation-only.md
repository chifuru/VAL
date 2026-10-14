# src実装専用化 — 実行契約

- 指示: srcには実装に必要な内容だけを置く。
- FLOW: 02/06で使用箇所確認→04/05で配置/ビルド参照更新→08実検証/E19→05Manifest反映。
- 既存責務: C1.5.1配置/配布、C1.5.2画像設定、D1.3.1/2/3再構築/保全/操作。責務分割は維持し、新規A/B/C/Dは不要。E19はこの整理版の独立証跡。
- srcに保持: 現行Code.gs/appsscript.json/Index.html、編集モジュール、現在使用する44既存画像＋12器官PNG、描画とビルドに必要な器官設定。
- src外へ保存: README3件、器官一覧、生成出所台帳、旧画像検査台帳、pixel legacy HTML、独立preview HTML、無使用SVG補完、旧24肖像。
- 配布削減: 旧24肖像/未使用fallbackコードをIndexの構成から除外。現在の主描画/図鑑/器官/履歴/FizzBuzz/モック参照9枚のUI機能は維持。原画や旧資産は消失させない。
- 設定分離: src/assets/organs/config.jsonは画像path/領域/根元/アンカー/レイヤーだけ、design/assets/organ-provenance.jsonは出所/生成・SHA記録。ビルダーは双方の画像整合を検査する。
- 検証: Node、旧68画像のSHA/保全（稼働44・保存24）、12アトラス/設定/配布の一致、srcのREADME/比較/旧版/fallback/履歴混入なし、現行Index再構築とdesign配布preview一致、実ブラウザ10項目と器官一覧移設後表示。
- 状態: 全草案維持。初期登録E19、既存C/D実態とManifest反映。意味・生物エンジン・GAS契約・coreは不変更。mainへ通常commit/push。
