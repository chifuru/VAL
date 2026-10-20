"""Copy adopted Q reference paintings unchanged; no image editing or new art."""
from pathlib import Path
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'src/assets'
SOURCES = {
    'hyperparasite-internal-reference-v1': 'design/appearance-baseline-v1/05-hyperparasite-source-i-iii-only.png',
    'hyperparasite-adult-reference-v1': 'design/appearance-baseline-v1/06-hyperparasite-adult.png',
}
REFERENCES = [
    {'sheet': 'hyperparasite-internal-reference-v1', 'region': [10, 80, 344, 926]},
    {'sheet': 'hyperparasite-internal-reference-v1', 'region': [370, 80, 331, 926]},
    {'sheet': 'hyperparasite-internal-reference-v1', 'region': [716, 80, 374, 926]},
    {'sheet': 'hyperparasite-adult-reference-v1', 'region': [0, 0, 1536, 1024]},
]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def build():
    path = ASSETS / 'visual-manifest.json'
    manifest = json.loads(path.read_text())
    sources = []
    for key, source in SOURCES.items():
        original, target = ROOT / source, ASSETS / (key + '.png')
        shutil.copyfile(original, target)
        image = Image.open(target)
        manifest['sheets'][key] = {'file': target.name, 'width': image.width, 'height': image.height, 'sha256': sha(target)}
        sources.append({'file': source, 'sha256': sha(original), 'runtimeCopy': str(target.relative_to(ROOT)), 'copySha256': sha(target)})
    manifest['hyperparasite'] = {'references': REFERENCES, 'panels': ['I', 'II', 'III', 'IV'],
        'source': 'adopted-hyper-reference/1', 'provisionalBody': 'existing-life-f-third-phase-for-IV',
        'excluded': 'internal-reference panel IV', 'finalTransparentArt': 'I10'}
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    (ASSETS / 'visual-manifest.js').write_text('globalThis.EcoVisualManifest = ' + json.dumps(manifest, ensure_ascii=False) + ';\n')
    ledger = {'version': 'hyper-reference-art/1', 'kind': 'unchanged-adopted-portrait-copies-not-runtime-transparent-atlas',
        'sources': sources, 'references': REFERENCES, 'excluded': ['05 old IV'],
        'runtimeBody': 'Existing life-f I/II/III body; new IV temporarily uses its III body, own phase/age/state are preserved. Final transparent and directional art is I10.'}
    (ASSETS / 'hyperparasite-reference-registry-v1.json').write_text(json.dumps(ledger, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'copies': len(sources), 'portraits': len(REFERENCES), 'imageEditing': False}))

if __name__ == '__main__':
    build()
