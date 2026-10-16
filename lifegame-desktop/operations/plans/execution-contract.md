# 初回実装実行契約

分割案確認と後続作業指示を受領。全ノードは草案とし自己承認しない。

- 前提: 完全起動維持、プロジェクト内標準配置3 core の関連本文を再読。
- 主FLOW: FLOW-03。補助FLOW-01（新規系列）、FLOW-07（D計画）、FLOW-08（結果取得後のE）、FLOW-05（構造要約反映）。
- 粒度: initial-preparation.mdで提示・ユーザー確認済みのA2/B5/C6/D4。Eは結果単位で追加。
- 読むもの: 3core関連節、添付原文、FizzBuzzの実行構成、当該Node/Manifest、実装と検証結果。
- 作るもの: A/B/C/D草案、Project Summary Manifest、src、tests、Electron配布、Windows専用workflow、取得結果に対応するEとログ。
- 更新するもの: 本プロジェクトのREADME/Plan/Manifest/Nodeの対応情報。ルートcoreは前段で配置した原文をGitへ登録するのみ。
- 変更しないもの: core本文、既存FizzBuzz、既存ノード、既存workflow、承認状態。
- A/B/C/Dと初期登録を先行し、Cなしでsrc・Dなしでtestsを作成しない。
- 完了条件: 単体/実画面/パッケージ検査の結果を保存、E記録と初期登録、Manifest反映、実体照合、出力前ゲートを通過。実行不能の環境検査は未実施と明示。
- 承認境界: main統合・pushはユーザーの恒常指示で許可。破壊的操作、既存安定核変更、ノード承認済み化は行わない。
- 停止条件: 分割変更が必要、解決不能の矛盾・認証失敗・main競合。安全に完了できる範囲は継続する。
