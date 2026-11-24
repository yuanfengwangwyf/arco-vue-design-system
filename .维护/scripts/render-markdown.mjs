import MarkdownIt from 'markdown-it';


const md = new MarkdownIt({ html: true });


function localLink(href, currentPath, pagePaths) {
  const url = new URL(href, 'https://arco.design' + currentPath);
  if (href.startsWith('#')) return href;
  const normalized = url.pathname.toLowerCase().replace('/vue/en-us/', '/vue/');
  if (url.origin === 'https://arco.design' && pagePaths.has(normalized)) return normalized + url.hash;
  if (/^https?:|^mailto:/.test(href)) return href;
  return url.href;
}

const originalLink = md.renderer.rules.link_open;
md.renderer.rules.html_inline = (tokens, index) => {
  const html = tokens[index].content;
  if (/^<(?:img|br)\b/i.test(html)) return html;
  return html.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
};
md.renderer.rules.link_open = (tokens, index, options, env, self) => {
  const href = tokens[index].attrGet('href');
  if (href) tokens[index].attrSet('href', localLink(href, env.path, env.pagePaths));
  return originalLink?.(tokens, index, options, env, self) ?? self.renderToken(tokens, index, options);
};


export function renderMarkdown(source, path, pagePaths, used = new Set()) {
  const env = { path, pagePaths };
  const tokens = md.parse(source, env);
  const headings = [];
  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return;
    const label = tokens[index + 1].content.replaceAll('`', '');
    const stem = label.toLowerCase().trim().replace(/[^\p{L}\p{N}.]+/gu, '-').replace(/^-|-$/g, '') || 'section';
    let id = stem;
    for (let suffix = 2; used.has(id); suffix++) id = stem + '-' + suffix;
    used.add(id);
    token.attrSet('id', id);
    if (token.tag === 'h2') headings.push({ id, label });
  });
  return { html: md.renderer.render(tokens, md.options, env), headings };
}


