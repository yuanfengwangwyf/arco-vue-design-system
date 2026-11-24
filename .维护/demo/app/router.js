import { createRouter, createWebHashHistory, createWebHistory } from 'vue-router';
import { pages } from './catalog';
import DocPage from './DocPage.js';

export const router = createRouter({
  history: import.meta.env.MODE === 'offline' || location.protocol === 'file:'
    ? createWebHashHistory()
    : createWebHistory(),
  routes: [
    { path: '/', redirect: '/vue/docs/changelog' },
    ...pages.map(page => ({ path: page.route, component: DocPage, props: { page } })),
    { path: '/:pathMatch(.*)*', component: () => import('./NotFound.js') },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash && to.path === from.path) {
      const element = document.getElementById(decodeURIComponent(to.hash.slice(1)));
      if (element) return { el: element, top: 84 };
    }
    return { top: 0 };
  },
});

