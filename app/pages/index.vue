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


        <template v-else-if="trips.length === 0">
          <div class="text-[var(--ui-text-muted)]">No rides found.</div>
        </template>

        <div v-for="r in trips" :key="r.id"
          class="p-4 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)] flex justify-between items-center">
          <div>
            <div class="font-semibold">Trip #{{ r.id }}</div>
            <div class="text-sm text-[var(--ui-text-muted)]">
              {{ formatDate(r.start_time) }}
            </div>
          </div>

          <div class="flex items-center gap-3">
            <!-- Status badge -->
             <span v-if="r.fare" :class="[
              'px-2 py-1 rounded text-sm',
              'bg-gray-200 text-green-800' 
            ]">
              {{ `₹${r.fare}` }}
            </span>
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
import { useRouter } from 'vue-router'

const router = useRouter()
const store = useTripsStore()
const { trips, loading, } = storeToRefs(store)

function startNewTrip() {
  router.push('/trips/new')
}

function endTrip(id) {
  router.push(`/trips/${id}/end`)
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
