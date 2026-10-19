# 主生物相分離 4.2.1

既存の表示設定列に「主生物を相分離」チェック欄を追加。既定OFF。主生物のみ表示を上へ移し、背景/生産者/一次消費者/資源は同時表示。主宿主のP/Qは追従。絵柄・遠景記号・生態ルールを変更しない。

## 今回の実測
- unit.log: 表示座標3、投影3、保存4の計10テスト通過。
- report.json / browser.log: Linux Chromiumで22確認。主のみ分離、全要素維持、直接選択、Shift地表選択、P/Q、追跡、採食/攻撃端点、狭幅、操作中の生態不変、実Workerと同期計算の一致を確認。
- navigation/report.json / navigation.log: 既存遷移27確認通過。
- model-build.log: 生成生態モデルの一致確認。
- far/near-normal.png と far/near-separated.png: 同じ明示的な表示fixtureの実画面。display-settings.pngはチェック欄を含むUI。自然発生の生存例ではない。
- 40×28の代表場面でウォームアップ後15描画、通常中央値1.1ms/分離1.3ms。最大盤面・全端末の性能保証ではない。

## 適用範囲と残件
生態コード、計算署名、既存原画は差分なし。500T生態検査・全テスト群を今回再実行したとは扱わない。ヒット判定は描画形状に近い領域で、全原画の透過ピクセル判定ではない。全系統/密集/任意倍率の最終視認性承認、新しい書き分けと重要モーションの制作は後続工程。今回の端点修正を新規モーション完成とは扱わない。Windows配布の生成/同梱検査とWindows実機起動は区別し、実機は未実施。正式Node状態は草案を維持。

構造照合: structure.log。対象ハッシュ: source-hashes.json。契約: operations/plans/primary-plane-v4.2.1.md。

## 配布
package.log / package-report.json: Windows x64 4.2.1生成、ZIP 232877694 bytes。package-contents.log: display-plane/renderer/app/Indexのapp.asar同梱バイト一致と製品版4.2.1確認。Windows実機起動は未実施。
