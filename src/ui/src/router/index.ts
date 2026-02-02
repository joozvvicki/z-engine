import DashboardPage from '@ui/pages/DashboardPage.vue'
import DatabasePage from '@ui/pages/DatabasePage.vue'
import EditorPage from '@ui/pages/EditorPage.vue'
import ProjectLauncher from '@ui/pages/ProjectLauncher.vue'
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
      name: 'dashboard',
      component: DashboardPage
    },
    {
      path: '/launcher',
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
      component: DatabasePage,
      children: [
        { path: '', redirect: '/database/actors' },
        {
          path: 'actors',
          name: 'database-actors',
          component: () => import('@ui/components/database/ActorsTab.vue')
        },
        {
          path: 'classes',
          name: 'database-classes',
          component: () => import('@ui/components/database/ClassesTab.vue')
        },
        {
          path: 'skills',
          name: 'database-skills',
          component: () => import('@ui/components/database/SkillsTab.vue')
        },
        {
          path: 'items',
          name: 'database-items',
          component: () => import('@ui/components/database/ItemsTab.vue')
        },
        {
          path: 'weapons',
          name: 'database-weapons',
          component: () => import('@ui/components/database/WeaponsTab.vue')
        },
        {
          path: 'armors',
          name: 'database-armors',
          component: () => import('@ui/components/database/ArmorsTab.vue')
        },
        {
          path: 'enemies',
          name: 'database-enemies',
          component: () => import('@ui/components/database/EnemiesTab.vue')
        },
        {
          path: 'system',
          name: 'database-system',
          component: () => import('@ui/components/database/SystemTab.vue')
        }
      ]
    },
    {
      path: '/resources',
      component: ResourcesPage,
      children: [
        { path: '', redirect: '/resources/tilesets' },
        {
          path: 'tilesets',
          name: 'resources-tilesets',
          component: () => import('@ui/pages/ResourcesPage.vue')
        },
        {
          path: 'characters',
          name: 'resources-characters',
          component: () => import('@ui/pages/ResourcesPage.vue')
        },
        {
          path: 'faces',
          name: 'resources-faces',
          component: () => import('@ui/pages/ResourcesPage.vue')
        },
        {
          path: 'backgrounds',
          name: 'resources-backgrounds',
          component: () => import('@ui/pages/ResourcesPage.vue')
        },
        {
          path: 'animations',
          name: 'resources-animations',
          component: () => import('@ui/pages/ResourcesPage.vue')
        },
        {
          path: 'music',
          name: 'resources-music',
          component: () => import('@ui/pages/ResourcesPage.vue')
        },
        {
          path: 'sounds',
          name: 'resources-sounds',
          component: () => import('@ui/pages/ResourcesPage.vue')
        }
      ]
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
