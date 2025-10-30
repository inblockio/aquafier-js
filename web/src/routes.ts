import { lazy } from 'solid-js';
import type { RouteDefinition } from '@solidjs/router';

import Home from './pages/website/home';
import AboutData from './pages/about.data';

export const routes: RouteDefinition[] = [
  {
    path: '/',
    component: Home,
  },
  {
    path: '/app',
    component: lazy(() => import('./pages/app/aquafier_app')),

  },
  {
    path: '**',
    component: lazy(() => import('./errors/404')),
  },
];
