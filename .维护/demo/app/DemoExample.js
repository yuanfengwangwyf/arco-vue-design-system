import { defineAsyncComponent, ref } from 'vue';
import template from './DemoExample.html?raw';

export default {
  template,
  props: { id: String, title: String, description: String },
  setup(props) {
    const examples = import.meta.glob('/generated/demos/**/*.vue');
    const key = '/generated/demos/' + props.id + '.vue';
    const example = defineAsyncComponent(examples[key]);
    const sourceLoaders = import.meta.glob('/generated/demos/**/*.vue', { query: '?raw', import: 'default' });
    const source = ref('');
    const expanded = ref(false);
    async function toggle() {
      expanded.value = !expanded.value;
      if (expanded.value && !source.value) source.value = await sourceLoaders[key]();
    }
    return { example, source, expanded, toggle };
  },
};
