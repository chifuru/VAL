# E21 — Windows移行版の限定検証

対象: approved desktop-contract-proposal-2026-10-14、ENGINE1、desktop-art-v1、Electron44.7.2。実行主体Codex、日時は各報告のUTC日時。対象コード/画像/設定/テスト/配布手順は `desktop-migration/target-sha256.json` のSHAで識別する。

| 観点 / D | 実行環境・操作 | 結果・証跡 |
|---|---|---|
| 原FizzBuzz列、成長、6DNA、部位/全継承 / D1.1,D1.2 | Node24.19、npm test | 全30件成功、失敗/skip0。unit.log。ENGINE15件は全1000行と整数境界280/621/1000、小N途中終了、14到達系統、七身体部位・75器官、全継承、固定成熟を検査。 |
| PNG / D1.3.1,D1.3.2 | PNG実デコード、SHA/領域/根元/透明性、npm run check:assets | 15PNG、共通6群+系統75群、243の素材領域が解決。混入のあった6Atlasをimage_genで再制作、実alphaの行分離0を確認。旧画像/HTMLは保存資料へ退避。 |
| 観測・摂取・実記録 / D1.3.3,D1.6 | Chromium 154.0.8037.57、1440×960 / 760×620、テスト用永続保存bridge | 94項目成功。通常/停止/再開/reduced/動的OS切替/skipの実終端、無効入力不変、N同期、同N別run、過去閲覧とlive分離、実系統別獲得器官を確認。browser/report.json・各PNG。これはnative保存の成功主張ではない。 |
| native保存・終了・再起動 / D1.5,D1.6 | Linux x64 Electron44.7.2 / Xvfb21.1.16、専用一時userData、create→終了→別プロセスrestore | 2実run N15/N1000、出生/完走保存、元ログ、通常終了flush、再起動でDNA/部位/実相履歴/PNG肖像の完全一致、previewの非登録が成功。native-linux/report.jsonとcreate/restore.png。 |
| Windows同梱配布 / D1.5 | Linuxで公式Windows x64 runtimeを用いたクロスパッケージ | PE MZ/PE x86-64、asar内アプリ/15PNGが全srcと同バイト、ライセンス、ZIPを検査。windows-package-report.json。公式SHA 10a89447ef64ac5cb9f782af48ffd83734a40ae91681259d1048ca3c9e6c5da4。 |
| Node/Manifest/core / D1 | manifest-consistency | A9/B11/C17/D10/E21、68ノード。A/B20のみ承認済み、C/D/E48草案。採用A/B20SHA、core3+原モック20PNGがbaselineと同バイト。 |

配布ZIP: 188473369bytes（約188.5MB）、SHA256 `a3a731bbeb6db103e6fbfbd7fa87a285496d6bc63efa2658749c449b38999ad7`。配布にはElectron/Chromium実行体を含むためsrcのみのサイズとは異なる。ローカル `dist/VALIS-Windows-x64.zip`、GitHub Windows workflowのartifactを配布経路とする。

目視: 原モック方向のピクセル素材、全14系統の合成、暗色観測画面・各部位・実相肖像を確認。見切れ、罫線/矢印/別枠の混入、尾/触髭の接続を修正。多頭蛇の2副首は前面へ分離、環器官は身体背面の周囲へ配置。元の原画像と派生画像の完全な美術等価や利用者受入を認定する検査ではない。

診断・修正: Electron bootstrapのmain読込条件を通常Node CLI条件からElectron browser processへ修正。動的低モーションはmql通知に加えて最新matchMediaを再評価。画面の自動検査はrenderer描画と描画鍵取得を同一評価内で実行し、アニメーションによる別フレームを比較しない。失敗した中間版を現版の成功証跡へ混ぜない。

Windows10/11利用者実機、実利用FPS/表示倍率、美術の利用者受入は未実施。Windows CIの実exe起動は取得した別結果だけを証跡へ接続する。Linux nativeテストだけの --no-sandbox/--disable-gpu は外部クラウド検証launcherにあり、Windows製品には追加していない。

有効条件: SHA台帳と記載環境/条件の一致。無効化条件: 対象runtime/画像/設定/係数/保存/ホスト/検査条件の変更。残存FLOWはWindows/利用者受入のFLOW-08、具体的反例のFLOW-04、結果反映のFLOW-05。C/D/Eの自動承認は行わない。

配布照合のOS対応: ASAR APIへ渡すアーカイブ内パスはpath.relativeのネイティブ区切りを保持する。移行前のスラッシュ正規化は報告/チェックサム表示だけに限定する。Windows CI 38609225140で前版のPNGパス検索失敗を取得し修正、Linux配布の全srcバイト照合を再実行済み。修正版Windows結果は未取得。

取得したWindows結果は独立E22へ初期登録。run38610389383のpackage/ZIP checksum/native exe create→restoreがsuccess、artifact11917253151を取得。公開GitHub step結論/digestを照合した証拠であり、認証が必要な生ログ/native JSONは未読。Windows10/11利用者実機と美術受入は未実施のまま。
