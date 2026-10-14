# 深海・神鳥の器官アトラス（草案）

`abyss-lv-atlas.png` と `myth-lv-atlas.png` は、配置済み深海種・神鳥竜モックをimage_genへ参照して作った透明背景のAI加工派生。原画の実画素切り出し、旧ZIP原本一致、完成画質とは称しません。各画像はLv1/2/3を横に配置し、`ledger.json`が出所SHA・出力SHA・領域・根元・表示アンカーを記録します。

ビルダーは元68画像を保持したまま別の`authoredOrgans`レジストリへPNGを埋め込みます。Canvasは同じ領域を器官サムネイル・主生物・歴史へ使用します。系統判定やXP/相間継承は既存エンジンのままです。残り10旧系統はSVG仮器官で、既存全身肖像も暫定素材です。

更新時はPNGと台帳SHAを同時に更新し、`npm run build:composite`で両HTMLを再生成して、`npm test`・`npm run check:assets`・`npm run check:composite`・実ブラウザ検証を実行してください。元モックは変更しません。
