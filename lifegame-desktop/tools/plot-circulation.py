"""Standalone evidence figure; English labels avoid machine-specific font dependencies."""
import gzip,json
from pathlib import Path
import os
os.environ.setdefault("MPLCONFIGDIR", "/tmp/lifegame-matplotlib-cache")
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
root=Path(__file__).resolve().parents[1]/'operations/evidence/circulation-audit-v4.2.19'
histories={k:json.loads(gzip.decompress((root/(k+'-history.json.gz')).read_bytes()))['rows'] for k in ['off','on']}
data={k:json.loads(gzip.decompress((root/(k+'-states.json.gz')).read_bytes())) for k in ['off','on']}
fig,axes=plt.subplots(3,2,figsize=(13,12),sharex=True)
series=[('Main organisms',['main']),('Producers',['grass','algae','phytoplankton']),('Primary consumers',['waterbug','grassbug']),('Parasite colonies',['tideparasite','leafparasite','hyperparasite']),('Descendant maturation',['matured']),('Descendant reproduction',['reproduced'])]
for ax,(title,keys) in zip(axes.flat,series):
 for j,key in enumerate(keys):
  for condition,style in [('off','-'),('on','--')]:
   rows=data[condition]
   if key in ['matured','reproduced']:
    y=[sum(c.get(key,0) for c in r['demography'].values() if c['generation']>0 and c['species'] not in ['algae','moss','grass','fungus','phytoplankton']) for r in rows]
   elif key=='main':y=[r['stats']['main'] for r in rows]
   else:y=[r['current']['counts'].get(key,0) for r in histories[condition]]
   ax.plot([r['turn'] for r in rows],y,linestyle=style,color=plt.get_cmap('tab10')(j),label=key+' / supply '+condition,linewidth=1.6)
 ax.set_title(title);ax.set_ylabel('count');ax.grid(alpha=.2);ax.legend(fontsize=8)
for ax in axes[-1]:ax.set_xlabel('turn')
fig.suptitle('LifeGame 4.2.19 - one fixed river/seed, 500 turns per condition',fontsize=14)
fig.text(.5,.012,'Solid: supply OFF | Dashed: supply ON | Private compute audit; not survival probabilities or render-speed evidence.',ha='center',fontsize=9)
fig.tight_layout(rect=[0,.03,1,.965]);fig.savefig(root/'comparison.png',dpi=160);plt.close(fig)
