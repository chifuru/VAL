# CS04：関係・摂取構成・過去統計の限定確認

起点 `884e2a038ed7c4f0a385de3ba19c6a7c3284feaa`。製品4.2.77。生態署名 `8eeba9349d0b929e3278e08d23c2669e754c2e8c81bba9cf5f2de352e059b630`。[接合契約](../../../design/implementation/current-state-relations-v1.md)、[対象ハッシュ/判定](report.json)。

## 結果

| 確認 | 結果 | 証跡 |
| --- | --- | --- |
| 新しい現在構成・観測境界 | 16成功。5成分/20T半減/実E/不明/参照不変、同時取得、死亡→土壌→採食、小集団分割、宿主→P→Q、同T死亡寄生者の実作用、全同居者接触、作用/付随関係の分離、世代差分、読取専用復元と破損拒否 | [relations.log](relations.log) |
| 新方式の短期接合 | 上記16内で代表1条件の生成元/生成物4T一致。取消時の元世界不変、各Tの不変条件、観測の復元一致が成功 | [検査コード](../../../tests/current-relations.test.cjs) |
| 全期間の観測 | 人工のT0〜61の62行で全T/CSV・50T窓・完了10T二区間の継続・接触と実作用の分離を確認。自然62T走行ではない | [relations.log](relations.log) |
| CS02/03関連 | 情報15・土壌17、計32成功。旧世界を手動で組み替える土壌fixtureだけ、廃止した履歴欄を除去して前提を修正 | [related.log](related.log) |
| 既存観測 | 12成功。接触・継続・全T/CSV、既存の観測結合を確認 | [legacy-observation.log](legacy-observation.log) |
| 通常ターン/Worker | 7成功。一括/段階、生成元/生成物、取消/失敗、Worker、短期保存再生、500境界 | [turns.log](turns.log) |
| 従来経路の起点比較 | 3条件×T0〜T2で世界と観測行が一致。CSVはraw署名以外一致。旧再生結果/原bytes/件数を保持 | [legacy-parity.json](legacy-parity.json) |

検査計67項目と従来3条件の比較。500境界は時計499から2Tであり自然500Tではない。新方式4Tの一致は新方式内の生成元/生成物間で、旧規則との一致を意味しない。

既存観測12のログは最初の合同実行から該当部分を保存した。同実行の土壌fixture16失敗は旧 `contactPairs`/`demography` の残存を新検査が拒否したため。fixtureを修正した関連32の再実行は全成功で、製品の旧データを自動変換する修正はしていない。

## 再実行

```sh
node --test-reporter=tap tests/current-relations.test.cjs
node --test-reporter=tap -e "require('./tests/current-soil.test.cjs');require('./tests/current-information.test.cjs');"
node --test-reporter=tap tests/ecology-observation.test.cjs
node --test-reporter=tap tests/cell-turn.test.cjs
git show 884e2a038ed7c4f0a385de3ba19c6a7c3284feaa:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-relations-baseline-modules.js
node tests/current-relations-legacy-parity.cjs /tmp/current-relations-baseline-modules.js
node tools/build-observation-model.cjs --check
```

## 有効範囲と残件

個体ペア履歴・世代累積表を生態状態に持たないこと、当該Tの事実と外部観測・現在摂取構成の接合を限定確認した。現在の直接親子/養育/宿主関係・有限収支は維持する。集約後の匿名源を元の個体/系統へ戻さない。

新方式は明示指定の内部比較だけ。UI/既定モード・画像・製品版・配布は変更していない。全ターンの観測自体は観測側に残り、その量が一定になる保証ではない。通常画面/Worker/図鑑への全接続はCS07。自然500T・自然P/Q多世代・総合速度/メモリ・ブラウザ画面/Windowsは未測定。次はCS05。
