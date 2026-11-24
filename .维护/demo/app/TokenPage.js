import { tokens } from './token-data.js';
import lightColors from '../../src/tokens/primitive.css?raw';
import darkColors from '../../src/tokens/themes.css?raw';
import template from './TokenPage.html?raw';

const colors = [
  ['红', 'red'], ['橙红', 'orangered'], ['橙', 'orange'], ['金', 'gold'],
  ['黄', 'yellow'], ['青柠', 'lime'], ['绿', 'green'], ['青', 'cyan'],
  ['蓝', 'blue'], ['极致蓝', 'arcoblue'], ['紫', 'purple'],
  ['紫红', 'pinkpurple'], ['品红', 'magenta'],
];
const colorOpacitySteps = [4, 8, 10, 16, 24, 40, 60, 80, 90, 100];
const colorRows = colors.map(([, name]) => ({
  name: name + '-solid', light: name + '-a100', dark: name + '-a100',
}));
function readTintReferences(css) {
  return new Map(Array.from(css.matchAll(/--(color-(?:primary|success|warning|danger)-light-\d+):\s*var\(--([\w-]+)\)/g),
    ([, name, reference]) => [name, reference]));
}
const darkTints = readTintReferences(darkColors);
for (const [name, light] of readTintReferences(lightColors)) {
  colorRows.push({ name, light, dark: darkTints.get(name) ?? light });
}
const opacitySteps = [0, 2, 4, 6, 8, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 94, 96, 98, 100];
const neutralRows = [
  ...opacitySteps.map(step => ({ name: 'neutral-level-' + step, step, light: '黑色', dark: '白色', usage: '随主题切换' })),
  { name: 'neutral-inverse-100', step: 100, light: '白色', dark: '黑色', usage: '反色按钮文字' },
  { name: 'color-tone-neutral-white-100', step: 100, light: '白色', dark: '白色', usage: '深色图片上的文字与图标' },
  { name: 'color-tone-neutral-black-0', step: 0, light: '黑色', dark: '黑色', usage: '透明底色或占位' },
  { name: 'color-tone-neutral-black-100', step: 100, light: '黑色', dark: '黑色', usage: '固定浅色背景上的文字与图标' },
  { name: 'color-tone-neutral-black-50', step: 50, light: '黑色', dark: '黑色', usage: '图片压暗' },
  { name: 'color-tone-neutral-black-70', step: 70, light: '黑色', dark: '黑色', usage: '弹窗及抽屉遮罩' },
];

export default {
  template,
  setup() {
    const hiddenGroups = new Set([
      '边框颜色', '填充颜色', '文字颜色', '链接色', '背景颜色',
      '错误色', '警示色', '成功色', '主色',
    ]);
    return { colors, colorOpacitySteps, colorRows, tokens: tokens.filter(group => !hiddenGroups.has(group.name)), opacitySteps, neutralRows };
  },
};

