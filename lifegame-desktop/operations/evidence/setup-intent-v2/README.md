# 世界作成UI：優先3点の限定確認

対象: main e32bcacを基点とするapp4.2.74の設定UI差分。Linux Chromiumでの限定確認。正式61Nodeは草案のまま。

## 変更

- 観察セットの説明カードと、未固定項目の決め方／おまかせの傾向を分離。
- 自動／指定値／セット固定と、不使用を分けて表示。自動値は基準値と未決定を明示し、個別に自動へ戻せる。
- ⑤に今回使う条件を集約し、「変更」で該当欄へ移動。閉じた詳細を開き、固定値なら上位の観察セットへ案内する。
- 既存の地形制約で傾向が自動へ戻った場合は近くへ通知。今回の条件まとめ追加に伴い、下層リセットからもまとめを更新する。

## 実測

- [report.json](report.json): 35項目。3セット×自動/指定の6構成で旧main e32bcacとconfig一致（毎回生成するseed/terrainSeedを除く）。個別指定/解除、無効群、供給OFF、空欄/0、規模と固定値、変更リンク、地形制約通知、390px、実行エラーなしを確認。
- [flow/report.json](flow/report.json): 既存27項目。5区画、制約・欄エラー・修正先、小世界の実生成、取消と旧世界保持。
- [defaults/report.json](defaults/report.json): 既存13項目。初期値復帰、世界/記録/表示選好保持、取消再開、標準世界作成。
- readConfig本体は旧mainとバイト一致。生態計算ソースに変更なし。Manifest試験と差分照合の結果は[output-gate.json](output-gate.json)。

## 実画面

- [観察条件](observation-conditions.png)
- [今回使う条件](effective-conditions.png)
- [セット固定の地形](preset-values.png)
- [全体](setup-desktop.png)、[390px](setup-mobile.png)

## 限界

対象の設定導線のみ。全容量・全生態条件・500T・実Windows・配布・総合性能は未実測。生成規則・設定/保存形式・採用素材・観測画面は維持。設計モックは別資料であり実画面と混同しない。地形サムネイル、全詳細の再編、近似計算、新たな生態拡張は今回対象外。
