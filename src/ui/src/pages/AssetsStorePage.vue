<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  IconSearch,
  IconStarFilled,
  IconDownload,
  IconShoppingCart,
  IconLayoutGrid,
  IconMusic,
  IconBrush,
  IconCube,
  IconBolt
} from '@tabler/icons-vue'

// --- DANE ---
interface Asset {
  id: string
  title: string
  author: string
  price: number // 0 = Free
  rating: number
  downloads: string
  category: string
  imageColor: string // Symulacja obrazka
  tags?: string[]
}

const categories = [
  { id: 'all', label: 'All Assets', icon: IconLayoutGrid },
  { id: '2d', label: '2D Sprites', icon: IconBrush },
  { id: '3d', label: '3D Models', icon: IconCube },
  { id: 'audio', label: 'Audio & Music', icon: IconMusic },
  { id: 'ui', label: 'User Interface', icon: IconLayoutGrid },
  { id: 'vfx', label: 'VFX & Shaders', icon: IconBolt }
]

const assets = ref<Asset[]>([
  {
    id: '1',
    title: 'Fantasy RPG Heroes Pack',
    author: 'PixelStudios',
    price: 0,
    rating: 4.8,
    downloads: '12k',
    category: '2d',
    imageColor: 'from-indigo-500 to-purple-500',
    tags: ['New', 'Free']
  },
  {
    id: '2',
    title: 'Low Poly Dungeon Set',
    author: 'PolyMaster',
    price: 14.99,
    rating: 4.5,
    downloads: '5.2k',
    category: '3d',
    imageColor: 'from-emerald-400 to-cyan-500',
    tags: ['Best Seller']
  },
  {
    id: '3',
    title: 'Epic Orchestral OST',
    author: 'AudioWorks',
    price: 24.99,
    rating: 5.0,
    downloads: '800',
    category: 'audio',
    imageColor: 'from-rose-400 to-red-500'
  },
  {
    id: '4',
    title: 'Modern UI Kit Pro',
    author: 'InterfaceLab',
    price: 9.99,
    rating: 4.2,
    downloads: '2.1k',
    category: 'ui',
    imageColor: 'from-blue-400 to-indigo-500'
  },
  {
    id: '5',
    title: 'Mega VFX Particle Pack',
    author: 'EffectGod',
    price: 0,
    rating: 4.7,
    downloads: '150k',
    category: 'vfx',
    imageColor: 'from-amber-400 to-orange-500',
    tags: ['Free']
  },
  {
    id: '6',
    title: 'Cyberpunk City Tileset',
    author: 'NeonArt',
    price: 19.99,
    rating: 4.9,
    downloads: '3.4k',
    category: '2d',
    imageColor: 'from-fuchsia-500 to-pink-500',
    tags: ['Sale']
  }
])

// --- STATE ---
const selectedCategory = ref('all')
const searchQuery = ref('')
const activeTab = ref<'popular' | 'new' | 'free'>('popular')

// --- COMPUTED ---
const filteredAssets = computed(() => {
  let result = assets.value

  // Filter by Category
  if (selectedCategory.value !== 'all') {
    result = result.filter((a) => a.category === selectedCategory.value)
  }

  // Filter by Search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (a) => a.title.toLowerCase().includes(query) || a.author.toLowerCase().includes(query)
    )
  }

  return result
})

// --- ACTIONS ---
const getPriceLabel = (price: number): string => (price === 0 ? 'Free' : `$${price}`)
</script>

<template>
  <div class="flex h-full w-full bg-[#f8f9fc] text-slate-800 font-sans overflow-hidden">
    <aside
      class="w-64 bg-white border-r border-slate-100 flex flex-col shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]"
    >
      <div class="p-6">
        <h2 class="text-lg font-bold tracking-tight text-slate-800 flex items-center gap-2 mb-6">
          <div class="bg-blue-600 text-white p-1.5 rounded-lg">
            <IconLayoutGrid :size="18" stroke-width="2.5" />
          </div>
          Asset Store
        </h2>

        <div class="space-y-1">
          <button
            v-for="cat in categories"
            :key="cat.id"
            class="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
            :class="
              selectedCategory === cat.id
                ? 'bg-blue-50 text-blue-700 font-bold'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            "
            @click="selectedCategory = cat.id"
          >
            <div class="flex items-center gap-3">
              <component
                :is="cat.icon"
                :size="18"
                :class="
                  selectedCategory === cat.id
                    ? 'text-blue-600'
                    : 'text-slate-400 group-hover:text-slate-600'
                "
              />
              {{ cat.label }}
            </div>
            <span
              v-if="selectedCategory === cat.id"
              class="w-1.5 h-1.5 rounded-full bg-blue-600"
            ></span>
          </button>
        </div>
      </div>

      <div class="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
        <div
          class="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm"
        >
          <div
            class="w-8 h-8 rounded-full bg-linear-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-500/20"
          >
            JD
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-bold text-slate-700">John Doe</div>
            <div class="text-[10px] text-slate-400 font-medium">
              Balance: <span class="text-emerald-600 font-bold">$124.50</span>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 overflow-y-auto custom-scrollbar">
      <header class="px-8 py-6 sticky top-0 z-10 bg-[#f8f9fc]/90 backdrop-blur-md">
        <div class="flex items-center justify-between gap-6">
          <div class="relative w-full max-w-xl group">
            <IconSearch
              class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
              :size="20"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search for assets, mechanics, sounds..."
              class="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <div
            class="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm"
          >
            <button
              v-for="tab in ['popular', 'new', 'free']"
              :key="tab"
              class="px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all"
              :class="
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              "
              @click="activeTab = tab as any"
            >
              {{ tab }}
            </button>
          </div>
        </div>
      </header>

      <div class="px-8 pb-12 space-y-8">
        <div
          v-if="!searchQuery && selectedCategory === 'all'"
          class="relative w-full min-h-64 h-80 rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/20 group cursor-pointer"
        >
          <div
            class="absolute inset-0 bg-linear-to-r from-violet-600 via-indigo-600 to-blue-500 transition-transform duration-700 group-hover:scale-105"
          ></div>

          <div class="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div class="absolute left-10 bottom-10 w-40 h-40 bg-black/10 rounded-full blur-2xl"></div>

          <div class="absolute inset-0 flex flex-col justify-center px-12 text-white">
            <span
              class="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest w-fit mb-4 border border-white/10"
              >Featured Bundle</span
            >
            <h1 class="text-4xl font-black mb-2 leading-tight">Ultimate RPG <br />Creator Kit</h1>
            <p class="text-blue-100 max-w-md font-medium text-sm mb-8 opacity-90">
              Everything you need to build your dream RPG. Characters, monsters, tilesets and more.
            </p>

            <div class="flex items-center gap-4">
              <button
                class="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-black/10"
              >
                View Details
              </button>
              <span class="text-xl font-bold">$29.99</span>
              <span class="text-sm line-through text-white/50">$59.99</span>
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-bold text-slate-800">
              {{ searchQuery ? `Results for "${searchQuery}"` : 'Browse Assets' }}
            </h3>
            <span class="text-xs font-medium text-slate-400"
              >{{ filteredAssets.length }} items found</span
            >
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <div
              v-for="asset in filteredAssets"
              :key="asset.id"
              class="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 group flex flex-col overflow-hidden"
            >
              <div class="relative h-40 w-full bg-linear-to-br" :class="asset.imageColor">
                <div class="absolute inset-0 flex items-center justify-center text-white/90">
                  <IconCube v-if="asset.category === '3d'" :size="48" class="drop-shadow-lg" />
                  <IconBrush
                    v-else-if="asset.category === '2d'"
                    :size="48"
                    class="drop-shadow-lg"
                  />
                  <IconMusic
                    v-else-if="asset.category === 'audio'"
                    :size="48"
                    class="drop-shadow-lg"
                  />
                  <IconLayoutGrid
                    v-else-if="asset.category === 'ui'"
                    :size="48"
                    class="drop-shadow-lg"
                  />
                  <IconBolt v-else :size="48" class="drop-shadow-lg" />
                </div>

                <div v-if="asset.tags" class="absolute top-3 left-3 flex gap-2">
                  <span
                    v-for="tag in asset.tags"
                    :key="tag"
                    class="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wide"
                  >
                    {{ tag }}
                  </span>
                </div>

                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]"
                >
                  <button
                    class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-lg hover:scale-110 transition-transform"
                  >
                    <IconShoppingCart :size="18" />
                  </button>
                </div>
              </div>

              <div class="p-4 flex-1 flex flex-col">
                <div class="flex justify-between items-start mb-1">
                  <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {{ asset.category }}
                  </div>
                  <div class="flex items-center gap-1 text-amber-400 text-xs font-bold">
                    <IconStarFilled :size="10" />
                    <span>{{ asset.rating }}</span>
                  </div>
                </div>

                <h4
                  class="font-bold text-slate-800 leading-snug mb-1 group-hover:text-blue-600 transition-colors"
                >
                  {{ asset.title }}
                </h4>
                <p class="text-xs text-slate-500 mb-4">
                  by
                  <span class="text-slate-700 font-medium hover:underline cursor-pointer">{{
                    asset.author
                  }}</span>
                </p>

                <div
                  class="mt-auto flex items-center justify-between pt-3 border-t border-slate-50"
                >
                  <span class="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <IconDownload :size="12" /> {{ asset.downloads }}
                  </span>
                  <div
                    class="px-3 py-1 rounded-lg text-xs font-bold transition-colors"
                    :class="
                      asset.price === 0
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-700'
                    "
                  >
                    {{ getPriceLabel(asset.price) }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="filteredAssets.length === 0"
            class="py-20 flex flex-col items-center justify-center text-center"
          >
            <div class="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <IconSearch :size="32" class="text-slate-300" />
            </div>
            <h3 class="text-lg font-bold text-slate-800">No assets found</h3>
            <p class="text-slate-400 text-sm max-w-xs mx-auto">
              Try adjusting your search or category filters to find what you're looking for.
            </p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

.font-sans {
  font-family: 'Inter', sans-serif;
}

/* Scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 10px;
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: #94a3b8;
}
</style>
