import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function paletteAssets(root) {
  const palette = readFileSync(new URL('src/tokens/primitive.css', root), 'utf8');
  const hues = [...palette.matchAll(/--([a-z]+)-6:\s*(\d+),(\d+),(\d+);/g)]
    .filter(([_, name]) => name !== 'gray')
    .map(([_, name, ...values]) => [name, hue(values.map(Number))]);
  const virtualId = '\0arco-overview-art';
  const directory = new URL('public/images/组件预览/', root);

  function hue(rgb) {
    const low = Math.min(...rgb);
    const range = Math.max(...rgb) - low || 1;
    return rgb.map(value => (value - low) / range);
  }

  function token(hex) {
    const full = hex.length === 3 ? [...hex].map(char => char.repeat(2)).join('') : hex;
    const rgb = full.slice(0, 6).match(/../g).map(value => parseInt(value, 16));
    const [low, high] = [Math.min(...rgb), Math.max(...rgb)];
    if (high - low < 22) {
      if (low > 247) return 'neutral-white-100';
      if (high < 15) return 'neutral-black-100';
      return 'neutral-level-' + (low > 215 ? 8 : low > 145 ? 25 : low > 75 ? 60 : 90);
    }
    const direction = hue(rgb);
    const distance = (candidate) => candidate.reduce((sum, val, i) => sum + (val - direction[i]) ** 2, 0);
    const name = hues.reduce((best, next) => distance(next[1]) < distance(best[1]) ? next : best)[0];
    const opacity = full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1;
    const strength = opacity * (low > 205 ? .10 : low > 165 ? .24 : low > 100 ? .60 : 1);
    const levels = [4, 8, 10, 16, 24, 40, 60, 80, 90, 100];
    const level = levels.reduce((best, next) => Math.abs(next - strength * 100) < Math.abs(best - strength * 100) ? next : best);
    return name + '-a' + level;
  }

  const semantic = name => name.startsWith('neutral-level-') ? name : 'color-tone-' + name;
  const color = (_, hex) => 'var(--' + semantic(token(hex)) + ')';
  const hexColor = /#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b/gi;

  return {
    name: 'arco-palette-assets',
    resolveId(id) {
      if (id === 'virtual:arco-overview-art') return virtualId;
    },
    load(id) {
      if (id !== virtualId) return;
      const images = {};
      for (const file of readdirSync(directory).filter(name => name.endsWith('.svg'))) {
        const path = new URL(file, directory);
        this.addWatchFile(fileURLToPath(path));
        const name = file.slice(0, -4);
        const markup = readFileSync(path, 'utf8');
        if (/<(?:script|foreignObject)\b|\son\w+=/i.test(markup)) throw new Error('Unexpected active SVG: ' + file);
        images[name] = markup
          .replace(/\b(fill|stroke|stop-color|flood-color)="(#[0-9a-f]{3,8}|white|black|transparent)"/gi, (_, attr, value) => {
            const hex = { white: '#fff', black: '#000' }[value.toLowerCase()] ?? value;
            return attr + '="' + (hex === 'transparent' ? 'var(--color-tone-neutral-black-0)' : hex.replace(hexColor, color)) + '"';
          })
          .replace(/\bid="([^"]+)"/g, (_, value) => 'id="' + name + '-' + value + '"')
          .replace(/url\(#([^)]+)\)/g, (_, value) => 'url(#' + name + '-' + value + ')')
          .replace(/((?:xlink:)?href=")#([^"]+)"/g, (_, prefix, value) => prefix + '#' + name + '-' + value + '"');
      }
      return 'export default ' + JSON.stringify(images) + ';';
    },
    transform(source, id) {
      const path = id.replaceAll('\\', '/');
      if (path.includes('/@arco-design/web-vue/es/icon/')) {
        return source.replace(/((?:fill|stroke):\s*")#[\da-f]{3,8}(?=")/gi, match => match.replace(hexColor, color));
      }
      if (path.endsWith('/@arco-design/web-vue/es/color-picker/colors.js')) {
        const names = Array.from(source.matchAll(/"#([0-9a-f]{6})"/gi), ([_, value]) => '--' + semantic(token(value)));
        return 'const style = getComputedStyle(document.body); const colors = ' + JSON.stringify(names) +
          '.map(name => style.getPropertyValue(name).trim()); export { colors };';
      }
    },
  };
}

