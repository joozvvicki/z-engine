import ActorsPage from '@ui/pages/ActorsPage.vue'
import DatabasePage from '@ui/pages/DatabasePage.vue'
import EnemiesPage from '@ui/pages/EnemiesPage.vue'
import IndexPage from '@ui/pages/IndexPage.vue'
import PluginsPage from '@ui/pages/PluginsPage.vue'
import ResourcesPage from '@ui/pages/ResourcesPage.vue'
import SettingsPage from '@ui/pages/SettingsPage.vue'
import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'index',
      component: IndexPage
    },
    {
      path: '/database',
      name: 'database',
      component: DatabasePage
    },
    {
      path: '/resources',
      name: 'resources',
      component: ResourcesPage
    },
    {
      path: '/actors',
      name: 'actors',
      component: ActorsPage
    },
    {
      path: '/enemies',
      name: 'enemies',
      component: EnemiesPage
    },
    {
      path: '/plugins',
      name: 'plugins',
      component: PluginsPage
    },
    {
      path: '/settings',
      name: 'settings',
      component: SettingsPage
    },
    {
      path: '/logout',
      name: 'logout',
      component: IndexPage
    }
  ]
})

export default router
