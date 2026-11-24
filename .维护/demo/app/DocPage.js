import { computed, inject, nextTick, onMounted, ref } from 'vue';
import artwork from './overview-art.json';
import illustrationMarkup from 'virtual:arco-overview-art';
import { useRoute, useRouter } from 'vue-router';
import * as iconExports from '@arco-design/web-vue/es/icon';
import TokenPage from './TokenPage.js';
import { pages, version } from './catalog';
import { demoPattern } from '../../scripts/demo-blocks.mjs';
import DemoExample from './DemoExample.js';
import template from './DocPage.html?raw';

export default {
  template,
  props: { page: { type: Object, required: true } },
  components: { DemoExample, TokenPage },
  setup(props) {
    const route = useRoute();
    const router = useRouter();
    const content = import.meta.glob(['/basic/*.html', '/page/**/*.html'], { query: '?raw', import: 'default' });
    const sections = ref([]);
    const headings = ref([]);
    const loaded = ref(false);
    const filter = ref('');
    const icons = Object.entries(iconExports).filter(([name]) => /^Icon[A-Z]/.test(name));
    const visibleIcons = computed(() => icons.filter(([name]) => name.toLowerCase().includes(filter.value.toLowerCase())));
    const dark = inject('docs-dark');
    const artworkByName = new Map(artwork.map(name => [name.toLowerCase(), name]));
    const componentGroups = new Map();
    for (const item of pages.filter(candidate => candidate.component)) {
      if (!componentGroups.has(item.group)) componentGroups.set(item.group, []);
      const name = item.component.replaceAll('-', '');
      const image = artworkByName.get(name === 'mention' ? 'mentions' : name);
      componentGroups.get(item.group).push({ ...item, image });
    }

    onMounted(async () => {
      const html = await content['/' + props.page.content]();
      const template = document.createElement('template');
      const outline = [];
      const parts = [];
      function addContent(fragment) {
        parts.push({ html: fragment });
        template.innerHTML = fragment;
        for (const heading of template.content.querySelectorAll('h2[id]')) {
          outline.push({ id: heading.id, label: heading.textContent });
        }
      }
      let cursor = 0;
      for (const match of html.matchAll(demoPattern)) {
        const [block, id, fragment] = match;
        addContent(html.slice(cursor, match.index));
        const description = document.createElement('template');
        description.innerHTML = fragment.slice(0, fragment.indexOf('<template data-demo-source>'));
        const title = description.content.querySelector('h3');
        const label = title.textContent;
        title.remove();
        parts.push({ demo: id, title: label, description: description.innerHTML });
        outline.push({ id: 'demo-' + id.split('/').at(-1), label });
        cursor = match.index + block.length;
      }
      addContent(html.slice(cursor));
      sections.value = parts;
      headings.value = outline;
      loaded.value = true;
      document.title = props.page.title + ' · Arco Vue';
      await nextTick();
      if (route.hash) document.getElementById(decodeURIComponent(route.hash.slice(1)))?.scrollIntoView();
    });

    function navigate(event) {
      if (event.defaultPrevented) return;
      const link = event.target.closest('a');
      if (!link || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const href = link.getAttribute('href');
      if (href?.startsWith('/vue/') || href?.startsWith('#')) {
        event.preventDefault();
        void router.push(href.startsWith('#') ? { hash: href } : href);
      }
    }
    return { sections, headings, loaded, filter, visibleIcons, componentGroups, illustrationMarkup, dark, version, navigate };
  },
};
