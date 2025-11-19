<template>
    <div class="max-w-xl mx-auto p-4 rounded-md shadow-md
            bg-[var(--ui-bg)]
            text-[var(--ui-text)]
            border border-[var(--ui-border)]">
        <h2 class="text-2xl font-semibold mb-3">TaxiStand — Trip Tracker</h2>

        <form @submit.prevent="submit" class="space-y-4">
            <div>
                <label class="block text-sm font-medium">Date & Time</label>
                <input type="datetime-local" v-model="form.datetime" class="w-full border rounded p-2" required />
            </div>

            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-sm font-medium">Start point</label>
                    <input type="text" v-model="form.start_point" placeholder="e.g. Bus Stand, Platform 3"
                        class="w-full border rounded p-2" required />
                </div>
                <div class="flex-1">
                    <label class="block text-sm font-medium">End point</label>
                    <input type="text" v-model="form.end_point" placeholder="e.g. Station exit"
                        class="w-full border rounded p-2" required />
                </div>
            </div>

            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-sm font-medium">Start odometer (km)</label>
                    <input type="number" v-model.number="form.odometer_start" class="w-full border rounded p-2" min="0"
                        step="0.1" required />
                </div>
                <div class="flex-1">
                    <label class="block text-sm font-medium">End odometer (km)</label>
                    <input type="number" v-model.number="form.odometer_end" class="w-full border rounded p-2" min="0"
                        step="0.1" required />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium">Start odometer photo</label>
                    <input type="file" accept="image/*" @change="onImageChange($event, 'start')" />
                    <img v-if="preview.start" :src="preview.start"
                        class="mt-2 w-full h-40 object-contain border rounded" />
                </div>
                <div>
                    <label class="block text-sm font-medium">End odometer photo</label>
                    <input type="file" accept="image/*" @change="onImageChange($event, 'end')" />
                    <img v-if="preview.end" :src="preview.end" class="mt-2 w-full h-40 object-contain border rounded" />
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium">User details (optional)</label>
                <input type="text" v-model="form.user_name" placeholder="Name or phone (optional)"
                    class="w-full border rounded p-2" />
            </div>

            <div>
                <label class="block text-sm font-medium">Distance recorded (calculated)</label>
                <div class="text-lg font-medium">{{ calculatedDistance }} km</div>
            </div>

            <div>
                <label class="block text-sm font-medium">Experience rating</label>
                <div class="flex gap-2 items-center">
                    <label v-for="n in 5" :key="n" class="flex items-center gap-1">
                        <input type="radio" :value="n" v-model.number="form.rating" />
                        <span>{{ n }}</span>
                    </label>
                    <span class="text-sm text-gray-500 ml-3">({{ form.rating || 0 }})</span>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium">Comments</label>
                <textarea v-model="form.comments" rows="3" class="w-full border rounded p-2"
                    placeholder="What went well? Any issues?"></textarea>
            </div>

            <div class="flex gap-2">
                <button type="button" @click="fillGeo" class="px-3 py-2 border rounded">Autofill coords</button>
                <button type="button" @click="saveDraft" class="px-3 py-2 border rounded">Save Draft</button>
                <button type="submit" class="ml-auto px-4 py-2 bg-blue-600 text-white rounded">Submit Trip</button>
            </div>

            <div v-if="message"
                :class="['p-2 mt-2 rounded', message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800']">
                {{ message.text }}
            </div>
        </form>
    </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';

const STORAGE_KEY = 'taxistand_trip_draft_v1';

const form = reactive({
    datetime: new Date().toISOString().slice(0, 16),
    start_point: '',
    end_point: '',
    odometer_start: null,
    odometer_end: null,
    user_name: '',
    rating: null,
    comments: '',
    start_photo_file: null,
    end_photo_file: null,
    start_coords: null,
    end_coords: null,
});

const preview = reactive({ start: null, end: null });
const message = ref(null);

onMounted(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            const saved = JSON.parse(raw);
            Object.assign(form, saved);
            // previews won't persist file blobs - only when user re-adds
        } catch (e) { /* ignore */ }
    }
});

function onImageChange(e, which) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        message.value = { type: 'error', text: 'Image too large (>5MB). Please compress.' };
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        preview[which] = reader.result;
    };
    reader.readAsDataURL(file);
    if (which === 'start') { form.start_photo_file = file; }
    else { form.end_photo_file = file; }
    message.value = null;
}

const calculatedDistance = computed(() => {
    if (form.odometer_start == null || form.odometer_end == null) return '—';
    const diff = Number(form.odometer_end) - Number(form.odometer_start);
    return diff >= 0 ? diff.toFixed(2) : 'Invalid (end < start)';
});

function saveDraft() {
    const copy = { ...form };
    // remove file blobs before saving draft
    copy.start_photo_file = null;
    copy.end_photo_file = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
    message.value = { type: 'success', text: 'Draft saved locally.' };
}

// Autofil geolocation (best-effort)
async function fillGeo() {
    if (!navigator.geolocation) {
        message.value = { type: 'error', text: 'Geolocation not supported in this browser.' };
        return;
    }
    message.value = { type: 'success', text: 'Requesting location — allow the browser prompt.' };
    navigator.geolocation.getCurrentPosition((pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        // Fill start or end if empty — simple toggle behavior
        if (!form.start_coords) form.start_coords = coords;
        else form.end_coords = coords;
        message.value = { type: 'success', text: 'Coordinates recorded.' };
    }, (err) => {
        message.value = { type: 'error', text: 'Could not get location: ' + err.message };
    }, { enableHighAccuracy: true, timeout: 8000 });
}

async function submit() {
    message.value = null;

    // Basic validation
    if (!form.start_point || !form.end_point) {
        message.value = { type: 'error', text: 'Please fill start and end points.' };
        return;
    }
    if (form.odometer_start == null || form.odometer_end == null) {
        message.value = { type: 'error', text: 'Please provide odometer readings.' };
        return;
    }
    if (Number(form.odometer_end) < Number(form.odometer_start)) {
        message.value = { type: 'error', text: 'End odometer cannot be less than start.' };
        return;
    }

    // Build payload
    const fd = new FormData();
    fd.append('datetime', form.datetime);
    fd.append('start_point', form.start_point);
    fd.append('end_point', form.end_point);
    fd.append('odometer_start', form.odometer_start);
    fd.append('odometer_end', form.odometer_end);
    fd.append('user_name', form.user_name || '');
    fd.append('rating', form.rating ?? '');
    fd.append('comments', form.comments || '');
    fd.append('start_coords', form.start_coords ? JSON.stringify(form.start_coords) : '');
    fd.append('end_coords', form.end_coords ? JSON.stringify(form.end_coords) : '');
    if (form.start_photo_file) fd.append('start_photo', form.start_photo_file);
    if (form.end_photo_file) fd.append('end_photo', form.end_photo_file);
    try {
        const res = await fetch('/api/trips', {
            method: 'POST',
            body: fd,
        });
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt || 'Server error');
        }
        await res.json();
        // clear local draft + form
        localStorage.removeItem(STORAGE_KEY);
        Object.assign(form, {
            datetime: new Date().toISOString().slice(0, 16),
            start_point: '',
            end_point: '',
            odometer_start: null,
            odometer_end: null,
            user_name: '',
            rating: null,
            comments: '',
            start_photo_file: null,
            end_photo_file: null,
            start_coords: null,
            end_coords: null,
        });
        preview.start = preview.end = null;
        message.value = { type: 'success', text: 'Trip submitted successfully.' };
    } catch (err) {
        message.value = { type: 'error', text: 'Submit failed: ' + err.message };
    }
}
</script>

<style scoped>
/* Keep simple. If you use Tailwind, most classes above will style the UI. */
</style>
