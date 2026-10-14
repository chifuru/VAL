# FizzBuzz Creature — 実行・画像ファイル

完成した実行ファイルと画像はこのsrcディレクトリに配置する。

- `Index.html`: GASへ配置する自己完結HTML。`Index.composite-v4.html`は同じ内容の独立表示版。
- `Code.gs` / `appsscript.json`: 既存GASサーバーと設定。
- `composite/`: 編集用テンプレート・CSS・ゲームエンジン・画像描画。
- `assets/organs/`: 旧12系統（先行2＋追加10）の各Lv1/2/3透明PNGアトラス、領域・根元・表示レイヤー・出所SHAの台帳。
- `assets/composite/`, `assets/lineage-webp/`, `assets/reference-thumbs/`: 既存68画像。バイト内容は保持。

HTMLは全画像を埋め込むため、src外のdesign/やtools/がなくても実行できる。ローカルの内部確認にはsrcをHTTP配信し、`Index.html`を読む。実際のGAS配置ではHTMLをIndexとして登録し、既存Code.gsを使う。外部へのデプロイ・権限変更は別の作業。

アトラスは配置済みモックを参照したAI加工派生であり、原画のバイト同一切り出しではない。全12系統をPNG器官で表示するが、既存の暫定全身肖像や「1旧系統1器官」のエンジン粒度は維持している。完成画質の人間受入・全部位分解・第四相実装は別の確認項目。

リポジトリから更新する場合:

```sh
npm run build:composite
npm test
npm run check:assets
npm run check:composite
```

`tests/browser-smoke.cjs`の`VALIS_PREVIEW_URL`で、src単独配信に対するブラウザ回帰を実行できる。原モックと検証記録はsrcの実行に必要なファイルではなく、design/とoperations/evidence/に保持する。

器官一覧: `organ-catalog.html`。旧12系統の主表示と図鑑は、枠線/文字/複数個体が混入した旧暫定肖像を使わず、共通身体＋器官を合成する。旧24肖像のファイル自体は参照資産として保持する。
