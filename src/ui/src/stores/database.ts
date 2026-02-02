import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ZActor, ZClass, ZSkill, ZItem, ZWeapon, ZArmor, ZEnemy } from '@engine/types'
import { ProjectService } from '../services/ProjectService'

export const useDatabaseStore = defineStore('database', () => {
  const actors = ref<ZActor[]>([])
  const classes = ref<ZClass[]>([])
  const skills = ref<ZSkill[]>([])
  const items = ref<ZItem[]>([])
  const weapons = ref<ZWeapon[]>([])
  const armors = ref<ZArmor[]>([])
  const enemies = ref<ZEnemy[]>([])
  const isLoaded = ref(false)

  const loadAll = async (): Promise<void> => {
    isLoaded.value = false
    actors.value = (await ProjectService.loadDatabaseFile<ZActor[]>('Actors.json')) || []
    classes.value = (await ProjectService.loadDatabaseFile<ZClass[]>('Classes.json')) || []
    skills.value = (await ProjectService.loadDatabaseFile<ZSkill[]>('Skills.json')) || []
    items.value = (await ProjectService.loadDatabaseFile<ZItem[]>('Items.json')) || []
    weapons.value = (await ProjectService.loadDatabaseFile<ZWeapon[]>('Weapons.json')) || []
    armors.value = (await ProjectService.loadDatabaseFile<ZArmor[]>('Armors.json')) || []
    enemies.value = (await ProjectService.loadDatabaseFile<ZEnemy[]>('Enemies.json')) || []
    isLoaded.value = true
  }

  const save = async (filename: string, data: unknown): Promise<void> => {
    if (!isLoaded.value) return
    await ProjectService.saveDatabaseFile(filename, data)
  }

  // Akcje
  const addActor = (): void => {
    const newId = actors.value.length > 0 ? Math.max(...actors.value.map((a) => a.id)) + 1 : 1
    actors.value.push({
      id: newId,
      name: `Actor ${newId}`,
      nickname: '',
      classId: 1,
      initialLevel: 1,
      maxLevel: 99,
      profile: '',
      face: '',
      character: '',
      faceX: 0,
      faceY: 0,
      characterX: 0,
      characterY: 0,
      baseParams: [0, 0, 0, 0, 0, 0, 0, 0]
    })
    save('Actors.json', actors.value)
  }

  const deleteActor = (id: number): void => {
    const idx = actors.value.findIndex((a) => a.id === id)
    if (idx !== -1) {
      actors.value.splice(idx, 1)
      save('Actors.json', actors.value)
    }
  }

  const addClass = (): void => {
    const newId = classes.value.length > 0 ? Math.max(...classes.value.map((c) => c.id)) + 1 : 1
    classes.value.push({
      id: newId,
      name: `Class ${newId}`,
      description: '',
      params: [500, 100, 10, 10, 10, 10, 10, 10]
    })
    save('Classes.json', classes.value)
  }

  const deleteClass = (id: number): void => {
    const idx = classes.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      classes.value.splice(idx, 1)
      save('Classes.json', classes.value)
    }
  }

  const addSkill = (): void => {
    const newId = skills.value.length > 0 ? Math.max(...skills.value.map((s) => s.id)) + 1 : 1
    skills.value.push({ id: newId, name: `Skill ${newId}` })
    save('Skills.json', skills.value)
  }

  const deleteSkill = (id: number): void => {
    const idx = skills.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      skills.value.splice(idx, 1)
      save('Skills.json', skills.value)
    }
  }

  const addItem = (): void => {
    const newId = items.value.length > 0 ? Math.max(...items.value.map((i) => i.id)) + 1 : 1
    items.value.push({
      id: newId,
      name: `Item ${newId}`,
      price: 0,
      consumable: true,
      target: 1
    })
    save('Items.json', items.value)
  }

  const deleteItem = (id: number): void => {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) {
      items.value.splice(idx, 1)
      save('Items.json', items.value)
    }
  }

  const addWeapon = (): void => {
    const newId = weapons.value.length > 0 ? Math.max(...weapons.value.map((w) => w.id)) + 1 : 1
    weapons.value.push({
      id: newId,
      name: `Weapon ${newId}`,
      price: 0,
      params: [0, 0, 5, 0, 0, 0, 0, 0]
    })
    save('Weapons.json', weapons.value)
  }

  const deleteWeapon = (id: number): void => {
    const idx = weapons.value.findIndex((w) => w.id === id)
    if (idx !== -1) {
      weapons.value.splice(idx, 1)
      save('Weapons.json', weapons.value)
    }
  }

  const addArmor = (): void => {
    const newId = armors.value.length > 0 ? Math.max(...armors.value.map((a) => a.id)) + 1 : 1
    armors.value.push({
      id: newId,
      name: `Armor ${newId}`,
      price: 0,
      params: [0, 0, 0, 5, 0, 0, 0, 0]
    })
    save('Armors.json', armors.value)
  }

  const deleteArmor = (id: number): void => {
    const idx = armors.value.findIndex((a) => a.id === id)
    if (idx !== -1) {
      armors.value.splice(idx, 1)
      save('Armors.json', armors.value)
    }
  }

  const addEnemy = (): void => {
    const newId = enemies.value.length > 0 ? Math.max(...enemies.value.map((e) => e.id)) + 1 : 1
    enemies.value.push({
      id: newId,
      name: `Enemy ${newId}`,
      mhp: 10,
      mmp: 0,
      atk: 10,
      def: 10,
      mat: 10,
      mdf: 10,
      agi: 10,
      luk: 10,
      exp: 10,
      gold: 10
    })
    save('Enemies.json', enemies.value)
  }

  const deleteEnemy = (id: number): void => {
    const idx = enemies.value.findIndex((e) => e.id === id)
    if (idx !== -1) {
      enemies.value.splice(idx, 1)
      save('Enemies.json', enemies.value)
    }
  }

  return {
    actors,
    addActor,
    deleteActor,
    classes,
    addClass,
    deleteClass,
    skills,
    addSkill,
    deleteSkill,
    items,
    addItem,
    deleteItem,
    weapons,
    addWeapon,
    deleteWeapon,
    armors,
    addArmor,
    deleteArmor,
    enemies,
    addEnemy,
    deleteEnemy,
    loadAll,
    save,
    isLoaded
  }
})
