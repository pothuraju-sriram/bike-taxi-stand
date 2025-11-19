<template>
    <div class="max-w-xl mx-auto p-4 rounded-md shadow-md
              bg-[var(--ui-bg)] text-[var(--ui-text)] transition-colors duration-300">
        <h2 class="text-2xl font-semibold mb-3">End Trip</h2>

        <div v-if="loading" class="p-4">Loading trip...</div>
        <div v-else-if="!trip" class="p-4 text-red-600">Trip not found.</div>

        <form v-else @submit.prevent="onComplete" class="space-y-4">
            <div class="text-sm text-[var(--ui-text-muted)]">Trip ID: <strong>{{ id }}</strong></div>

            <!-- Show start data read-only -->
            <div class="p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
                <div><strong>Start coords:</strong> {{ trip.start_coordinates?.[0] }}, {{ trip.start_coordinates?.[1] }}</div>
                <div><strong>Start odometer:</strong> {{ trip.start_odometer_reading }} km</div>
                <div v-if="trip.start_photo_url" class="mt-2">
                    <img :src="trip.start_photo_url"
                        class="w-full h-40 object-contain border border-[var(--ui-border)] rounded bg-[var(--ui-bg-soft)]" />
                </div>
            </div>

            <!-- End coords -->
            <div>
                <label class="block text-sm font-medium">End coordinates (lat, lng)</label>
                <div class="flex gap-2">
                    <input v-model.number="lat" type="number" step="0.000001" placeholder="Latitude"
                        class="w-1/2 rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]" />
                    <input v-model.number="lng" type="number" step="0.000001" placeholder="Longitude"
                        class="w-1/2 rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]" />
                </div>
                <div class="text-sm text-[var(--ui-text-muted)] mt-1">Or press <strong>Autofill</strong>.</div>
                <button type="button" @click="autofillCoords"
                    class="mt-2 px-3 py-2 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">Autofill
                    coords</button>
            </div>

            <div>
                <label class="block text-sm font-medium">End odometer (km)</label>
                <input v-model.number="end_odometer_reading" type="number" min="0" step="0.1" required
                    class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]" />
            </div>

            <div>
                <label class="block text-sm font-medium">End odometer photo</label>
                <input type="file" accept="image/*" @change="onImageChange($event, 'end')" />
                <img v-if="preview" :src="preview"
                    class="mt-2 w-full h-40 object-contain border border-[var(--ui-border)] rounded bg-[var(--ui-bg-soft)]" />
            </div>

            <div>
                <label class="block text-sm font-medium">User Details (optional)</label>
                <input v-model="passenger" type="text" placeholder="Name or phone"
                    class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]" />
            </div>

            <div class="flex gap-2 items-center">
                <label class="text-sm">Rating</label>
                <select v-model.number="rating"
                    class="rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]">
                    <option :value="null">—</option>
                    <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                </select>
            </div>

            <div>
                <label class="block text-sm font-medium">Comments</label>
                <textarea v-model="comments" rows="3"
                    class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]"></textarea>
            </div>

            <div>
                <label class="block text-sm font-medium">Distance (calculated)</label>
                <div class="text-lg font-medium">{{ distanceDisplay }}</div>
            </div>

            <div class="flex gap-2">
                <button type="submit" class="px-4 py-2 rounded bg-[var(--ui-primary)] text-white">Complete Trip</button>
                <button type="button" @click="saveLocal"
                    class="px-3 py-2 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">Save
                    Draft</button>
            </div>

            <div v-if="message"
                :class="['p-2 mt-2 rounded', message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800']">
                {{ message.text }}
            </div>
        </form>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const id = route.params.id;

const store = useTripsStore();
const { fetchTrip, completeTrip } = store;


const loading = ref(true);
const trip = ref(null);
const message = ref(null);

// end fields
const lat = ref(null);
const lng = ref(null);
const end_odometer_reading = ref(null);
const end_photo_file = ref(null);
const preview = ref(null);
const passenger = ref('');
const rating = ref(null);
const comments = ref('');

onMounted(async () => {
    await loadTrip();
});

async function loadTrip() {
    loading.value = true;
    message.value = null;
    try {
        const result = await fetchTrip(id);
        trip.value = result;
        if (trip.value.end_coordinates) { lat.value = trip.value.end_coordinates[0]; lng.value = trip.value.end_coordinates[1]; }
        loading.value = false;
    } catch (err) {
        message.value = { type: 'error', text: 'Failed to load trip: ' + err.message };
        // attempt to recover from local draft
        const draftRaw = localStorage.getItem('taxistand_start_draft');
        if (draftRaw) {
            try {
                const d = JSON.parse(draftRaw);
                trip.value = { ...d };
            } catch (e) { trip.value = null; }
        }
        loading.value = false;
    }
}

function onImageChange(e, which) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) { message.value = { type: 'error', text: 'Image too large (>6MB)' }; return; }
    end_photo_file.value = f;
    const reader = new FileReader();
    reader.onload = () => preview.value = reader.result;
    reader.readAsDataURL(f);
    message.value = null;
}

function autofillCoords() {
    if (!navigator.geolocation) { message.value = { type: 'error', text: 'Geolocation not supported' }; return; }
    navigator.geolocation.getCurrentPosition(pos => {
        lat.value = Number(pos.coords.latitude.toFixed(6));
        lng.value = Number(pos.coords.longitude.toFixed(6));
        message.value = { type: 'success', text: 'Coordinates filled' };
    }, err => {
        message.value = { type: 'error', text: 'Could not fetch location: ' + err.message };
    }, { enableHighAccuracy: true, timeout: 8000 });
}

const totalDistance = computed(()=>{
    if (!trip.value || trip.value.start_odometer_reading == null || end_odometer_reading.value == null) return null;
    const d = Number(end_odometer_reading.value) - Number(trip.value.start_odometer_reading);
    return d >= 0 ? d : null;
})

const distanceDisplay = computed(() => {
    if (!trip.value || trip.value.start_odometer_reading == null || end_odometer_reading.value == null) return '—';
    const d = Number(end_odometer_reading.value) - Number(trip.value.start_odometer_reading);
    return d >= 0 ? d.toFixed(2) + ' km' : 'Invalid (end < start)';
});

async function onComplete() {
    message.value = null;
    if (lat.value == null || lng.value == null) { message.value = { type: 'error', text: 'Please fill end coordinates' }; return; }
    if (end_odometer_reading.value == null) { message.value = { type: 'error', text: 'Please fill end odometer' }; return; }
    if (Number(end_odometer_reading.value) < Number(trip.value.start_odometer_reading)) { message.value = { type: 'error', text: 'End odometer < start odometer' }; return; }

    const fd = new FormData();
    fd.append('end_coordinates', JSON.stringify({ lat: lat.value, lng: lng.value }));
    fd.append('end_odometer_reading', end_odometer_reading.value);
    if (end_photo_file.value) fd.append('end_photo', end_photo_file.value);
    fd.append('passenger', passenger.value || '');
    fd.append('rating', rating.value ?? '');
    fd.append('comments', comments.value || '');

    try {
        await completeTrip(id, {
            end_coordinates: [lat.value, lng.value],
            end_odometer_reading: end_odometer_reading.value,
            passenger: passenger.value || '',
            fare: totalDistance.value * 4.5,
            end_time: new Date().toISOString(),
            complete: true
        });
        setTimeout(() => router.push('/'), 800);
    } catch (err) {
        message.value = { type: 'error', text: 'Submit failed. Draft saved locally.' };
        // save local draft to finish later
        const localKey = `taxistand_end_draft_${id}`;
        const snapshot = {
            end_coordinates: { lat: lat.value, lng: lng.value },
            end_odometer_reading: end_odometer_reading.value,
            passenger: passenger.value,
            rating: rating.value,
            comments: comments.value,
            _previewEnd: preview.value || null,
            updated_at: new Date().toISOString()
        };
        localStorage.setItem(localKey, JSON.stringify(snapshot));
    }
}

function saveLocal() {
    const localKey = `taxistand_end_draft_${id}`;
    const snapshot = {
        end_coordinates: { lat: lat.value, lng: lng.value },
        end_odometer_reading: end_odometer_reading.value,
        passenger: passenger.value,
        rating: rating.value,
        comments: comments.value,
        _previewEnd: preview.value || null,
        updated_at: new Date().toISOString()
    };
    localStorage.setItem(localKey, JSON.stringify(snapshot));
    message.value = { type: 'success', text: 'Draft saved locally.' };
}
</script>

<style scoped>
/* minimal local CSS; UI tokens handle visual theme */
</style>
