from concurrent.futures import ThreadPoolExecutor
from hashlib import sha256
import json
from pathlib import Path
import re
from urllib.error import URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
URL = re.compile(r'''https://[^\s)"'<>\x60?]+?\.(?:png|webp|jpe?g|gif|svg|image)(?=[\s)"'<>\x60?]|$)''', re.I)
MEDIA = {'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
         'image/gif': '.gif', 'image/svg+xml': '.svg'}
docs = list((ROOT / 'basic').glob('*.html')) + list((ROOT / 'page').rglob('*.html'))
images = ROOT / 'public/images'
images.mkdir(parents=True, exist_ok=True)
manifest = ROOT / 'manifests/assets.json'
cached = json.loads(manifest.read_text(encoding='utf-8')) if manifest.exists() else {}
sources = sorted(set(cached) | {url for file in docs for url in URL.findall(file.read_text(encoding='utf-8'))})

def fetch(url):
    current = cached.get(url)
    if current and (ROOT / ('public' + current)).is_file():
        return url, current
    try:
        with urlopen(Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=15) as response:
            extension = MEDIA.get(response.headers.get_content_type())
            if not extension:
                return url, None
            data = response.read(8_000_001)
        if len(data) > 8_000_000:
            return url, None
    except (URLError, TimeoutError):
        return url, None
    name = sha256(url.encode()).hexdigest()[:16] + extension
    (images / name).write_bytes(data)
    return url, '/images/' + name

with ThreadPoolExecutor(max_workers=12) as pool:
    lookup = dict(pool.map(fetch, sources))
for doc in docs:
    source = doc.read_text(encoding='utf-8')
    localized = URL.sub(lambda match: lookup.get(match[0]) or match[0], source)
    if source != localized:
        doc.write_text(localized, encoding='utf-8')
manifest.write_text(json.dumps(lookup, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(f'{sum(bool(value) for value in lookup.values())}/{len(lookup)} images stored locally')

