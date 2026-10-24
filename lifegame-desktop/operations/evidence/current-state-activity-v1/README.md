# CS06：更新対象と時間処理の限定確認

起点 `0f7d320cc0bd4455d21b3171387b3392ba58222a`。製品4.2.77を維持。生態署名 `f5bb8318b5ba9f8997c94ac56d219724c723cf17174ff788cf8efadc3c8399a0`。[接合契約](../../../design/implementation/current-state-activity-v1.md)、[ハッシュ/判定](report.json)。

## 結果

| 対象 | 結果 | 証跡 |
| --- | --- | --- |
| 更新候補・時計境界 | 15成功。平衡水分/固定フロー、消費通知、空所の雨/後進入と参照不変、正の養分入力、満杯保持待ち/空き/次T還元、乾燥→湿潤、腐敗負荷消失、未解決水域の維持、不正候補拒否、確定直前の待機増分を含むサマリ | [activity.log](activity.log) |
| 密な環境計算との照合 | 上記15内、6固定条件×各40回の環境処理で、水分配列と入力/排水/蒸発の各Tフローが一致 | [検査コード](../../../tests/current-activity.test.cjs) |
| 処理構造 | 平衡の空盤面で水分更新0セル・養分入力更新0セル。消費通知した1セルだけ更新再開。満杯の3待機セルは5T試行0、実際に空けた1セルを次T一度だけ再試行 | [activity.log](activity.log) |
| 新方式の短期結合 | 代表1条件の生成元/生成物4Tが一致。途中取消で元世界の候補/時計も不変、各Tの不変条件成功 | [activity.log](activity.log) |
| 関連境界 | CS03土壌17・CS05感染16の計33成功 | [related.log](related.log) |
| 通常ターン/Worker | 7成功。一括/段階・生成元/生成物・取消/失敗・Worker・短期再生/500境界 | [turns.log](turns.log) |
| 従来経路の起点比較 | 3条件×T0〜T2で世界/観測行が一致。CSVはraw署名以外一致。旧再生/原bytes/件数を保持 | [legacy-parity.json](legacy-parity.json) |

計55項目と従来3条件。固定環境比較は自然40Tの生態進行ではない。500境界は時計499から2Tで、自然500Tではない。新方式の生成元/生成物一致を旧規則との一致へ読み替えない。

最初の関連実行では、土壌値を直接書き換えるfixture一箇所が変更通知を行っていなかったため失敗した。[初回ログ](initial-related-attempt.log)を保存し、そのfixtureへ実取得と同じ通知を追加して関連33の再実行成功を確認した。製品の物質値を自動補正する修正はしていない。

## 再実行

```sh
node --test-reporter=tap tests/current-activity.test.cjs
node --test-reporter=tap -e "require('./tests/current-soil.test.cjs');require('./tests/current-infections.test.cjs');"
node --test-reporter=tap tests/cell-turn.test.cjs
git show 0f7d320cc0bd4455d21b3171387b3392ba58222a:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-activity-baseline-modules.js
node tests/current-activity-legacy-parity.cjs /tmp/current-activity-baseline-modules.js
node tools/build-observation-model.cjs --check
```

## 有効範囲

現行の固定環境と内部比較経路の対象管理を限定確認した。変化中の無人セル・実在庫・実生物/感染体の更新は継続する。全盤面の走査/複製をすべて除去した意味ではなく、生物数/実在庫が多い場合には必要な処理が残る。

UI/画像/既定モード・製品版・配布は維持。新方式の通常画面/Worker/図鑑全接合はCS07。自然500T/総合速度改善率/長期メモリ・画面実操作・Windowsは未測定。上記の更新件数は構造確認であり、総合速度の測定値ではない。
