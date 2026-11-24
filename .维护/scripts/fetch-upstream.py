from pathlib import Path
from shutil import copyfile
import subprocess
import re

SHA = 'd9f1b3747988f1d510c31380e6b2bc1a5f6bdca3'
REPO = 'arco-design/arco-design-vue'
PROJECT = Path(__file__).resolve().parent.parent
ROOT = PROJECT / '.upstream'
CHECKOUT = ROOT / 'checkout'
ROOT.mkdir(exist_ok=True)

if not CHECKOUT.exists():
    subprocess.run(['git', 'clone', '--depth', '1', '--branch', '2.59.0',
                    f'https://github.com/{REPO}.git', str(CHECKOUT)], check=True)
head = subprocess.check_output(['git', '-C', str(CHECKOUT), 'rev-parse', 'HEAD'], text=True).strip()
if head != SHA:
    raise ValueError(f'Unexpected upstream commit {head}')
paths = subprocess.check_output(['git', '-C', str(CHECKOUT), 'ls-tree', '-r',
                                 '--name-only', 'HEAD'], text=True).splitlines()
selected = [
    path for path in paths if path in (
        'LICENSE', 'packages/web-vue/CHANGELOG.zh-CN.md', 'packages/arco-vue-docs/router.ts'
    ) or re.fullmatch(r'packages/arco-vue-docs/docs/.*\.zh-CN\.md', path)
    or re.fullmatch(r'packages/web-vue/components/[^/]+/(README\.zh-CN\.md|__demo__/[^/]+\.md)', path)
]
for path in selected:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    copyfile(CHECKOUT / path, target)
print(f'{len(selected)} upstream files available')

