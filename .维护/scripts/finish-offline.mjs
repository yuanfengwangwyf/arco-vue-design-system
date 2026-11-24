import { readFileSync, writeFileSync } from 'node:fs';
import postcss from 'postcss';

const output = new URL('../offline/', import.meta.url);
const write = (name, content) => writeFileSync(new URL(name, output), content);
const read = (name) => readFileSync(new URL(name, output), 'utf8');
const css = postcss.parse(read('styles.css').replace(/url\((['"]?)(?:\.{1,2}\/|\/)?fonts\//g, 'url($1./fonts/'));
const tokens = postcss.root();
css.walkDecls(/^--/, declaration => {
  let branch = declaration.clone();
  for (let parent = declaration.parent; parent.type !== 'root'; parent = parent.parent) {
    branch = parent.clone({ nodes: [branch] });
  }
  tokens.append(branch);
  declaration.remove();
});
css.walkRules(rule => {
  if (!rule.nodes.length) rule.remove();
});
write('styles.css', css.toString());
write('design-variable.css', tokens.toString());
const bundle = read('arco-docs.js').replace(/(?<![a-zA-Z0-9.:/])\/images\//g, './images/');
write('arco-docs.js', bundle);
write('index.html', '<!doctype html>\n' +
  '<html lang="zh-CN">\n<head>\n' +
  '  <meta charset="UTF-8">\n' +
  '  <meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  '  <title>Arco Vue · 离线文档</title>\n' +
  '  <link rel="stylesheet" href="./design-variable.css">\n' +
  '  <link rel="stylesheet" href="./styles.css">\n' +
  '  <script defer src="./arco-docs.js"></script>\n' +
  '</head>\n<body><div id="app"></div></body>\n</html>\n');

