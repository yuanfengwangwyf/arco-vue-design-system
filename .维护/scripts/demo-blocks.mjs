export const demoPattern = /<!-- demo:([\w/-]+) -->([\s\S]*?)<!-- \/demo -->/g;

export function demoBlocks(document) {
  const result = new Map();
  for (const [, id, content] of document.matchAll(demoPattern)) {
    if (result.has(id)) throw new Error('Duplicate demo: ' + id);
    const source = content.match(/<template data-demo-source>\s*([\s\S]*)<\/template>\s*$/);
    if (!source) throw new Error('Missing Vue source: ' + id);
    result.set(id, source[1]);
  }
  return result;
}

