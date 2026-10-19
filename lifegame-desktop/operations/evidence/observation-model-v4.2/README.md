# 選定モデルと優遇設定の製品接続

2026-10-19 JST。対象4.2.0。契約: operations/plans/observation-model-v4.2.md。範囲はモデル/初期設定/Worker/保存再生、既存UI/グラフ/図鑑の残要件を全て達成したものではない。

## 生態と一致
model.logの2検査で、全8条件の初期と0〜3Tについて比較モデルと全世界一致、各不変条件、逆順実行時のcatalogue分離、無効型/未知キー/版不一致/再生条件不一致、失敗時の既存表示モデル維持を確認。

river-500.json/log/gzは製品用モデルで501状態、E/M残差0/不変条件通過。採用河川の比較結果と最終stats全一致。主277/水游虫83/草棲虫421/生産者785/P301/Q268（探索186+付着82）。外部E/M供給なし。固定1河川の例であり、全地形/全混合条件の成功率・旧R1〜R6の認定ではない。結果ファイルの指紋と計算モジュールhashに限定する。

## UI・実Worker・保存
ui/report.jsonはChromiumの8確認。自由設定の3項目ON既定、独立OFFの生成/実行中表示、実Worker全8条件各2Tと同期モデルの指紋一致・不変条件、3T結果の保存/再生で条件と最終状態一致、再生時の自動重複保存なし、初期設定への復帰でOFF保持、例外/標準dialog0。settings.png/observation.pngは実画面。

## 実装の範囲
observation-modules.jsはbuild-observation-model.cjsが比較モデルで評価されたモジュールを静的関数として出力。8条件の同一本文を共有し22関数/584192bytes。元の生態ソースは基礎・旧比較/回帰の参照として保持し、製品の通常経路では二重読込しない。Node/文字列evalはビルド時のみで、製品はローカル静的コードと既存地形データで実行。外部通信なし。生成物検査はbuild.log。

再現条件変更時はtools/build-observation-model.cjsとtools/update-replay-version.cjsを実行し、モデル一致/Worker/再生を再検査する。描画更新だけでは計算版を変えない。旧計算版記録は新計算版へ黙って変換しない。

## 残件
人工供給モデルの製品選択、既存3+1グラフ/共通横詳細/最終グラフ記録/明示的新規保存等、全地形・多seedの厳密目標、Windows実機確認は後続。生態とUIの基本接続を、これらの完成とはしない。正式Node状態は草案を維持。

## 回帰検査の扱い
browser/report.jsonは47確認、navigation/report.jsonは生成/取消/修正/再試行等27確認を通過。browser-smokeは31種へ更新し、再生成のアプリ内確認を明示操作して生成完了まで待機、設定エラーは現行setup-messageで確認する。

regression.logの9検査、build.logの生成物一致を通過。unit.logは全223件の初回結果で218通過・5停止。停止は4.1.3固定証跡のソース/版ガードによるもの。旧証跡やガードを上書きせず、これら5実験は別版での実行対象外と理由を明示してskipへ整理した。該当3ファイルの再検査historical-tests.logは8通過/5skip。旧4.1.2の変更拒否検査は維持して通過。全223件を変更後に再実行したという記録ではない。現行製品の一致・収支・Worker/再生は別の専用検査/500T実測で確認した。

## 配布
package.log/package-report.jsonはWindows x64の4.2.0生成、PE形式検査、ZIP/hash/同梱ファイル検査の結果。環境の指定プロキシで生成した。dist配布物は生成出力でGit管理しない。Windows実機での起動・性能は今回未確認。対象srcのhashはsource-hashes.json、生成物のhashはpackage-report.json。GitHub Actions配布はmain反映後の当該実行を参照する。

package-contents.logでapp.asar内の生成モデル/選択ローダー/Indexと今回srcのbyte一致、package版4.2.0を照合。E7は今回配布生成のみとして反映し、旧4.1 Windows実機証跡の適用範囲を広げない。

追加のCI接続確認: population.logは個体一覧/ランキング/推移23確認、ecology-ui.logは追跡/全ターンCSV等14確認。31種数へ合わせ、再生成テストのアプリ内確認と完了待機も対応。fast/report.jsonは先行計算/同期再計算/再生等25確認、staged/report.jsonは三段階表示/取消/確定状態等26確認を通過。先行計算試行では準備約606ms、5T表示約5.55秒。単一Linux条件の実測で全盤面/Windowsの速度保証ではない。

最終の31種記号描画検査で、浮遊微藻とP/Qに不足していた記号パスを補完。既存の各記号は変更せず、全31種の盤面/凡例描画で実際にalphaが出ることを専用UI検査へ追加。浮遊微藻の近景は藻の既存原画を使い、3枠同居は異なる位置で描く。
