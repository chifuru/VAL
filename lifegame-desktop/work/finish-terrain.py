from pathlib import Path
import json,re
base=Path('operations/evidence/terrain-seams-v4.2.27')
(base/'README.md').write_text('''# 地表の継ぎ目 — 4.2.27

## 結果と範囲

投影前のUV画像にも矩形の継ぎ目があり、メッシュ投影だけが原因ではなかった。地表原画の端のフェザーを8%から22%、スタンプの重なりを周期の1.28倍から1.55倍に変更。原画をぼかさず、端の透明度だけを変更した。before/afterで矩形の切れ目は和らいだが、模様の反復は残る。全マップ・全条件の外観承認ではない。

- `old-uv.png` / `current-uv.png`: 同じ8×8領域の投影前比較。
- `projected-old.png` / `projected-current.png`: 同じ自然盤面・カメラから、生物と地上小物を私有描画コピーで除外した地表比較。製品には除外処理なし。
- `near-current.png`: 生物と小物を戻した通常画面。

## 限定検証

`node tests/terrain-seams-ui.cjs` 16項目、`node --test tests/projection.test.cjs` 3項目を通過。実河川40×28の全1120中心の選択、水面高さ、11原画読込、3種の均質地表の不透明性、キャッシュ再利用/退避後の再現、遠景全個体、生態指紋不変、ブラウザ例外なしを確認。

カメラパッチの重複部分512×512を比較。旧版は最大1/平均0.000463、新版は最大2/平均0.000255チャンネル階調の差。整数画素分ずれた領域で、少数の合成丸め差が残るため完全画素一致とはしない。上限2かつ平均0.001未満を検査する。旧版より平均誤差は増えていない。位置・模様の連続性は比較画像でも確認した。

初回生成711.7→576.8ms、キャッシュ済み地表描画の中央値は両版0.1ms（8回）。単一の私有診断条件であり、実ゲームの速度倍率を示す値ではない。詳細はreport.json。

## 保持したものと配布

生態処理・地形/環境・通行判定・投影・35PNG原画・UI・遠景記号・状態札の操作は変更なし。500Tは描画変更だけのため繰り返さず、4.2.25の通常再生実測を保持する。情報生成0/菌膜終端0/水中生産者の孫繁殖0等の既知未達は解消扱いにしない。

Windows4.2.27を生成し、ASARの全72ソース/35PNGが作業版と一致。package-match.json、scope.json参照。実Windows起動は未確認。正式状態は草案。
''')
for name in ['diagnostic.json','projected.png']:
 (base/name).unlink(missing_ok=True)
msg='4.2.27で地表原画のフェザーと重なり幅を拡大し、投影前からある矩形境界を緩和。河川の前後画像、16項目と投影3項目を限定照合。生態・地形・投影・原画・UI不変。反復模様/全背景外観は未解決。詳細: operations/evidence/terrain-seams-v4.2.27/README.md。草案。'
pkg='Windows4.2.27生成、全72ソース/35PNG同梱一致。実Windows起動未確認。詳細: operations/evidence/terrain-seams-v4.2.27/package-match.json。草案。'
for node in ['C8.1','D9','E6','C4','D4','E7']:
 p=Path('valis/nodes')/node[0]/(node+'.md'); s=p.read_text(); parts=s.split('---',2); data=json.loads(parts[1]); key='logs' if node[0]=='E' else 'files'
 paths=['operations/evidence/terrain-seams-v4.2.27/README.md','operations/plans/terrain-seams-v4.2.27.md']
 paths+=['operations/evidence/terrain-seams-v4.2.27/package-match.json'] if node in ['C4','D4','E7'] else ['tests/terrain-seams-ui.cjs','operations/evidence/terrain-seams-v4.2.27/report.json']
 for f in paths:
  if f not in data.setdefault(key,[]): data[key].append(f)
 if 'version' in data:data['version']='app4.2.27'
 parts[1]='\n'+json.dumps(data,ensure_ascii=False,indent=2)+'\n'
 p.write_text('---'.join(parts)+'\n\n## 4.2.27 地表境界の混合\n\n'+(pkg if node in ['C4','D4','E7'] else msg)+'\n')
p=Path('valis/summary/lifegame-desktop.summary.md');s=p.read_text()
for node in ['C8.1','D9','E6','C4','D4','E7']:
 pattern=r'(^[\t]*'+re.escape(node)+r':[^\n]*\n.*?^[\t]*実態:\n)([\t]*)([^\n]+)'
 s,n=re.subn(pattern,lambda m:m[1]+m[2]+(pkg if node in ['C4','D4','E7'] else msg),s,count=1,flags=re.M|re.S)
 assert n==1,node
p.write_text(s)
p=Path('operations/plans/remaining-completion-v4.2.md');s=p.read_text().replace('製品基準は4.2.26','製品基準は4.2.27').replace('次は地表の投影前後比較で背景継ぎ目を絞り、死亡済み行為者の表示と、','地表の投影前後比較からフェザー/重なり幅を調整し、矩形境界を緩和（terrain-seams-v4.2.27）。反復模様/全背景の外観は未解決。次は死亡済み行為者の表示と、');p.write_text(s)
p=Path('operations/plans/terrain-seams-v4.2.27.md');s=p.read_text().replace('均質地表や連続グラデーションの私有診断','均質地表の私有診断');p.write_text(s+'\n## 作業結果と出力前ゲート\n\n地表合成を局所修正。ブラウザ16/投影3項目を通過し、Windows72ソース/35PNG同梱一致。既存6Nodeと現在状態のみのManifestへ反映。新Node/正式状態変更なし。実Windows・全背景外観は未確認、反復模様は残件。証跡とNEXTを照合し、Manifest検査後にmainへ統合する。\n')
