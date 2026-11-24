import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';

const maintenance = new URL('../', import.meta.url);
const project = new URL('../', maintenance);
const read = (file) => readFileSync(new URL(file, maintenance), 'utf8');
const write = (file, content) => writeFileSync(new URL(file, project), content);

function copy(source, destination) {
  if (!statSync(source).isDirectory()) {
    mkdirSync(new URL('.', destination), { recursive: true });
    writeFileSync(destination, readFileSync(source));
    return;
  }
  for (const name of readdirSync(source)) {
    copy(new URL(name, new URL(source.href + '/')), new URL(name, new URL(destination.href + '/')));
  }
}

switch (process.argv[2]) {
  case '同步': {
    const mapping = JSON.parse(read('文件映射.json'));
    for (const [source, target] of Object.entries(mapping)) {
      copy(new URL(source, project), new URL(target, maintenance));
    }
    break;
  }
  case '输出':
    write('基础组件/站点运行.js', read('offline/arco-docs.js').replaceAll('./images/', './图片/'));
    write('变量css/站点变量.css', read('offline/design-variable.css'));
    write('样式css/站点样式.css', read('offline/styles.css').replaceAll('./fonts/', '../字体/'));
    write('index.html', read('offline/index.html')
      .replace('./arco-docs.js', './基础组件/站点运行.js')
      .replace('./design-variable.css', './变量css/站点变量.css')
      .replace('./styles.css', './样式css/站点样式.css'));
    break;
  default:
    throw new Error('请输入同步或输出');
}

