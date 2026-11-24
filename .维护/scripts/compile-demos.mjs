import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { demoBlocks } from './demo-blocks.mjs';

export function compileDemos(root) {
  const { pages } = JSON.parse(readFileSync(new URL('manifests/design-system.json', root), 'utf8'));
  for (const page of pages) {
    if (!page.demos.length) continue;
    const document = readFileSync(new URL(page.content, root), 'utf8');
    const blocks = demoBlocks(document);
    for (const id of page.demos) {
      const code = blocks.get(id);
      if (!code) throw new Error(page.content + ': missing demo ' + id);
      const target = new URL('generated/demos/' + id + '.vue', root);
      if (existsSync(target) && readFileSync(target, 'utf8') === code) continue;
      mkdirSync(new URL('.', target), { recursive: true });
      writeFileSync(target, code);
    }
  }
}



