# 種別初期数・寄生群体数の限定接続（4.2.16）

基準main 5466da4（4.2.15）。coreをプロジェクト標準配置から再読し、既存責務のFLOW-04/05、D8/D9とE5/E6へ接続。新Nodeや正式状態変更なし。

非主7種の初期個体数とP2種/Qの初期群体数を直接指定。空欄は旧自動、明示0は初期なし。指定種の不足を他種で代替せず、容量/宿主不足なら旧世界を保持する。Pは既存第一宿主、Qは探索群体から開始し、優遇ごとの宿主候補制約と初期E移転を維持する。指定/実数レポートを保存し再生へ適用。

## 実測

- 新単体8件通過（unit.log）：自動と直接指定の混在、明示0、初期0から環境由来定着、P第一宿主/Q探索、適地/宿主不足、入力不正/無効群/保証競合、群の実効目標、保存再生12T・収支/不変条件、従来署名の機能別制限。
- 旧8優遇×2条件×30Tで生態指紋/統計一致（model-report.json）。供給/旧初期量の有無を含む。before-modules.cjsは基準静的モデル。個別数を指定しない条件の互換確認であり、新指定の長期生存認定ではない。
- 関連5テストファイル通過（regression.log）：initial-supply / producer-support / observation-model / archive / archive-history。
- Linux Chromium29項目（ui-report.json）：空欄と0、正確配置/実数案内、宿主・容量不足時の設定内案内と元世界保持、再試行、取消、設定復帰/自動へ戻す、Worker/同期一致、実図鑑保存再生、既存グラフ維持、狭幅、通常dialog/pageerror0。
- 既存observation-modelの全8優遇×2T・実Worker/同期一致と保存再生を再確認（model-ui.log / model-ui-regression）。
- 原画35PNG・主21系統183枝の参照整合、基準版と画像ハッシュ一致（assets.log / scope.json）。生物/背景の描画変更なし。
- Windows4.2.16生成、変更srcと原画35PNGの同梱一致（package-report.json / package-match.json）。実Windows起動は未実施。

setup.png / screen-active.pngは実装画面。初期配置結果は既定で折り畳み、必要時だけ指定/実数を開く。テスト画面の初期数は操作確認条件であり、推奨バランスの選定ではない。

## 限定と後続

新500T/全設定の長期存続、最終密集外観/端末性能/実Windowsは未確認。初期0は出生/供給/感染を永久禁止しない。Qの1024群体上限は入力上限であり、その数での快適性を認定しない。生態係数・繁殖/感染窓の規則は今回変更しない。次は工程8の渡河/領域/繁殖/寄生/情報と説明の照合。攪乱UI等も全残件計画へ保持する。

正本: design/specification/founder-counts-v1.md。契約: operations/plans/founder-counts-v4.2.16.md。NodeとManifestの現在要約へ反映し正式状態は草案を維持。
