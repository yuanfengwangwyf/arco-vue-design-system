import manifest from '../../manifests/design-system.json';

export const version = manifest.version;
export const pages = manifest.pages;
export const groups = new Map();
const hiddenFromMenu = new Set(['start', 'i18n', 'theme']);
for (const page of pages) {
  if (hiddenFromMenu.has(page.id) || page.id.startsWith('pro/')) continue;
  const label = page.group === '开发指南' ? '文档' : page.group;
  if (!groups.has(label)) groups.set(label, []);
  groups.get(label).push(page);
}

