<template>
  <div class="min-h-screen p-6 bg-[var(--ui-bg)] text-[var(--ui-text)]">
    <div class="max-w-2xl mx-auto">

      <!-- Header -->
      <h1 class="text-3xl font-bold mb-6">TaxiStand Rides</h1>

      <!-- Start Trip Button -->
      <button @click="startNewTrip"
        class="mb-6 w-full px-5 py-3 rounded bg-[var(--ui-primary)] text-white font-medium text-lg">
        Start New Trip
      </button>

      <!-- Rides List -->
      <div class="space-y-4">
        <template v-if="loading">
          <div>Loading rides...</div>
        </template>

        <template v-else-if="rides.length === 0">
          <div class="text-[var(--ui-text-muted)]">No rides found.</div>
        </template>

        <div v-for="r in rides" :key="r.id"
          class="p-4 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] flex justify-between items-center">
          <div>
            <div class="font-semibold">Trip #{{ r.id }}</div>
            <div class="text-sm text-[var(--ui-text-muted)]">
              {{ formatDate(r.datetime) }}
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Status badge -->
            <span :class="[
              'px-2 py-1 rounded text-sm',
              r.completed ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'
            ]">
              {{ r.completed ? 'Closed' : 'In Progress' }}
            </span>

            <!-- Continue button -->
            <button v-if="!r.completed" @click="endTrip(r.id)"
              class="px-3 py-1 rounded border border-[var(--ui-border)] text-sm cursor-pointer">
              End trip
            </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import tripsListMock from '../assets/mock/trips-list-mock.json' // Mock data for demo purposes

const router = useRouter()
const rides = ref([])
const loading = ref(true)

// Load all rides from server OR local drafts (fallback)
onMounted(async () => {
  loading.value = true
  try {
    // const res = await fetch('/api/trips')
    // if (!res.ok) throw new Error()
    // rides.value = await res.json()        // <-- expected: an array of trips
    setTimeout(() => {
      rides.value = tripsListMock // <-- mock data for demo purposes
    }, 1000)
  } catch (err) {
    // fallback to local storage (simple)
    rides.value = loadLocalRides()
  }
  loading.value = false
})

function startNewTrip() {
  router.push('/trips/new')
}

function endTrip(id) {
  router.push(`/trips/${id}/end`)
}

// fallback local storage loader (for offline use)
function loadLocalRides() {
  const list = []

  // In-progress (start drafts)
  try {
    const raw = localStorage.getItem('taxistand_inprogress_trips_v1')
    if (raw) {
      const arr = JSON.parse(raw) || []
      for (const t of arr) {
        list.push({
          id: t._serverId || t._localId,
          datetime: t.datetime || new Date().toISOString(),
          completed: false,
        })
      }
    }
  } catch (e) { }

  // Completed (optional)
  try {
    const raw2 = localStorage.getItem('taxistand_completed_trips')
    if (raw2) {
      const arr2 = JSON.parse(raw2) || []
      for (const t of arr2) {
        list.push({
          id: t.id || t._localId,
          datetime: t.datetime || t.completed_at || new Date().toISOString(),
          completed: true,
        })
      }
    }
  } catch (e) { }

  // Sort newest first
  return list.sort((a, b) => new Date(b.datetime) - new Date(a.datetime))
}

function formatDate(str) {
  if (!str) return '—'
  const d = new Date(str)
  return d.toLocaleString()
}
</script>

<style scoped>
/* Keeping styling minimal — Nuxt UI tokens handle theme */
</style>
