# 背景描画・近景識別の製品接続

2026-10-19 JST。契約: operations/plans/terrain-depth-v4.1.4.md。製品4.1.3の描画ソースへの限定変更（作業識別v4.1.4、パッケージ版は未更新）。Windows配布物の再生成は未実施。

projection.logの既存3検査を通過。表示起伏を強める初案ではセル中心のpickが隣接セルへ移るため採用せず、投影lift/岩高さは従来を保ち地表のなだらかな起伏のみ調整。最終版は人工配置280セルと実河川1120セルの全中心pickを確認。水面・共有頂点・カメラ境界を維持。

capture.log/report.jsonの8確認を通過。Linux Chromium、40×28の同一河川、同じ倍率。遠景の記号パス/色/描画関数はbyte同一、生態指紋は遠近/左右で同一。近景は6代表個体を置くfixtureで、自然進化の結果ではない。背景キャッシュの再利用と実行時例外/標準dialog0を確認。元素材と生態/Workerは差分なし。目視で岸の色帯・影・地表まとまりと主生物の原画保持を確認。囲み/台座の追加なし。

温まった近景12描画ずつの中央値は変更前3.1ms/変更後2.8ms、最大6.1/6.6ms。単一Linux実行の小標本で高速化保証/全端末性能へ一般化しない。背景生成はキャッシュミス時のみ。初回生成時間・Windows実機・全地形/密集/全状態の性能は未認定。

browser.logは既存browser-smokeの再生成後指紋確認で停止した失敗ログ。全ブラウザ回帰通過とはしない。現行のアプリ内再生成確認UIに合わせない旧検査との切り分けはbrowser-baseline.log参照。今回の代表描画検査と区別する。

画像: design/terrain-depth-v4.1.4/01-far-comparison.png、02-near-comparison.png。左はgit8cf450e、右は今回の製品描画。表示方向は利用者から追加確認不要の指示を受領、正式Node状態は草案を維持。全UI/生態/配布完成とはしない。優遇スイッチ/比較生態/記録の製品接続は後続。

失敗の切り分け: 同じbrowser-smokeで3描画ファイルだけgit8cf450eへ戻した対照でも同じreset exactly replays original worldで停止（browser-baseline.log）。現行restart-worldは未出力履歴があるとconfirmWorldChangeのアプリ内確認を待つが、旧検査はnative dialogだけをacceptし、クリック直後に指紋比較する。今回の描画差分で生じた回帰ではない。テストの確認UI対応は後続に残し、今回の検査を全回帰合格とは報告しない。
