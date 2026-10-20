"""Static packing of retained image_gen background-removal edits; no new anatomy.

Requires Pillow, NumPy and SciPy. Adopted source images are copied unchanged.
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
REVIEW = ROOT / 'design/ryouki-runtime-v1'
PANELS = ['I', 'II', 'III-1', 'III-2', 'III-3', 'IV-1', 'IV-2', 'IV-3', 'IV-4', 'IV-5', 'IV-6', 'mutated-I-III', 'mutated-IV']
SOURCES = {
    'ryouki-normal-reference-v1': 'design/ryouki-v1/01-normal-i-ii.png',
    'ryouki-third-reference-v1': 'design/ryouki-branches-v2/01-third-phase-proposal.png',
    'ryouki-fourth-reference-v1': 'design/ryouki-branches-v2/02-fourth-phase-proposal.png',
    'ryouki-mutated-early-reference-v1': 'design/ryouki-v1/02-density-i-iii.png',
    'ryouki-mutated-iv-reference-v1': 'design/ryouki-v1/03-density-iv.png',
}
REFERENCES = [
    ('ryouki-normal-reference-v1', [20, 220, 720, 360]),
    ('ryouki-normal-reference-v1', [790, 217, 738, 371]),
    ('ryouki-third-reference-v1', [18, 192, 620, 320]),
    ('ryouki-third-reference-v1', [674, 190, 549, 325]),
    ('ryouki-third-reference-v1', [1260, 187, 594, 325]),
    ('ryouki-fourth-reference-v1', [10, 208, 497, 224]),
    ('ryouki-fourth-reference-v1', [20, 590, 476, 230]),
    ('ryouki-fourth-reference-v1', [535, 207, 450, 224]),
    ('ryouki-fourth-reference-v1', [535, 588, 455, 232]),
    ('ryouki-fourth-reference-v1', [1030, 208, 498, 224]),
    ('ryouki-fourth-reference-v1', [1030, 587, 498, 235]),
    ('ryouki-mutated-early-reference-v1', [25, 224, 1043, 323]),
    ('ryouki-mutated-iv-reference-v1', [25, 224, 1043, 323]),
]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def metadata(path):
    im = Image.open(path)
    return {'file': path.name, 'width': im.width, 'height': im.height, 'sha256': sha(path)}

def bodies(path, expected):
    im = Image.open(path).convert('RGBA')
    pixels = np.asarray(im)
    # The generated transparent sprite bodies are disconnected above alpha80;
    # their soft fringes sometimes touch across nominal cells. Assign that
    # existing fringe to its nearest body once, rather than crop a neighbour.
    labels, _ = ndimage.label(pixels[:, :, 3] > 80)
    sizes = np.bincount(labels.ravel())
    ids = [index for index in range(1, len(sizes)) if sizes[index] > 15000]
    assert len(ids) == expected, (path, len(ids), expected)
    core = np.where(np.isin(labels, ids), labels, 0)
    nearest = ndimage.distance_transform_edt(core == 0, return_distances=False, return_indices=True)
    owners = core[tuple(nearest)]
    centers = {}
    for index in ids:
        y, x = np.nonzero(core == index)
        centers[index] = (float(y.mean()), float(x.mean()))
    # Row ordering is explicit; normal's last row has only three bodies.
    ordered = []
    if expected == 11:
        for low, high in [(0, 350), (350, 680), (680, 1024)]:
            ordered += sorted((i for i in ids if low <= centers[i][0] < high), key=lambda i: centers[i][1])
    else:
        ordered = sorted(ids, key=lambda i: centers[i][1])
    output = []
    for index in ordered:
        result = pixels.copy()
        result[owners != index, 3] = 0
        image = Image.fromarray(result)
        bbox = image.getchannel('A').point(lambda a: 255 if a > 8 else 0).getbbox()
        assert bbox
        output.append((image.crop(bbox), {'sourceComponent': int(index), 'sourceAlphaBoundsLTRB': list(bbox)}))
    return output

def build():
    manifest_path = ASSETS / 'visual-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    registry = {'version': 'ryouki-runtime-art/1', 'kind': 'provisional-static-extraction-not-final-age-or-direction-art', 'sources': [], 'edits': [], 'derived': []}
    for key, source in SOURCES.items():
        original = ROOT / source
        target = ASSETS / (key + '.png')
        shutil.copyfile(original, target)
        manifest['sheets'][key] = metadata(target)
        registry['sources'].append({'file': source, 'sha256': sha(original), 'runtimeCopy': str(target.relative_to(ROOT)), 'copySha256': sha(target)})
    extracted = []
    for filename, count in [('normal-eleven.png', 11), ('mutated-two.png', 2)]:
        path = REVIEW / 'edits' / filename
        registry['edits'].append({'file': str(path.relative_to(ROOT)), 'sha256': sha(path), 'expectedBodies': count})
        extracted += [(image, {**record, 'edit': str(path.relative_to(ROOT)), 'editSha256': sha(path)}) for image, record in bodies(path, count)]
    atlas = Image.new('RGBA', (1536, 1536))
    regions, bounds, records = [], [], []
    for index, (image, record) in enumerate(extracted):
        image.thumbnail((352, 352), Image.Resampling.LANCZOS)
        x, y = index % 4 * 384, index // 4 * 384
        dx, dy = (384 - image.width) // 2, (384 - image.height) // 2
        atlas.alpha_composite(image, (x + dx, y + dy))
        regions.append([x, y, 384, 384])
        bounds.append([dx, dy, image.width, image.height])
        source, region = REFERENCES[index]
        records.append({'panel': PANELS[index], **record, 'originalReference': {'sheet': source, 'region': region}, 'atlasRegion': regions[-1]})
    target = ASSETS / 'ryouki-atlas-v1.png'
    atlas.save(target)
    manifest['sheets']['ryouki-atlas-v1'] = metadata(target)
    manifest['ryouki'] = {'sheet': 'ryouki-atlas-v1', 'regions': regions, 'bodyBounds': bounds, 'panels': PANELS, 'references': [{'sheet': key, 'region': region} for key, region in REFERENCES], 'fit': 'contain', 'provisional': True, 'source': 'adopted-ryouki-background-removal/1'}
    registry['derived'].append({'file': str(target.relative_to(ROOT)), 'sha256': sha(target), 'shapeCount': 13, 'extraction': records})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ASSETS / 'visual-manifest.js').write_text('globalThis.EcoVisualManifest = ' + json.dumps(manifest, ensure_ascii=False) + ';\n')
    (REVIEW / 'registry.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'shapeCount': 13, 'sheets': len(manifest['sheets']), 'file': str(target.relative_to(ROOT))}))

if __name__ == '__main__':
    build()
