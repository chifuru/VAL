# 遠景記号・重なり v2.6の限定証跡

app2.6.0 / Linux x64 / Node24.19.0 / Chromium154。実装契約は[overview-ui-v2.6](../../plans/overview-ui-v2.6.md)、対象実体は[source-hashes.json](source-hashes.json)、判定は[validation.json](validation.json)。UI全体完成、モックとの最終一致、生態バランス完成を意味しない。

## 通常の初期配置からの実画面

[盤面だけの遠景](overview/natural-board.png) / [遠景と凡例](overview/natural-overview.png) / [同じ世界の近景](overview/natural-detail.png)。蛇行河川40×28、主80体・少数系統、初期値overview-natural、ターン0。配置を描画用に作り替えていない。遠近は同じ世界の同じターンで、拡大による生態指紋の変更はない。

遠景の主21系統・餌6系統・資源8種は固有形の記号。主/餌/資源/死骸をセル内の別位置へ描き、P/Qは宿主に付随する印にする。凡例と盤面は同じ描画関数を使い、凡例の個体数は確定世界から集計する。全対象を描画しても、縮小で記号が同じ画素へ重なることはある。8px/セル未満では判読限界を明示し、選択内訳と拡大へつなぐ。

## 検査

- [遠景15項目](overview/report.json)、[実行ログ](overview.log)。35形の描画結果の区別、凡例の実数一致、全個体/資源/死骸の描画対象、主/餌共存とP/Q、大盤面160×112、遠近の生態独立、縮小限界・狭幅・例外なしを確認。
- [年齢16項目](age-ui/report.json)、[既存画面45項目](browser/report.json)、[観測・保存再生13項目](observation/observation.json)成功。年齢能力、自然進行の有限台帳、同一終端指紋、再記録しない条件を回帰確認。
- [構造・配布補助検査](structure.log): 59NodeのID/親子/草案状態、Manifestの177必須項目、参照ファイルとパッケージ構成を照合。
- [生態同一性](biology-identity.json): 生態11ファイルと計算指紋が2.5の実測対象とSHA一致。2.5の限定証跡を同一生態へ適用するだけで、新しい長期試行を実施した扱いにはしない。

## 明示配置した表示fixture

[全記号](overview/symbols-overview-fixture.png) / [同セルの近景](overview/overlap-detail-fixture.png)。主21・餌6を明示配置し、1セルに主/餌・資源8種・死骸・宿主P/Qを重ねた表示検査。自然発生・進化・収支成立を示す画像ではなく、このfixtureでターンを進めていない。通常配置の画像とは別に保持する。年齢比較画像もage-ui/report.jsonに明示したfixture。

## 残る対象

近景の採用新造形、専用年齢体形・雌雄差、自然な背景の作画仕上げ、実寸の最終判読性は未完。微細な記号の区別・演出品質の最終承認は利用者確認を要する。確定イベントの演出は従来の128対象上限を維持する。300〜500の各系統存続率、結果の多様性、P/Q維持、Windows実exe2.6は未確認。2.2のWindows成功を流用しない。
