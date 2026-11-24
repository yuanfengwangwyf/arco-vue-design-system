import { createApp } from 'vue';
import ArcoVue from '@arco-design/web-vue';
import ArcoIcons from '@arco-design/web-vue/es/icon';
import App from './app/DemoApp.js';
import { router } from './app/router';
import '../src/styles/arco';
import '../design-variable.css';
import '../styles.css';

createApp(App).use(ArcoVue).use(ArcoIcons).use(router).mount('#app');

