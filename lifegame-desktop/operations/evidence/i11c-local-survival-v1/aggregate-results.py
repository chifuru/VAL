"""Summarize the preregistered three cases; retain every measured row separately."""
from pathlib import Path
import collections
import gzip
import hashlib
import json

here = Path(__file__).resolve().parent
read = lambda p: json.loads(p.read_text())
unzip = lambda p: json.loads(gzip.decompress(p.read_bytes()))
signatures = {
    'v2': 'ada68bb8fff06b5e6125b11e952e2c7be43e31967cee7c364ea8449739018a97',
    'v3': 'c78400a515eba25515dd699c1f3f5ba6cc2004c5dc4b992fbf3e4c2d1c6082d9',
}
rows, totals = [], collections.Counter()
for n in range(3):
    pair, configs, initial, histories = {}, [], [], {}
    for variant in signatures:
        stem = f'aquatic-carnivore-{n}-T120'
        folder = here / 'parasite-runs' / variant
        summary = read(folder / (stem + '.summary.json'))
        assert summary['status'] == 'complete'
        assert summary['model']['replaySignature'] == signatures[variant]
        for a in summary['artifacts'].values():
            assert hashlib.sha256((folder / a['file']).read_bytes()).hexdigest() == a['sha256']
        biology = unzip(folder / (stem + '.biology.json.gz'))
        observation = unzip(folder / (stem + '.observations.json.gz'))
        short = unzip(folder / (f'aquatic-carnivore-{n}-T60.observations.json.gz'))
        assert observation['rows'][:61] == short['rows']
        assert [r['turn'] for r in observation['rows']] == list(range(121))
        assert summary['invariants'] == dict(checkedStates=121, allFinite=True,
                                            errors=0, observationRestoreValid=True)
        config = summary['requestedConfig'].copy()
        config.pop('balanceModel')
        configs.append(config)
        initial.append((biology['initialCounts'], biology['initialAges'], biology['initialEntities']))
        histories[variant] = observation['rows']
        q, p, p_stages = collections.Counter(), collections.Counter(), collections.Counter()
        for r in biology['turns']:
            q.update(r.get('hyperFlow', {}).get('bySpecies', {}).get('hyperparasite', {}))
            for species in r.get('primaryFlow', {}).get('bySpecies', {}).values():
                for route, flow in species.items():
                    for metric in ['exposures', 'invaded', 'established', 'transferred']:
                        p[f'{route}:{metric}'] += flow.get(metric, 0)
        by_id = {}
        for r in biology['parasiteStates']:
            if r['kind'] == 'Q':
                by_id.setdefault(r['id'], []).append(r)
            else:
                p_stages[r['stage']] += 1
        emerged_ids = sorted(id for id, states in by_id.items()
                             if any(s['location'] == 'host' for s in states)
                             and any(s['location'] == 'free' and s['phase'] == 4 for s in states))
        assert len(emerged_ids) == q['emerged']
        pair[variant] = dict(
            signature=signatures[variant], configHash=summary['request']['configHash'],
            initial=summary['actualInitialParasites'],
            final={id: summary['finalCounts'][id] for id in
                   ['abyss', 'abyssshell', 'cephalopod', 'waterbug', 'fungus', 'tideparasite', 'hyperparasite']},
            finalFingerprint=summary['finalFingerprint'],
            Q={k: round(v, 8) for k, v in q.items()}, P=dict(p),
            PStageIndividualTurns=dict(p_stages),
            potentialMaturityWindowIndividualTurns=sum(len(r['openQWindows']) for r in biology['turns']),
            sameQIdsEmerged=emerged_ids,
            newQGenerationIds=sorted({r['id'] for r in biology['births'] if r['kind'] == 'Q'}),
            survivingQAt60=biology['turns'][60]['counts']['hyperparasite'],
            survivingQAt120=biology['turns'][120]['counts']['hyperparasite'],
            checkedStates=121, allFinite=True, observationRestored=True, shortPrefixExact=True,
        )
        totals['states'] += 121
    assert configs[0] == configs[1], 'paired requests differ beyond balanceModel'
    assert initial[0] == initial[1], 'initial ages/counts/IDs differ'
    changed = [a['turn'] for a, b in zip(histories['v2'], histories['v3']) if a != b]
    rows.append(dict(case=f'aquatic-carnivore-{n}', pairedConfigExactExceptVersion=True,
                     initialExact=True, firstDifferentObservationTurn=changed[0] if changed else None,
                     variants=pair))

result = dict(
    definition='i11c-preregistered-parasite-comparison/1', baseline='48876e7',
    versions=signatures, cases=rows, finalStatesChecked=totals['states'],
    additional60TStatesChecked=366, totalMeasuredStates=totals['states'] + 366,
    selection='All three prespecified seeds, both versions; no replacement or outcome selection.',
    extension='An emergence at 60T triggered extension of all three cases and both versions to120T.',
    interpretation=[
        'Same-ID emergence of initially attached Q is not new Q establishment or a completed generation.',
        'Potential P maturity-window individual-turns are not guaranteed accessible/compatible windows for each Q.',
        'No 500T balance improvement is certified by this short diagnostic.',
        'Timing under concurrent headless checks is not browser playback performance.',
    ],
)
(here / 'parasite-comparison.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
for row in rows:
    print(json.dumps(dict(case=row['case'], variants={v: dict(Q=p['Q'], final=p['final'],
          emergedIds=len(p['sameQIdsEmerged']), newQ=len(p['newQGenerationIds']))
          for v, p in row['variants'].items()})))
