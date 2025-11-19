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
                <div><strong>Start coords:</strong> {{ trip.start_coords?.lat }}, {{ trip.start_coords?.lng }}</div>
                <div><strong>Start odometer:</strong> {{ trip.odometer_start }} km</div>
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
                <input v-model.number="odometer_end" type="number" min="0" step="0.1" required
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
                <input v-model="user_name" type="text" placeholder="Name or phone"
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

const loading = ref(true);
const trip = ref(null);
const message = ref(null);

// end fields
const lat = ref(null);
const lng = ref(null);
const odometer_end = ref(null);
const end_photo_file = ref(null);
const preview = ref(null);
const user_name = ref('');
const rating = ref(null);
const comments = ref('');

onMounted(async () => {
    await loadTrip();
});

async function loadTrip() {
    loading.value = true;
    message.value = null;
    try {
        const res = await fetch(`/api/trips/${id}`);
        if (res.status === 404) { trip.value = null; loading.value = false; return; }
        if (!res.ok) throw new Error('Server error');
        trip.value = await res.json();
        // prefill lat/lng if available for convenience
        if (trip.value.end_coords) { lat.value = trip.value.end_coords.lat; lng.value = trip.value.end_coords.lng; }
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

const distanceDisplay = computed(() => {
    if (!trip.value || trip.value.odometer_start == null || odometer_end.value == null) return '—';
    const d = Number(odometer_end.value) - Number(trip.value.odometer_start);
    return d >= 0 ? d.toFixed(2) + ' km' : 'Invalid (end < start)';
});

async function onComplete() {
    message.value = null;
    if (lat.value == null || lng.value == null) { message.value = { type: 'error', text: 'Please fill end coordinates' }; return; }
    if (odometer_end.value == null) { message.value = { type: 'error', text: 'Please fill end odometer' }; return; }
    if (Number(odometer_end.value) < Number(trip.value.odometer_start)) { message.value = { type: 'error', text: 'End odometer < start odometer' }; return; }

    const fd = new FormData();
    fd.append('end_coords', JSON.stringify({ lat: lat.value, lng: lng.value }));
    fd.append('odometer_end', odometer_end.value);
    if (end_photo_file.value) fd.append('end_photo', end_photo_file.value);
    fd.append('user_name', user_name.value || '');
    fd.append('rating', rating.value ?? '');
    fd.append('comments', comments.value || '');

    try {
        const res = await fetch(`/api/trips/${id}`, { method: 'PATCH', body: fd });
        if (!res.ok) throw new Error('Server error');
        const json = await res.json();
        message.value = { type: 'success', text: 'Trip completed.' };
        // optional: redirect to a summary or home
        setTimeout(() => router.push('/'), 800);
    } catch (err) {
        message.value = { type: 'error', text: 'Submit failed. Draft saved locally.' };
        // save local draft to finish later
        const localKey = `taxistand_end_draft_${id}`;
        const snapshot = {
            end_coords: { lat: lat.value, lng: lng.value },
            odometer_end: odometer_end.value,
            user_name: user_name.value,
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
        end_coords: { lat: lat.value, lng: lng.value },
        odometer_end: odometer_end.value,
        user_name: user_name.value,
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
