# モックv0.3 FLOW実行契約

目的: 合意したA方向を仕様として整理し、操作できるWindowsモックで認識合わせする。
開始条件: 完全起動済み。プロジェクト内core関連節をOperation→Summary→Flowの役割に従い確認。ユーザーがモック作成と責務分割を明示。
前提フィードバック: 接続可。従前のB3/S23と部位XPの仮実装は最新意図と不一致。最新モックのみ置換し、製品版は保持。
FLOW: FLOW-01/03で草案構造を作成、FLOW-07でDを登録、実装後FLOW-08で実測Eを記録、FLOW-05で必要差分とManifestを反映。
承認: Node分割とモック作成はユーザー確認済み。全ノードの草案状態を維持。main統合・pushは継続指示により実行。
構造: A1.1/A1.2/A1.3、B4/B5、C5/C6、D5/D6。E4は実測後に作成。
読むもの: プロジェクト内valis/core、既存A・Manifest、添付LifeGame、FizzBuzz定義・描画、既存モック。
作る/更新するもの: 上記Node、Project Summary Manifest、design/ecosystem-mock/srcとtests、仕様集約、画面、検証証跡、Windowsモック配布。
変更しないもの: core正本、元FizzBuzz、既存製品src/tests。
Manifest初期登録: 草案A/B/C/Dを実装前に登録。Eは実測後に登録。
Manifest反映: A1/A2の最新方向、今回結果と次候補を反映。
仮設定: 盤面24×16、初期40体、成長8/24/40、繁殖Chebyshev距離1・同系統異性の成体・両者energy>=50・両者待機0・双方に隣接する空きマス、両者14消費・基準18を繁殖性で割ったターン数の待機。資源は4入力、枯渇後5ターンで回復。数値は直接の成長点・栄養を加算しない。
検証: D5のNodeテスト、D6のPlaywright画面と描画測定、Windows CIでZIP作成・実exe起動。
結果照合: Node/Manifest/実ファイル/実測結果/出力表示を照合。原版と製品src/testsの未変更をgitで照合。
完了条件: 仕様、操作できるモック、実測証跡、Manifest反映、main統合、配布案内。
停止条件: 分割未確認、必要資産欠落、実行・整合確認の失敗が解消できない場合。
NEXT: ユーザーによる認識合わせ。製品仕様の承認・置換は別判断。
