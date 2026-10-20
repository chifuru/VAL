"""Pack retained image_gen transparent edits; never draw new anatomy or alter originals.

Requires Pillow, NumPy and SciPy. Only immutable source copies, existing alpha-body
separation, contain-resampling and placement run here. No runtime background removal.
"""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src/assets'
REVIEW = ROOT / 'design/parasite-runtime-v1'
SOURCES = {
    'tideparasite-reference-v1': 'design/appearance-baseline-v1/03-tideparasite-phases.png',
    'leafparasite-reference-v1': 'design/appearance-baseline-v1/04-leafparasite-phases.png',
    'hyperparasite-internal-reference-v1': 'design/appearance-baseline-v1/05-hyperparasite-source-i-iii-only.png',
    'hyperparasite-adult-reference-v1': 'design/appearance-baseline-v1/06-hyperparasite-adult.png',
}
GENERATED = {
    'tideparasite': 'exec-f58e4416-c379-4a7b-abc6-552789c9138b.png',
    'leafparasite': 'exec-10c3b55b-f350-40ee-8502-02395eb0d1e7.png',
    'hyperparasite': 'exec-3e5b807b-b563-43af-be23-a98c66f8f8e8.png',
}
PANELS = [form + '-' + phase for form in ['A', 'B', 'C'] for phase in ['I', 'II', 'III']]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def metadata(path):
    im = Image.open(path)
    return {'file': path.name, 'width': im.width, 'height': im.height, 'sha256': sha(path)}


def bodies(path, count):
    """Separate already-transparent bodies and retain their own soft alpha fringe."""
    im = Image.open(path)
    assert im.mode == 'RGBA', (path, im.mode)
    pixels = np.array(im)
    labels, _ = ndimage.label(pixels[:, :, 3] > 80)
    sizes = np.bincount(labels.ravel())
    ids = [i for i in range(1, len(sizes)) if sizes[i] > 15000]
    assert len(ids) == count, (path, len(ids), count)
    core = np.where(np.isin(labels, ids), labels, 0)
    nearest = ndimage.distance_transform_edt(core == 0, return_distances=False, return_indices=True)
    owners = core[tuple(nearest)]
    centers = {}
    for index in ids:
        y, x = np.nonzero(core == index)
        centers[index] = (float(y.mean()), float(x.mean()))
    ordered = []
    if count == 9:
        for row in range(3):
            members = [i for i in ids if row * im.height / 3 <= centers[i][0] < (row + 1) * im.height / 3]
            assert len(members) == 3, (path, row, centers)
            ordered += sorted(members, key=lambda i: centers[i][1])
    else:
        ordered = sorted(ids, key=lambda i: centers[i][1])
    result = []
    for index in ordered:
        rgba = pixels.copy()
        rgba[owners != index, 3] = 0
        body = Image.fromarray(rgba)
        bounds = body.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        assert bounds
        result.append((body.crop(bounds), {'sourceComponent': int(index), 'sourceAlphaBoundsLTRB': list(bounds)}))
    return result


def build():
    path = ASSETS / 'visual-manifest.json'
    manifest = json.loads(path.read_text())
    registry = {
        'version': 'parasite-runtime-art/1',
        'kind': 'retained-transparent-edit-static-pack-not-new-anatomy-or-age-direction-concept',
        'sources': [], 'edits': [], 'derived': [],
        'excluded': ['05-hyperparasite-source-i-iii-only.png panel IV', 'hyperparasite-four.png panel IV: compact claws/short shell differs from adopted 06; replaced by single-reference edit', 'orange P host in Q internal reference', 'host skin, scene, labels, frames'],
    }
    for key, source in SOURCES.items():
        original, target = ROOT / source, ASSETS / (key + '.png')
        shutil.copyfile(original, target)
        manifest['sheets'][key] = metadata(target)
        registry['sources'].append({'file': source, 'sha256': sha(original), 'runtimeCopy': str(target.relative_to(ROOT)), 'copySha256': sha(target)})
    manifest['parasites'] = {}
    for species in ['tideparasite', 'leafparasite', 'hyperparasite']:
        hyper = species == 'hyperparasite'
        count, columns = (4, 4) if hyper else (9, 3)
        panels = ['I', 'II', 'III', 'IV'] if hyper else PANELS
        edit = REVIEW / 'edits' / (species + ('-four.png' if hyper else '-nine.png'))
        registry['edits'].append({'file': str(edit.relative_to(ROOT)), 'sha256': sha(edit), 'generatedFilename': GENERATED[species], 'shapeCount': count, 'purpose': 'background/host/text/frame removal only; approved anatomy retained'})
        extracted = bodies(edit, count)
        if hyper:
            fix = REVIEW / 'edits/hyperparasite-adult.png'
            registry['edits'].append({'file': str(fix.relative_to(ROOT)), 'sha256': sha(fix), 'generatedFilename': 'exec-ec017d68-a1e8-48b9-89c5-f1400a6cb0c5.png', 'shapeCount': 1, 'purpose': '06-only background removal retaining long side slabs, two short contact organs; replaces unfaithful four-sheet IV'})
            extracted = extracted[:3] + bodies(fix, 1)
        atlas = Image.new('RGBA', (columns * 384, ((count + columns - 1) // columns) * 384))
        regions, bounds, records, references = [], [], [], []
        for index, (body, record) in enumerate(extracted):
            body.thumbnail((352, 352), Image.Resampling.LANCZOS)
            x, y = index % columns * 384, index // columns * 384
            dx, dy = (384 - body.width) // 2, (384 - body.height) // 2
            atlas.alpha_composite(body, (x + dx, y + dy))
            regions.append([x, y, 384, 384])
            bounds.append([dx, dy, body.width, body.height])
            if hyper:
                reference = manifest['hyperparasite']['references'][index]
            else:
                # The portrait is an exact source-panel crop, including its
                # explanatory scene; only the separate transparent atlas is used
                # on the board. Keep tissue close to the panel's upper edge.
                row=index//3
                reference = {'sheet': species + '-reference-v1', 'region': [index % 3 * 512 + 8, [0,338,670][row] + 8, 496, [338,332,354][row]-16]}
            references.append(reference)
            used_edit = fix if hyper and index == 3 else edit
            records.append({'panel': panels[index], **record, 'edit': str(used_edit.relative_to(ROOT)), 'editSha256': sha(used_edit), 'originalReference': reference, 'atlasRegion': regions[-1]})
        target = ASSETS / (species + '-atlas-v1.png')
        atlas.save(target)
        manifest['sheets'][species + '-atlas-v1'] = metadata(target)
        manifest['parasites'][species] = {'sheet': species + '-atlas-v1', 'regions': regions, 'bodyBounds': bounds, 'panels': panels, 'references': references, 'fit': 'contain', 'source': 'adopted-parasite-background-removal/1', 'stateVersion': 'hyper-state/1' if hyper else 'primary-form/1'}
        registry['derived'].append({'species': species, 'file': str(target.relative_to(ROOT)), 'sha256': sha(target), 'shapeCount': count, 'extraction': records})
    manifest['hyperparasite'].pop('provisionalBody', None)
    manifest['hyperparasite']['finalTransparentArt'] = 'parasites.hyperparasite: adopted-parasite-background-removal/1'
    manifest['hyperparasite']['runtimeBody'] = 'Own I/II/III/IV body from retained transparent edit; no old IV or orange host tissue.'
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ASSETS / 'visual-manifest.js').write_text('globalThis.EcoVisualManifest = ' + json.dumps(manifest, ensure_ascii=False) + ';\n')
    (REVIEW / 'registry.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n')
    reference_path = ASSETS / 'hyperparasite-reference-registry-v1.json'
    reference = json.loads(reference_path.read_text())
    reference['runtimeBody'] = 'Own I/II/III/IV retained transparent edit in hyperparasite-atlas-v1; provenance design/parasite-runtime-v1/registry.json. Old flagless bodies remain life-f.'
    reference_path.write_text(json.dumps(reference, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'shapeCount': 22, 'sheets': len(manifest['sheets']), 'registry': str((REVIEW / 'registry.json').relative_to(ROOT))}))


if __name__ == '__main__':
    build()
