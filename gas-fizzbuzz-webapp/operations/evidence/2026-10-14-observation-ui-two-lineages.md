# 観測UIと深海・神鳥の先行実装 — E17実行証跡

- 実行日時: 2026-10-14T10:54:45.493509+09:00（Asia/Tokyo）。実行主体: Codex。環境: Node v24.19.0 / npm 11.9.0、154.0.8037.57 Chromium、Playwright 1.56.1。
- 作業基準: main 10b5fb18d6dd39732b96cf231a7aab00e1469e84。対象は今回差分、ファイルSHAをobservation-ui-two-lineages/files.jsonに記録する。
- 計画: D1.3.2/D1.3.3。実装: C1.5.1/2/3。実行契約はoperations/plans/2026-10-14-observation-ui-two-lineages.md。
- npm test: 43件実行、43成功、失敗0、スキップ0。旧68資産と新2アトラスの出所・バイト、全54草案Node/Manifest、配布HTML/描画/生物契約を確認。
- check:assets: 旧68画像は完全バイト一致。check:composite: 2配布HTMLは一致・再構築可能。HTML SHA-256 c9be0a601782380d5500c03272719ab5e7f37a11fa6b54e5c7a6942a3d64352b。
- Chromium: 実行時HTMLは127.0.0.1:8765で内部HTTP配信。既存のsystem-chromium preloadによりfile URLを同じHTMLへ接続、ブラウザポリシーは不変更。GASに接続した検証ではない。
- Chromium 9チェック成功: 106画像decode（旧68＋fallback36SVG＋新2atlas）、画像付き14図鑑、6Lv領域の透明/可視画素、新2器官のLv0/1/2/3サムネイル差、14系統の主CanvasLv差と第二相履歴名、N15/1000原文・成熟完走、不正GAS stub拒否、420px操作/横オーバーフローなし、未捕捉JSエラー0。
- 画像アトラス: 元配置PNG2枚を参照したimage_gen加工派生。各3Lvを別領域・根元座標で描画する。元モックのバイト同一切出し/旧ZIP一致とは扱わない。
- 目視調整: 器官が身体前面を覆う初期状態を修正し、背びれ/肩のアンカーと後景レイヤーへ接続。図鑑に別系統の汎用tide試走履歴が混入する点も修正。実育成の系統/継承ロジックは不変更。
- スクリーンショット: desktop-valis-lv3.png、desktop-abyss-authored-lv3.png、desktop-myth-authored-lv3.png、mobile-antimeme-lv3.png。PC1440×900/疑似モバイル420×860、reduced motion。完成画質の人間承認ではない。
- git diff --check: 成功。core3、Code.gs、pixel legacy、creature-engine.js、hello-valisは不変更。Nodeは全54草案。初期登録E17、C/D実態とManifest要約の反映。
- 未完: 元全身肖像の高画質再抽出/真正な全部位分解、旧6枚の出所/旧ZIP一致、残10旧系統の真正器官、原UIと画質の完成受入、実GAS、実端末FPS、第四相。
- 現在有効性: 台帳と同じ内容・実行条件の今回差分に限定。対象画像/registry/描画/UI/テスト/Node/Manifest変更で該当観点の再検証が必要。
