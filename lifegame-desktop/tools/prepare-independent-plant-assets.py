"""Pack approved transparent edits; never generate anatomy or remove backgrounds at runtime.

Requires Pillow, NumPy and SciPy. Inputs in design/appearance-runtime-v1/edits are retained image_gen
background-removal edits. Original adopted reference PNGs are never overwritten.
"""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets'
REVIEW = ROOT / 'design/appearance-runtime-v1'
PANELS = ['I', 'II', 'III-1', 'III-2', 'III-3', 'IV-1a', 'IV-1b', 'IV-2a', 'IV-2b', 'IV-3a', 'IV-3b']
RAW = {
    'plant-land-reference-v1': 'design/creature-design-review-v3/03-land-plants.png',
    'plant-forest-reference-v1': 'design/appearance-baseline-v1/07-forestcrown-branches.png',
    'plant-star-reference-v1': 'design/appearance-baseline-v1/08-starcrown-branches.png',
    'plant-freshwater-reference-v1': 'design/appearance-baseline-v1/01-freshwater-phases.png',
    'plant-freshwater-branches-reference-v1': 'design/appearance-baseline-v1/02-freshwater-branches.png',
}
# Rectangles isolate each already-transparent edit. They are not regular source cells:
# the editor leaves unequal margins and a few crowns extend across the nominal grid.
CROPS = {
    'forestcrown': [(10, 12, 370, 343), (382, 3, 767, 345), (770, 34, 1148, 344), (1144, 16, 1535, 344), (4, 373, 378, 670), (380, 367, 776, 673), (774, 370, 1147, 670), (1147, 367, 1536, 669), (8, 677, 380, 981), (379, 696, 788, 979), (785, 675, 1148, 983)],
    'starcrown': [(20, 17, 311, 335), (357, 7, 713, 337), (720, 38, 1157, 335), (1157, 29, 1530, 336), (0, 337, 393, 654), None, (814, 334, 1132, 657), (1132, 352, 1536, 657), (6, 655, 417, 982), (416, 655, 771, 981), (768, 661, 1201, 983)],
    'freshwaterlight': [(45, 3, 347, 380), (397, 18, 719, 366), (763, 66, 1165, 338), (1153, 379, 1499, 679), (15, 366, 357, 670), (360, 368, 785, 675), (761, 398, 1162, 655), None, (15, 707, 418, 970), (396, 698, 805, 981), (781, 669, 1214, 1000)],
}
FIXES = {('starcrown', 5): 'starcrown-iv1a-edited.png', ('freshwaterlight', 7): 'freshwaterlight-iv2a-edited.png'}
REFERENCES = {
    'forestcrown': [('plant-land-reference-v1', [19, 117, 304, 319]), ('plant-land-reference-v1', [337, 117, 346, 319])],
    'starcrown': [('plant-land-reference-v1', [19, 508, 304, 319]), ('plant-land-reference-v1', [337, 508, 346, 319])],
    'freshwaterlight': [('plant-freshwater-reference-v1', [10, 295, 284, 368]), ('plant-freshwater-reference-v1', [316, 256, 283, 365])],
}
GRIDS = {
    'forestcrown': ('plant-forest-reference-v1', [8, 486, 1068], [461, 563, 459], [8, 346, 682], [326, 324, 326]),
    'starcrown': ('plant-star-reference-v1', [9, 497, 1049], [476, 540, 477], [10, 341, 677], [314, 318, 330]),
    'freshwaterlight': ('plant-freshwater-branches-reference-v1', [6, 477, 1036], [456, 543, 494], [5, 337, 666], [318, 315, 350]),
}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def sheet(path):
    im = Image.open(path)
    return {'file': path.name, 'width': im.width, 'height': im.height, 'sha256': sha(path)}

def build():
    manifest_path = OUT / 'visual-manifest.json'
    manifest = json.loads(manifest_path.read_text())
    registry = {'version': 'independent-plant-runtime-art/1', 'kind': 'provisional-static-extraction-not-final-all-age-or-direction-art', 'panels': PANELS, 'sources': [], 'derived': []}
    for key, source in RAW.items():
        original = ROOT / source
        target = OUT / (key + '.png')
        shutil.copyfile(original, target)
        manifest['sheets'][key] = sheet(target)
        registry['sources'].append({'file': source, 'sha256': sha(original), 'runtimeCopy': str(target.relative_to(ROOT)), 'copySha256': sha(target)})
    manifest['producers'] = {}
    for species, crops in CROPS.items():
        edit = REVIEW / 'edits' / (species + '-edited.png')
        edited = Image.open(edit).convert('RGBA')
        atlas = Image.new('RGBA', (1536, 1152))
        regions, bounds, extraction = [], [], []
        for index, crop in enumerate(crops):
            fix = FIXES.get((species, index))
            source = REVIEW / 'edits' / fix if fix else edit
            im = Image.open(source).convert('RGBA') if fix else edited
            if crop:
                im = im.crop(crop)
            if species == 'freshwaterlight' and not fix:
                # The transparent editor's row margins overlap a few neighbouring
                # rings. All adopted freshwater membranes are connected to their
                # body; remove only disconnected neighbouring fragments once here.
                pixels = np.asarray(im).copy()
                labels, count = ndimage.label(pixels[:, :, 3] > 30)
                sizes = np.bincount(labels.ravel())
                chosen = 1 + int(np.argmax(sizes[1:]))
                retained = ndimage.binary_dilation(labels == chosen, iterations=3)
                pixels[~retained, 3] = 0
                im = Image.fromarray(pixels)
            bbox = im.getchannel('A').point(lambda a: 255 if a > 20 else 0).getbbox()
            assert bbox, (species, index)
            # Only crop/contain/resample an existing transparent edit. No anatomy or
            # per-frame alpha operation; every final cell has its own static margin.
            im = im.crop(bbox)
            im.thumbnail((352, 352), Image.Resampling.LANCZOS)
            x, y = (index % 4) * 384, (index // 4) * 384
            dx, dy = (384 - im.width) // 2, (384 - im.height) // 2
            atlas.alpha_composite(im, (x + dx, y + dy))
            regions.append([x, y, 384, 384])
            bounds.append([dx, dy, im.width, im.height])
            extraction.append({'panel': PANELS[index], 'edit': str(source.relative_to(ROOT)), 'editSha256': sha(source), 'cropLTRB': crop, 'alphaBoundsLTRB': list(bbox)})
        target = OUT / (species + '-atlas-v1.png')
        atlas.save(target)
        key = species + '-atlas-v1'
        manifest['sheets'][key] = sheet(target)
        rawkey, xs, widths, ys, heights = GRIDS[species]
        raw = [(rawkey, [xs[c], ys[r], widths[c], heights[r]]) for r, c in [(0, 0), (1, 0), (2, 0), (0, 1), (0, 2), (1, 1), (1, 2), (2, 1), (2, 2)]]
        references = REFERENCES[species] + raw
        manifest['producers'][species] = {'sheet': key, 'regions': regions, 'bodyBounds': bounds, 'panels': PANELS, 'fit': 'contain', 'references': [{'sheet': k, 'region': f} for k, f in references], 'source': 'adopted-appearance-background-removal/1', 'provisional': True}
        registry['derived'].append({'species': species, 'file': str(target.relative_to(ROOT)), 'sha256': sha(target), 'shapeCount': 11, 'extraction': extraction, 'originalPanels': [{'panel': label, 'sheet': k, 'region': f} for label, (k, f) in zip(PANELS, references)]})
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (OUT / 'visual-manifest.js').write_text('globalThis.EcoVisualManifest = ' + json.dumps(manifest, ensure_ascii=False) + ';\n')
    (REVIEW / 'registry.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'species': list(CROPS), 'shapes': 33, 'registry': str((REVIEW / 'registry.json').relative_to(ROOT))}))

if __name__ == '__main__':
    build()
