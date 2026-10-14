# FizzBuzz草案化とmain統合の実行契約

- 入力: ユーザーがdesign/を提示資料と指定、FizzBuzz全ノードを草案へ戻し、mainとgas-fizzbuzz-webapp/へ統合するよう指示。統合先と対象は追加回答で確定。
- 完全起動条件: 標準配置core3ファイルの起動・構造・FLOW・状態遷移の関連定義を順に読み、Operation先行、Summary構造、Flow手順の役割を確認。本文全文読了は主張しない。
- 前提フィードバック: remote mainの追加モック取得により旧「配置なし」判断を更新。過去の承認履歴は現在状態と分離。草案化は今回の明示指示が未記載の状態遷移に優先する個別例外。一般遷移規則/coreは不変更。
- FLOW: 02読解・06配置/状態影響確認→09状態変更決定→05正式反映、08検証証跡。新規Nodeの初期登録はE16のみ。
- 粒度: 状態変更は既存ノードの責務を変えないため新規A/B/C/D分割不要。E16は今回の配置・状態整合検証という単一責務。画像実装の分割判断は素材照合後に行う。
- 更新: 36既存ノードの状態、C1.5.2/D1.3.2の素材可用性・検証観点、Project Summary Manifest、整合テスト。作成: モック台帳、配置検証テスト、E16と証跡記録。
- 保持: 原PNG、元の切り出し台帳、core3本文、src全体、過去の承認/証跡記録、hello-valis。
- 統合: 最新mainをfast-forward取得。stage7別ブランチのtree差分はmainとの比較でなし。外部重複9ファイルはdesign内コピーと全バイト一致した後のみ除去。ブランチ自体は削除しない。mainへの通常pushを行い、force pushはしない。
- 検証: npm test、check:assets、check:composite、git diff --check、core/src/hello-valis差分なし。変更実体のSHA台帳を証跡へ保存。
- 停止/未達: 切り出し6枚の元SHAが提示PNGと一致しないため実行HTMLへ組み込まない。画像品質/元ZIP照合/GAS/FPSは未検証。pushの競合時はremoteを取得して整合後に再検証する。
