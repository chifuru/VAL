# CS02：現在状態の情報集約・限定確認

起点 `320a3c453dc0d99555413b95609d7acbf1e2030d`。製品4.2.77は維持。生態署名 `3b46b3e56ae5d6a05819898eaf2e74179bffa584a7d581ed6803802c91dd7291`。[実装契約](../../../design/implementation/current-state-information-v1.md)、[対象ハッシュ/判定](report.json)。C7/C7.1/C7.3/C7.5 → D7/D8.2 → E5、C8.2 → D9 → E6の今回範囲。

## 実装した範囲

明示指定の内部比較 `currentStateModel=current-state/1` に、b+a、発信/受信の集約、正負と慣れ、同T一度の受容費、死亡場所の期限区分、同期拡散/失活、Qの実リンク/有限残留を接続した。旧16/64件の列と併存させない。出生・本人経験・情報による変化を同じ実効差分の更新へ通す。

環境場は死者IDを保持せず、現在の分類/量/強度/根拠量へ集約する。新しい比較状態の図鑑保存/読取は、CS07の形式接合まで明示拒否する。通常画面の既定条件は変更していない。

## 結果

| 確認 | 結果 | 証跡 |
| --- | --- | --- |
| 新方式の境界 | 15成功。b+a/上限/出生、本人経験と受信、正負/慣れ、親子/適合/費用/影響度0、宿主選好とDNAの分離、場の期限/量/強度/根拠移送、場所の一時作用、Q残留/保存拒否 | [current.log](current.log) |
| 新方式の短期接合 | 上記15項目内で、代表1条件の自然3T・生成元/生成物の全世界一致、取消時の元世界不変と各Tの不変条件が成功 | [検査コード](../../../tests/current-information.test.cjs) |
| 既存の情報境界 | 26成功 | [legacy-information.log](legacy-information.log) |
| 既存の保存/Worker | 4成功。通常情報・従来情報の再生、Workerの段階/再開 | [flow.log](flow.log) |
| 既存の通常ターン | 7成功。生成元/生成物・一括/段階・取消/失敗・Worker3形式・短期保存再生・500境界 | [turns.log](turns.log) |
| 変更していない経路の起点比較 | 3条件×T0〜T2の全世界/観測行が一致。CSVはraw署名だけが異なる。旧記録の再計算結果が一致し、保存bytesと件数を変更しない | [legacy-parity.json](legacy-parity.json) |

計52項目。500境界検査は時計499からの2Tであり、自然500Tではない。時間欄はテスト実行時間であり、旧/新方式の性能改善率として扱わない。

署名更新直後、従来方式のI06記録再生検査が1件失敗した。原因は新署名が旧署名の照合経路に入らないことで、変更していない経路の短期比較後に `currentStateModel` 未指定という条件でのみ互換を接続した。新集約方式は旧結果へ互換登録せず、新状態の図鑑形式も偽装しない。最終の4件は成功。

## 再実行

```sh
node --test-reporter=tap tests/current-information.test.cjs
node --test-reporter=tap tests/persistent-information.test.cjs
node --test-reporter=tap tests/persistent-information-flow.test.cjs
node --test-reporter=tap tests/cell-turn.test.cjs
git show 320a3c453dc0d99555413b95609d7acbf1e2030d:lifegame-desktop/src/ecology/observation-modules.js > /tmp/current-information-baseline-modules.js
node tests/current-information-legacy-parity.cjs /tmp/current-information-baseline-modules.js
node tools/build-observation-model.cjs --check
```

## 有効範囲と残件

内部比較の情報処理と、既存経路の短期接合に限定した証跡。生態署名が変わった新規則の軌道を、旧世界JSONと一致させる確認はしていない。

土壌/死骸と資源要求はCS03、関係/摂取構成はCS04、卵はCS05、活動更新はCS06、全T観測/Worker/画面/図鑑の新形式全接合はCS07。新方式の長期自然循環、状態量/計算/転送/描画の比較、ブラウザ操作、Windows作成/実起動、配布は未実施。今回だけで負荷全体や自然P/Q多世代・全系統生存を解決したとは扱わない。
