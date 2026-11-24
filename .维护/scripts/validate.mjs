import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import { demoBlocks } from './demo-blocks.mjs';

const read = path => readFileSync(path, 'utf8');
const { pages, demos, version } = JSON.parse(read('manifests/design-system.json'));
const { definitions, references } = JSON.parse(read('manifests/token-map.json'));
assert.equal(version, JSON.parse(read('node_modules/@arco-design/web-vue/package.json')).version);
const paths = new Set();
const ids = new Set();
const remaining = new Map(demos.map(demo => [demo.id, demo]));
assert.equal(remaining.size, demos.length, 'Unique demo IDs');
for (const page of pages) {
  assert(!paths.has(page.route), page.route);
  assert(page.title && !ids.has(page.id), page.id);
  paths.add(page.route);
  ids.add(page.id);
  const content = read(page.content);
  const blocks = demoBlocks(content);
  assert.deepEqual([...blocks.keys()], page.demos);
  if (page.component) assert(existsSync(page.entry) && page.source.includes('/tree/'), page.id);
  for (const id of page.demos) {
    const demo = remaining.get(id);
    assert(demo && demo.file === page.content, id);
    const source = blocks.get(id);
    assert(!/<style\b(?![^>]*\bsrc=)/.test(source), 'Inline demo style: ' + id);
    for (const [, path] of source.matchAll(/<style\b[^>]*\bsrc="\/([^"]+)"/g)) {
      assert(existsSync(path), 'Missing demo stylesheet: ' + path);
    }
    remaining.delete(id);
  }
}
assert.equal(remaining.size, 0);
for (const [token, entries] of Object.entries(definitions)) {
  for (const { file } of entries) assert(read(file).includes(token + ':'), token + ' in ' + file);
}
const supplied = new Set(Object.keys(definitions));
for (const entry of readdirSync('src/tokens')) {
  if (entry.endsWith('.css')) {
    postcss.parse(read('src/tokens/' + entry)).walkDecls(/^--/, decl => supplied.add(decl.prop));
  }
}
for (const [owner, refs] of Object.entries(references)) {
  for (const token of refs) assert(supplied.has(token), owner + ': ' + token);
}
for (const dir of ['basic-components', 'demo', 'src']) {
  for (const entry of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = (entry.parentPath + '/' + entry.name).replaceAll('\\', '/');
    if (path.endsWith('.css') && entry.name !== 'index.css' && !path.startsWith('src/tokens/')) {
      postcss.parse(read(path), { from: path }).walkDecls(decl => {
        assert(!decl.prop.startsWith('--'), 'Variable declaration in ' + path);
        valueParser(decl.value).walk(node => {
          if (node.type === 'function' && /^(?:rgb|rgba|hsl|hsla)$/i.test(node.value)) {
            assert.fail(path + ': use a palette variable instead of ' + decl.value);
          }
          if (node.type === 'word') {
            assert(!/^#[\da-f]{3,8}$/i.test(node.value), path + ': use a palette variable instead of ' + node.value);
          }
          if (node.type === 'function' && node.value === 'url') return false;
          if (node.type === 'function' && node.value === 'var') {
            const name = node.nodes[0]?.value;
            assert(supplied.has(name), path + ': ' + decl.value);
            assert(!/^--(?:[a-z]+-a\d+|neutral-(?:black|white)-\d+|(?:gray|red|orangered|orange|gold|yellow|lime|green|cyan|blue|arcoblue|purple|pinkpurple|magenta)-\d+)$/.test(name),
              path + ': component and page styles must reference a semantic color variable, got ' + name);
          }
        });
      });
    }
    if ((path.startsWith('src/components/') || path.startsWith('basic-components/')) && /\.(vue|[jt]sx?)$/.test(path)) {
      assert(!/<style\b|(?:\.cssText|\.innerHTML)\s*=\s*[\x60'"]\s*[^"'{}]*\{[^}]*:[^}]*\}/.test(read(path)), 'Embedded CSS in ' + path);
    }
  }
}
console.log('Validated ' + pages.length + ' routes, ' + demos.length + ' demos and ' + Object.keys(definitions).length + ' Arco tokens.');

