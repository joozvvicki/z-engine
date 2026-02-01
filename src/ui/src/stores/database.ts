import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { ZActor, ZClass } from '@engine/types'

export const useDatabaseStore = defineStore('database', () => {
  const actors = useLocalStorage<ZActor[]>('Z_DB_Actors', [
    {
      id: 1,
      name: 'Harold',
      nickname: '',
      classId: 1,
      initialLevel: 1,
      maxLevel: 99,
      profile: 'A brave warrior who fights for justice.',
      face: 'Actor1_1',
      character: 'Actor1_1'
    },
    {
      id: 2,
      name: 'Therese',
      nickname: '',
      classId: 2,
      initialLevel: 1,
      maxLevel: 99,
      profile: 'A skilled mage.',
      face: 'Actor1_2',
      character: 'Actor1_2'
    }
  ])

  const classes = useLocalStorage<ZClass[]>('Z_DB_Classes', [
    { id: 1, name: 'Paladin', description: 'A holy warrior with high defense.' },
    { id: 2, name: 'Sorcerer', description: 'A master of arcane arts.' },
    { id: 3, name: 'Ranger', description: 'A swift woodlander skilled with bows.' }
  ])

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
      character: ''
    })
  }

  const deleteActor = (id: number): void => {
    const idx = actors.value.findIndex((a) => a.id === id)
    if (idx !== -1) actors.value.splice(idx, 1)
  }

  const addClass = (): void => {
    const newId = classes.value.length > 0 ? Math.max(...classes.value.map((c) => c.id)) + 1 : 1
    classes.value.push({
      id: newId,
      name: `Class ${newId}`,
      description: ''
    })
  }

  const deleteClass = (id: number): void => {
    const idx = classes.value.findIndex((c) => c.id === id)
    if (idx !== -1) classes.value.splice(idx, 1)
  }

  return {
    actors,
    addActor,
    deleteActor,
    classes,
    addClass,
    deleteClass
  }
})
