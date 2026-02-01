import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'
import type { ZActor, ZClass, ZSkill, ZItem, ZWeapon, ZArmor, ZEnemy } from '@engine/types'

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

  const skills = useLocalStorage<ZSkill[]>('Z_DB_Skills', [
    { id: 1, name: 'Slash', description: 'A basic sword attack.' },
    { id: 2, name: 'Fireball', description: 'A blast of magical fire.' }
  ])

  const items = useLocalStorage<ZItem[]>('Z_DB_Items', [
    { id: 1, name: 'Potion', description: 'Restores small amount of HP.', price: 50 },
    { id: 2, name: 'Elixir', description: 'Fully restores HP and MP.', price: 500 }
  ])

  const weapons = useLocalStorage<ZWeapon[]>('Z_DB_Weapons', [
    { id: 1, name: 'Bronze Sword', description: 'A common sword.', price: 200, attack: 10 },
    { id: 2, name: 'Iron Blade', description: 'A sturdy iron blade.', price: 500, attack: 25 }
  ])

  const armors = useLocalStorage<ZArmor[]>('Z_DB_Armors', [
    {
      id: 1,
      name: 'Cloth Armor',
      description: 'Basic protective clothing.',
      price: 100,
      defense: 5
    },
    {
      id: 2,
      name: 'Leather Plate',
      description: 'Tough leather protection.',
      price: 300,
      defense: 15
    }
  ])

  const enemies = useLocalStorage<ZEnemy[]>('Z_DB_Enemies', [
    {
      id: 1,
      name: 'Slime',
      mhp: 100,
      mmp: 0,
      atk: 10,
      def: 10,
      mat: 5,
      mdf: 10,
      agi: 8,
      luk: 5,
      exp: 10,
      gold: 5
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

  const addSkill = (): void => {
    const newId = skills.value.length > 0 ? Math.max(...skills.value.map((s) => s.id)) + 1 : 1
    skills.value.push({ id: newId, name: `Skill ${newId}`, description: '' })
  }

  const deleteSkill = (id: number): void => {
    const idx = skills.value.findIndex((s) => s.id === id)
    if (idx !== -1) skills.value.splice(idx, 1)
  }

  const addItem = (): void => {
    const newId = items.value.length > 0 ? Math.max(...items.value.map((i) => i.id)) + 1 : 1
    items.value.push({ id: newId, name: `Item ${newId}`, description: '', price: 0 })
  }

  const deleteItem = (id: number): void => {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx !== -1) items.value.splice(idx, 1)
  }

  const addWeapon = (): void => {
    const newId = weapons.value.length > 0 ? Math.max(...weapons.value.map((w) => w.id)) + 1 : 1
    weapons.value.push({ id: newId, name: `Weapon ${newId}`, description: '', price: 0, attack: 0 })
  }

  const deleteWeapon = (id: number): void => {
    const idx = weapons.value.findIndex((w) => w.id === id)
    if (idx !== -1) weapons.value.splice(idx, 1)
  }

  const addArmor = (): void => {
    const newId = armors.value.length > 0 ? Math.max(...armors.value.map((a) => a.id)) + 1 : 1
    armors.value.push({ id: newId, name: `Armor ${newId}`, description: '', price: 0, defense: 0 })
  }

  const deleteArmor = (id: number): void => {
    const idx = armors.value.findIndex((a) => a.id === id)
    if (idx !== -1) armors.value.splice(idx, 1)
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
  }

  const deleteEnemy = (id: number): void => {
    const idx = enemies.value.findIndex((e) => e.id === id)
    if (idx !== -1) enemies.value.splice(idx, 1)
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
    deleteEnemy
  }
})
