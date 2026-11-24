import { computed, provide, ref, watch } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { groups, version } from './catalog';
import template from './DemoApp.html?raw';

export default {
  template,
  setup() {
    const route = useRoute();
    const query = ref('');
    const open = ref(false);
    const dark = ref(false);
    provide('docs-dark', dark);
    const menu = computed(() => {
      const filter = query.value.trim().toLowerCase();
      const sections = [];
      const components = [];
      for (const [label, pages] of groups) {
        const entries = pages.filter(page => page.title.toLowerCase().includes(filter));
        if (!entries.length) continue;
        if (pages.some(page => page.component || page.id === 'overview')) {
          components.push({ label, entries });
        } else {
          sections.push({ label, groups: [{ entries }] });
        }
      }
      if (components.length) sections.push({ label: '组件', groups: components });
      return sections;
    });
    watch(() => route.path, () => { open.value = false; });
    watch(dark, value => {
      document.documentElement.dataset.theme = value ? 'dark' : 'light';
      if (value) document.body.setAttribute('arco-theme', 'dark');
      else document.body.removeAttribute('arco-theme');
    });
    return { query, open, dark, menu, version };
  },
};

