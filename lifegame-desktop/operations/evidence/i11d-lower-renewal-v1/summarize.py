"""Summarize actual cases without pooling the distinct density groups."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent
rows = []
for folder, turns, variants, cases in [
    ('screen', 50, ['baseline', 'grass-sense', 'grass-move', 'grass-both', 'grass-swift', 'fungus-half', 'fungus-quarter'], ['river-0', 'lake-1']),
    ('mid', 150, ['baseline', 'joint'], ['river-0', 'lake-1', 'woodland-2']),
    ('check', 150, ['baseline', 'joint'], ['river-0', 'lake-1']),
    ('long', 500, ['baseline', 'joint'], ['river-0', 'lake-1']),
]:
    for case in cases:
        controls = None
        for variant in variants:
            p = root / folder / f'{variant}-{case}-T{turns}.json'
            d = json.loads(p.read_text())
            assert d['invariantStates'] == turns + 1
            assert [s['turn'] for s in d['series']] == list(range(turns + 1))
            if variant == 'baseline':
                controls = (d['requestedConfig'], d['effectiveConfigHash'], d['initial'])
            else:
                assert controls == (d['requestedConfig'], d['effectiveConfigHash'], d['initial'])
            if folder == 'long':
                shorter = json.loads((root / 'check' / f'{variant}-{case}-T150.json').read_text())
                assert d['series'][:151] == shorter['series']
            for species in ['grassbug', 'waterbug', 'fungus']:
                assert len(d['born'].get(species, [])) == d['births'][species]
            end = d['series'][-1]
            late = d['series'][450:] if turns == 500 else []
            rows.append(dict(
                group=folder, case=case, variant=variant, turns=turns,
                actualInitial={k: d['initial'][k] for k in ['grassbug', 'waterbug', 'fungus']},
                final={k: d['final'][k] for k in ['grassbug', 'waterbug', 'fungus']},
                births={k: d['births'][k] for k in ['grassbug', 'waterbug', 'fungus']},
                generations=d['finalGenerations'], main=end['main'],
                producerCount=end['producerCount'], edibleB=end['edibleB'],
                min450To500={k: min(s[k] for s in late) for k in ['grassbug', 'waterbug', 'fungus']} if late else None,
                initialDensityGroup='80' if folder in ['check', 'long'] else '160',
                stateChecks=turns + 1, fingerprint=d['fingerprint'],
            ))
result = dict(
    baseline='803f677', definition='i11d-lower-comparison/1', rows=rows,
    measuredStates=sum(r['stateChecks'] for r in rows),
    note='Includes rerun prefixes; density groups and exploratory/confirmatory cases are separate. Not a general survival probability or R1-R6 certification.',
)
(root / 'comparison.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
for r in rows:
    if r['group'] == 'long':
        print(json.dumps(r, ensure_ascii=False))
