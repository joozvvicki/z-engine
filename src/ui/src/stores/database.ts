import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

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

  return {
    actors,
    addActor,
    deleteActor
  }
})
