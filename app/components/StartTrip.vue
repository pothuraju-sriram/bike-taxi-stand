<template>
    <div class="max-w-xl mx-auto p-4 rounded-md shadow-md
              bg-[var(--ui-bg)] text-[var(--ui-text)] transition-colors duration-300">
        <h2 class="text-2xl font-semibold mb-3">Start Trip</h2>

        <form @submit.prevent="onStart" class="space-y-4">
            <div>
                <label class="block text-sm font-medium">Start coordinates (lat, lng)</label>
                <div class="flex gap-2">
                    <input v-model.number="lat" type="number" step="0.000001" placeholder="Latitude"
                        class="w-1/2 rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]" />
                    <input v-model.number="lng" type="number" step="0.000001" placeholder="Longitude"
                        class="w-1/2 rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]" />
                </div>
                <div class="text-sm text-[var(--ui-text-muted)] mt-1">Or press <strong>Autofill</strong>.</div>
            </div>

            <div class="flex items-center gap-2">
                <button type="button" @click="autofillCoords"
                    class="px-3 py-2 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
                    Autofill coords
                </button>
            </div>

            <div>
                <label class="block text-sm font-medium">Start odometer (km)</label>
                <input v-model.number="odometer_start" type="number" min="0" step="0.1" required
                    class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] border border-[var(--ui-border)]" />
            </div>

            <div>
                <label class="block text-sm font-medium">Start odometer photo</label>
                <input type="file" accept="image/*" @change="onImageChange($event, 'start')" />
                <img v-if="preview" :src="preview"
                    class="mt-2 w-full h-40 object-contain border border-[var(--ui-border)] rounded bg-[var(--ui-bg-soft)]" />
            </div>

            <div class="flex gap-2">
                <button type="submit" class="px-4 py-2 rounded bg-[var(--ui-primary)] text-white">Start Trip</button>
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const lat = ref(null);
const lng = ref(null);
const odometer_start = ref(null);
const start_photo_file = ref(null);
const preview = ref(null);
const message = ref(null);

const router = useRouter();

function onImageChange(e, which) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.size > 6 * 1024 * 1024) { message.value = { type: 'error', text: 'Image too large (>6MB)' }; return; }
    start_photo_file.value = f;
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

async function onStart() {
    message.value = null;
    if (lat.value == null || lng.value == null) { message.value = { type: 'error', text: 'Please provide start coordinates' }; return; }
    if (odometer_start.value == null) { message.value = { type: 'error', text: 'Please provide start odometer' }; return; }

    const fd = new FormData();
    fd.append('start_coords', JSON.stringify({ lat: lat.value, lng: lng.value }));
    fd.append('odometer_start', odometer_start.value);
    if (start_photo_file.value) fd.append('start_photo', start_photo_file.value);

    try {
        const res = await fetch('/api/trips', { method: 'POST', body: fd });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Server error');
        }
        const json = await res.json();
        const id = json.id;
        message.value = { type: 'success', text: 'Trip started (id: ' + id + '). Redirecting to end page...' };
        // short delay for UX then navigate to end page
        setTimeout(() => router.push(`/trips/${id}/end`), 700);
    } catch (err) {
        // fallback: save minimal local draft and show id placeholder
        const localDraft = {
            _localId: 'local-' + Date.now(),
            start_coords: { lat: lat.value, lng: lng.value },
            odometer_start: odometer_start.value,
            _previewStart: preview.value || null,
            created_at: new Date().toISOString()
        };
        localStorage.setItem('taxistand_start_draft', JSON.stringify(localDraft));
        message.value = { type: 'error', text: 'Start failed (offline). Draft saved locally.' };
    }
}

function saveLocal() {
    const localDraft = {
        _localId: 'local-' + Date.now(),
        start_coords: { lat: lat.value, lng: lng.value },
        odometer_start: odometer_start.value,
        _previewStart: preview.value || null,
        created_at: new Date().toISOString()
    };
    localStorage.setItem('taxistand_start_draft', JSON.stringify(localDraft));
    message.value = { type: 'success', text: 'Draft saved locally.' };
}
</script>

<style scoped>
/* rely on Nuxt UI tokens for color; keep small help styles here */
</style>
