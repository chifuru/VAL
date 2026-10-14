# 残10系統の実装接続とsrc配置 — 実行契約（草案）

- 指示: 再帰/光帆/重力/星晶/多眼/深殻/並列/記憶/蛇/日輪を実装可能にし、完成ファイルをsrcへ配置。
- FLOW: 02読解/06影響→04既存素材責務内の修正/07検証計画接続→05配布接続→08実検証/E18→05Manifest反映。
- 粒度: C1.5.2の同一アトラス生成・系統別辞書を拡張。C1.5.1は配布・配置、C1.5.3は共通描画。D1.3.2/3が画像/操作を担当。処理責務を変えないためA/B/C/Dの新分割なし。E18は今回バッチの独立証跡。系統別ファイル・台帳・結果は独立して追跡する。
- 前提: 標準core3関連定義を実読。設計モックのテーマを参照し、新10系統もimage_gen参照派生として生成。元画の実画素切出し/旧ZIP一致/人間画質承認とは区別する。
- 完成runtime配置: src/assets/organs（12アトラス＋領域/アンカー/出所台帳）、src/assets/composite/lineage-webp/reference-thumbs（元68画像）、src/Index.html/Index.composite-v4.html、src/composite。原モックdesign、計画operations/plans、テストtests、証跡operations/evidenceは参照・検証資料。
- 保存: 旧68画像はバイト無変更でsrc/assetsへ移動。バンドル内部のassets/...はsrc基準の仮想パスとして維持。先行2アトラスも無変更でsrcへ移動。原画・過去記録は保持。
- 描画: 12旧系統すべてPNGアトラスでLv1〜3の実器官表示。実画像がある系統は仮SVGをruntimeへ導入しない。系統/XP/相間継承/成熟/原文/第四相の規則は維持。
- 作成: 10PNG、台帳拡張、E18。更新: 既存C1.5.1/2/3・D1.3.2/3、ビルダー/検査/ブラウザ回帰/Manifest。新規A/B/C/Dなし、初期登録E18のみ。
- 受入: 12アトラス36領域のalpha/可視画素・異なるLv、原本出所SHA/出力SHA/領域/根元境界、全14図鑑/主CanvasLv差/実育成N15/1000/交差継承/履歴/420px、元68バイト・両HTML整合、src単独HTTP配信と実装資産配置。
- Git: mainへ通常commit/push。全ノード草案維持。core・Code.gs・engine・pixel legacyは不変更。強制push/実GASデプロイなし。
