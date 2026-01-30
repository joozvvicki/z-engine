import ActorsPage from '@ui/pages/ActorsPage.vue'
import DatabasePage from '@ui/pages/DatabasePage.vue'
import EnemiesPage from '@ui/pages/EnemiesPage.vue'
import EditorPage from '@ui/pages/EditorPage.vue'
import ProjectLauncher from '@ui/pages/ProjectLauncher.vue'
import PluginsPage from '@ui/pages/PluginsPage.vue'
import ResourcesPage from '@ui/pages/ResourcesPage.vue'
import SettingsPage from '@ui/pages/SettingsPage.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import { ProjectService } from '../services/ProjectService'
import { useEditorStore } from '../stores/editor'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'launcher',
      component: ProjectLauncher
    },
    {
      path: '/editor',
      name: 'editor',
      component: EditorPage
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
      component: EditorPage
    }
  ]
})

router.beforeEach(async (to, _from, next) => {
  if (to.name === 'logout') {
    ProjectService.clearProject()
    // We might want to reset store here too if possible, but simpler to just redirect
    next({ name: 'launcher' })
    return
  }

  // If navigating to launcher, allow
  if (to.name === 'launcher') {
    next()
    return
  }

  // If project is loaded, allow
  if (ProjectService.isLoaded()) {
    next()
    return
  }

  // Project not loaded, try to restore
  const lastPath = ProjectService.loadLastProject()
  if (lastPath) {
    try {
      // We must get store instance here. Pinia should be active.
      const store = useEditorStore()
      await store.loadProject(false)
      if (ProjectService.isLoaded()) {
        next()
        return
      }
    } catch (e) {
      console.error('Failed to restore project on navigation guard', e)
    }
  }

  // Fallback to launcher
  next({ name: 'launcher' })
})

export default router
