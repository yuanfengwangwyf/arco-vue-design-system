import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import MarkdownIt from 'markdown-it';
import less from 'less';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import { parse } from 'yaml';
import { transformSync } from 'esbuild';
import { renderMarkdown } from './render-markdown.mjs';

process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');
}

const version = '2.59.0';
const commit = 'd9f1b3747988f1d510c31380e6b2bc1a5f6bdca3';
const official = '.upstream/packages/arco-vue-docs';
const library = '.upstream/packages/web-vue';
const npm = 'node_modules/@arco-design/web-vue/es';
const md = new MarkdownIt({ html: true });
const blocks = (source) => md.parse(source, {}).filter((token) => token.type === 'fence');
function frontmatter(source) {
  source = source.trimStart();
  const first = blocks(source)[0];
  if (first?.info !== 'yaml' || first.map[0] !== 0) return [{}, source];
  return [parse(first.content), source.split('\n').slice(first.map[1]).join('\n')];
}

const tokenFiles = new Map();
const definitions = Object.create(null);
const references = Object.create(null);
const imports = [];
const scopes = ['primitive', 'semantic', 'typography', 'spacing', 'radius', 'shadow', 'motion', 'themes'];
function kind(property, selector) {
  if (/dark/i.test(selector)) return 'themes';
  if (/^--[\w-]+-\d+$/.test(property)) return 'primitive';
  if (/font|line-height/.test(property)) return 'typography';
  if (/spacing|padding|margin/.test(property)) return 'spacing';
  if (/radius/.test(property)) return 'radius';
  if (/shadow/.test(property)) return 'shadow';
  if (/duration|transition|motion|easing/.test(property)) return 'motion';
  return 'semantic';
}
function variables(value, target) {
  valueParser(value).walk(node => {
    if (node.type === 'function' && node.value === 'var') target.add(node.nodes[0]?.value);
  });
}
function splitStyle(input, output, owner) {
  const root = postcss.parse(read(input), { from: input });
  const used = new Set();
  root.walkDecls(decl => {
    variables(decl.value, used);
    if (!decl.prop.startsWith('--')) return;
    const group = kind(decl.prop, decl.parent.selector ?? '');
    const file = 'src/tokens/' + group + '.css';
    if (!tokenFiles.has(file)) tokenFiles.set(file, postcss.root());
    let branch = decl.clone();
    for (let parent = decl.parent; parent.type !== 'root'; parent = parent.parent) {
      branch = parent.clone({ nodes: [branch] });
    }
    tokenFiles.get(file).append(branch);
    definitions[decl.prop] ??= [];
    const record = { file, selector: decl.parent.selector ?? decl.parent.name };
    if (!definitions[decl.prop].some(entry => entry.file === file && entry.selector === record.selector)) {
      definitions[decl.prop].push(record);
    }
    decl.remove();
  });
  root.walkRules(rule => { if (!rule.nodes.length) rule.remove(); });
  root.walkDecls(/^--/, decl => { throw new Error('Unexpected token declaration: ' + decl.prop); });
  write(output, root.toString() + '\n');
  references[owner] = [...used].filter(Boolean).sort();
  imports.push(output);
}

splitStyle(npm + '/style/index.css', 'src/styles/arco-base.css', 'global');
const published = readdirSync(npm, { withFileTypes: true }).filter(item => item.isDirectory());
for (const { name } of published) {
  const input = npm + '/' + name + '/style/index.css';
  if (existsSync(input)) splitStyle(input, 'src/components/basic/' + name + '/' + name + '.css', name);
}
for (const scope of scopes) {
  const file = 'src/tokens/' + scope + '.css';
  write(file, tokenFiles.get(file)?.toString() + '\n' || '');
  if (!tokenFiles.has(file)) write(file, '/* This release has no standalone variables in this category. */\n');
}
write('src/tokens/index.css', scopes.map(key => '@import "./' + key + '.css";').join('\n') + '\n');
  write('src/styles/arco.js', ['src/tokens/index.css', ...imports].map(file => 'import "' + '../' + file.slice(4) + '";').join('\n') + '\n');

const router = read(official + '/router.ts');
const sourceDirs = new Map(Array.from(router.matchAll(/const (\w+)\s*=\s*\(\)\s*=>\s*import\('@web-vue\/components\/([^/]+)\/README.zh-CN.md'\)/g), match => [match[1], match[2]]));
const routeName = (name) => name.replace(/[A-Z]+/g, (letters, offset) => (offset ? '-' : '') + letters.toLowerCase());
const labels = { common: '通用', layout: '布局', dataDisplay: '数据展示', dataEntry: '数据录入', feedback: '反馈', navigation: '导航', other: '其他' };
const pages = [];
const documents = new Map();
const demos = [];
const pendingStyles = [];
const imageMap = existsSync('manifests/assets.json') ? JSON.parse(read('manifests/assets.json')) : {};
function localImages(content) {
  for (const [source, path] of Object.entries(imageMap)) {
    if (path) content = content.replaceAll(source, path);
  }
  return content;
}

function addDemo(path, id, document) {
  const [meta, body] = frontmatter(read(path));
  const sfc = blocks(body).find(token => token.info === 'vue');
  if (!sfc) throw new Error('Missing Vue example in ' + path);
  const title = meta.title?.['zh-CN'] ?? id.split('/').at(-1);
  let styleIndex = 0;
  const code = sfc.content.replaceAll("'Figma', 'Sketch', 'Adobe XD'", "'Penpot', 'Sketch', 'Adobe XD'").replace(
    /<script([^>]*?)\s+lang=["'](tsx?)["']([^>]*)>([\s\S]*?)<\/script>/g,
    (_, before, loader, after, script) => '<script' + before + after + '>\n' +
      (loader === 'tsx' ? 'import { h as renderNode } from "vue";\n' : '') +
      transformSync(script, { loader, jsxFactory: 'renderNode', tsconfigRaw: { compilerOptions: { verbatimModuleSyntax: true } } }).code +
      '</script>'
  ).replace(/<style([^>]*)>([\s\S]*?)<\/style>/g, (_, attrs, css) => {
    const style = id.split('/').at(-1) + (styleIndex ? '-' + styleIndex : '') + '.css';
    styleIndex++;
    const output = 'demo/styles/examples/' + id.split('/')[0] + '/' + style;
    if (/\blang="less"/.test(attrs)) {
      pendingStyles.push(less.render(css).then(result => write(output, result.css)));
    } else {
      write(output, css.trim() + '\n');
    }
    return '<style' + attrs.replace(/\s+lang="less"/, '') + ' src="/' + output + '"></style>';
  });
  const description = (body.split(/^## zh-CN\s*$/m)[1] ?? '').split(/^---\s*$/m)[0].trim();
  demos.push({ id, file: document, title, description, code });
  return '\n<!-- demo:' + id + ' -->\n';
}

function addPage({ id, title, group, route, path, component }) {
  let description = '';
  let body = '';
  const demoIds = [];
  const content = component ? 'basic/' + id.split('/').at(-1) + '.html' : 'page/' + id + '.html';
  if (path) {
    const [meta, source] = frontmatter(read(path));
    title ??= meta.title;
    description = meta.description ?? '';
    body = source.replace(/^@import +(\S+) *$/gm, (_, relative) => {
      const example = join(dirname(path), relative.replaceAll("\\_", "_"));
      const demo = (component ?? id) + '/' + relative.split('/').at(-1).replace(/\.md$/, '');
      demoIds.push(demo);
      return addDemo(example, demo, content);
    });
  }
  documents.set(content, body);
  const entry = component ? 'basic-components/' + component + '.js' : undefined;
  if (!title) throw new Error('Missing title for ' + id);
  const source = component ? 'https://github.com/arco-design/arco-design-vue/tree/' + commit + '/packages/web-vue/' +
    (component === 'icon' ? 'icon' : 'components/' + component) : undefined;
  pages.push({ id, title, group, order: pages.length, route, content, description, demos: demoIds, component, entry, source });
}

const docTitles = { start: '快速上手', dark: '暗黑模式', theme: '定制主题', token: '设计变量', i18n: '国际化', faq: '常见问题', changelog: '更新日志' };
for (const [name, title] of Object.entries(docTitles)) {
  const path = name === 'token' ? undefined : name === 'changelog' ? library + '/CHANGELOG.zh-CN.md' : official + '/docs/' + name + '.zh-CN.md';
  addPage({ id: name, title, group: '开发指南', route: '/vue/docs/' + name, path });
}
addPage({ id: 'overview', title: '组件总览', group: '通用', route: '/vue/component/overview' });
const componentSection = router.split('const components = [')[1].split('function toKebabCase')[0];
const exports = [];
for (const [, group, list] of componentSection.matchAll(/name: '(\w+)',\s*list: \[([\s\S]*?)\n {4}\]/g)) {
  for (const [, name, variable] of list.matchAll(/name: '(\w+)',\s*component: (\w+),/g)) {
    const component = sourceDirs.get(variable) ?? (name === 'icon' ? 'icon' : undefined);
    if (!component) throw new Error('Unrecognized component: ' + name);
    const module = '@arco-design/web-vue/es/' + component;
    const barrel = 'basic-components/' + component + '.js';
    const css = '../src/components/basic/' + component + '/' + component + '.css';
    const reexport = component === 'icon'
      ? 'export * from "' + module + '";\n'
      : 'export { default } from "' + module + '";\nexport * from "' + module + '";\n';
    write(barrel, (existsSync(join(dirname(barrel), css)) ? 'import "' + css + '";\n' : '') + reexport);
    exports.push(component === 'icon' ? 'export * from "../basic-components/icon";' : 'export { default as ' + variable + ' } from "../basic-components/' + component + '";');
    addPage({ id: 'component/' + routeName(name), title: name === 'icon' ? '图标 Icon' : undefined, group: labels[group], route: '/vue/component/' + routeName(name), component, path: name === 'icon' ? undefined : library + '/components/' + component + '/README.zh-CN.md' });
  }
}
for (const [, name] of router.split('const proDocs = [')[1].split('const components')[0].matchAll(/name: '(\w+)'/g)) {
  const slug = routeName(name);
  addPage({ id: 'pro/' + slug, group: 'Arco Pro 指南', route: '/vue/docs/pro/' + slug, path: official + '/docs/pro/' + slug + '.zh-CN.md' });
}
const byId = new Map(demos.map(demo => [demo.id, demo]));
const pagePaths = new Set(pages.map(page => page.route));
for (const page of pages) {
  const used = new Set();
  const html = documents.get(page.content).split(/<!-- demo:([\w/-]+) -->/g).map((content, index) => {
    if (!(index % 2)) return renderMarkdown(content, page.route, pagePaths, used).html;
    const demo = byId.get(content);
    const description = renderMarkdown(demo.description, page.route, pagePaths, used).html;
    return '<!-- demo:' + demo.id + ' -->\n<h3>' + md.utils.escapeHtml(demo.title) + '</h3>\n' +
      description + '<template data-demo-source>\n' + demo.code + '</template>\n<!-- /demo -->\n';
  }).join('\n');
  write(page.content, localImages(html));
}
write('src/index.js', 'import "./styles/arco";\n' + exports.join('\n') + '\n');
write('manifests/design-system.json', { version, commit, pages, demos: demos.map(({ id, file }) => ({ id, file })) });
write('manifests/token-map.json', { definitions, references });
write('LICENSE.arco', read('.upstream/LICENSE'));
await Promise.all(pendingStyles);
console.log(pages.length + ' pages, ' + demos.length + ' demos, ' + Object.keys(definitions).length + ' tokens');


