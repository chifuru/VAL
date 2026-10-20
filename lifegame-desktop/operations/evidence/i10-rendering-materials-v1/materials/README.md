# I10 採用P/Q素材の限定検査

基準mainは`a196f8b`。採用原画4枚を保持し、潮環/葉環の各9形態と抑環4相を別の静的透過atlasへ接続した。出典・編集・除外・セル対応・派生SHAは`design/parasite-runtime-v1/registry.json`。`before-art.js`は基準mainの実行描画ソースを同一コピーした旧経路比較用入力。

`python3 tools/prepare-parasite-assets.py`を保持編集から再実行し、manifest両形式・台帳・atlas3枚の6ファイルがbyte単位で一致した（`reproduction.json`）。画像生成を再実行する検査ではない。元画・編集・atlasのSHA検査と実Chromium検査は`node tests/i10-parasite-materials.cjs`。Linuxのlocalhost接続許可を付けて実行した。

`materials-report.json`は279項目成功、ブラウザ例外0。P18/Q4の選択・22身体の区別、全枠の透明余白・非空、採用元区画肖像との画素一致、旧flagなしP/Q12比較の画素一致、本人相と宿主段階の分離、P老齢/Q全年齢・向き反転、入力不変とキャッシュ再利用を確認。新透明セルの初回老齢描画でも実行時の画素読取は0回。確認時の素材フレームキャッシュ26,542,080 bytes（32MiB上限内）。

`parasite-material-22.png`は現行`Art.parasite()`で直接描画した実行素材比較（同じ表示半径、Qも縦横比を保持）。上から潮環A/B/C×I〜III、葉環A/B/C×I〜III、Q I/II/III/採用06由来IV。最初のQ四相編集の小型IVは不採用として単独06編集へ修正した。これは採用原画の画素コピーではなく背景除去編集であり、最終外観の利用者承認・自然発生率・500T長期生存・全端末性能の証明ではない。

実行環境の制限により、最初の`spawnSync python3`とlocalhost権限なし実行は検査へ入れなかった。静的repackをPython同一プロセスで独立実行し、localhost権限付きの本検査へ分けて解消した。最終レポートは実行した279項目の結果であり、制限を成功扱いにしていない。
