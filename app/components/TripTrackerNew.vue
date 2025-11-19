<template>
    <div class="max-w-xl mx-auto p-4 rounded-md shadow-md
              bg-[var(--ui-bg)]
              text-[var(--ui-text)]
              transition-colors duration-300">
        <h2 class="text-2xl font-semibold mb-3">TaxiStand — Trip Tracker</h2>

        <!-- Mode switch: Create new start or select in-progress -->
        <div class="mb-4 flex gap-2">
            <button
                :class="['px-3 py-2 rounded border', mode === 'new' ? 'bg-[var(--ui-primary)] text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border-[var(--ui-border)]']"
                @click="startNewTrip">
                Start New Ride
            </button>

            <button
                :class="['px-3 py-2 rounded border', mode === 'list' ? 'bg-[var(--ui-primary)] text-white' : 'bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border-[var(--ui-border)]']"
                @click="mode = 'list'">
                In-progress Trips ({{ inProgressTrips.length }})
            </button>
        </div>

        <!-- In-progress list -->
        <div v-if="mode === 'list'">
            <div v-if="inProgressTrips.length === 0"
                class="p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
                No in-progress trips. Click <strong>Start New Ride</strong>.
            </div>

            <div v-for="t in inProgressTrips" :key="t._localId"
                class="mt-3 p-3 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">
                <div class="flex justify-between items-center">
                    <div>
                        <div class="text-sm text-[var(--ui-text-muted)]">{{ t.datetime }}</div>
                        <div class="font-medium">{{ t.start_point }} → {{ t.end_point || '—' }}</div>
                        <div class="text-sm opacity-80">Start odo: {{ t.odometer_start }}</div>
                    </div>
                    <div class="flex gap-2">
                        <button class="px-2 py-1 rounded border border-[var(--ui-border)]"
                            @click="continueTrip(t._localId)">Continue</button>
                        <button class="px-2 py-1 rounded border border-[var(--ui-border)]"
                            @click="removeDraft(t._localId)">Delete</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- New / In-progress editor -->
        <form v-else @submit.prevent="onSubmit" class="space-y-4">
            <!-- Show Trip ID when editing an in-progress trip -->
            <div v-if="currentTrip._serverId || currentTrip._localId" class="text-sm text-[var(--ui-text-muted)]">
                Trip ID: <span class="font-medium">{{ currentTrip._serverId || currentTrip._localId }}</span>
            </div>

            <!-- Date & Time -->
            <div>
                <label class="block text-sm font-medium">Date & Time</label>
                <input type="datetime-local" v-model="currentTrip.datetime"
                    class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)] focus:outline-none"
                    required />
            </div>

            <!-- Start fields (only editable on start/new; read-only when continuing an in-progress after start) -->
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-sm font-medium">Start point</label>
                    <input type="text" v-model="currentTrip.start_point" :readonly="hasStarted"
                        placeholder="e.g. Bus Stand, Platform 3"
                        class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)]"
                        required />
                </div>

                <div>
                    <label class="block text-sm font-medium">Start Odometer (km)</label>
                    <input type="number" v-model.number="currentTrip.odometer_start" :readonly="hasStarted" min="0"
                        step="0.1"
                        class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)]"
                        required />
                </div>
            </div>

            <!-- Start odometer photo -->
            <div>
                <label class="block text-sm font-medium">Start Odometer Photo</label>
                <input type="file" accept="image/*" @change="onImageChange($event, 'start')"
                    class="text-[var(--ui-text)]" :disabled="hasStarted">
                <img v-if="preview.start" :src="preview.start"
                    class="mt-2 w-full h-40 object-contain border border-[var(--ui-border)] rounded bg-[var(--ui-bg-soft)]" />
            </div>

            <!-- End fields (only required when ending ride) -->
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-sm font-medium">End point</label>
                    <input type="text" v-model="currentTrip.end_point" placeholder="Fill at ride end"
                        class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)]"
                        :required="isEnding" />
                </div>

                <div>
                    <label class="block text-sm font-medium">End Odometer (km)</label>
                    <input type="number" v-model.number="currentTrip.odometer_end" min="0" step="0.1"
                        class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)]"
                        :required="isEnding" />
                </div>
            </div>

            <!-- End odometer photo -->
            <div>
                <label class="block text-sm font-medium">End Odometer Photo</label>
                <input type="file" accept="image/*" @change="onImageChange($event, 'end')" class="text-[var(--ui-text)]">
                <img v-if="preview.end" :src="preview.end"
                    class="mt-2 w-full h-40 object-contain border border-[var(--ui-border)] rounded bg-[var(--ui-bg-soft)]" />
            </div>

            <!-- Optional user + rating -->
            <div class="flex gap-2">
                <div class="flex-1">
                    <label class="block text-sm font-medium">User Details (optional)</label>
                    <input type="text" v-model="currentTrip.user_name"
                        class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)]" />
                </div>

                <div class="w-28">
                    <label class="block text-sm font-medium">Rating</label>
                    <select v-model.number="currentTrip.rating"
                        class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)]">
                        <option :value="null">—</option>
                        <option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
                    </select>
                </div>
            </div>

            <div>
                <label class="block text-sm font-medium">Comments</label>
                <textarea v-model="currentTrip.comments" rows="3"
                    class="w-full rounded p-2 bg-[var(--ui-bg-elevated)] text-[var(--ui-text)] border border-[var(--ui-border)]"
                    placeholder="Notes"></textarea>
            </div>

            <!-- Calculated distance -->
            <div>
                <label class="block text-sm font-medium">Distance (calculated)</label>
                <div class="text-lg font-medium">{{ calculatedDistance }}</div>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-2">
                <!-- When not yet started: Start Ride -->
                <button v-if="!hasStarted" type="button" @click="startRide"
                    class="px-4 py-2 rounded bg-[var(--ui-primary)] text-white">
                    Start Ride
                </button>

                <!-- When started but not ended: End Ride -->
                <button v-else type="button" @click="completeRide"
                    class="px-4 py-2 rounded bg-[var(--ui-primary)] text-white">
                    End Ride & Submit
                </button>

                <button type="button" @click="saveDraft"
                    class="px-3 py-2 rounded border border-[var(--ui-border)] bg-[var(--ui-bg-elevated)]">Save
                    Draft</button>
                <button type="button" @click="cancelEditing"
                    class="px-3 py-2 rounded border border-[var(--ui-border)]">Cancel</button>
            </div>

            <!-- Messages -->
            <div v-if="message"
                :class="['p-2 mt-2 rounded', message.type === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200']">
                {{ message.text }}
            </div>
        </form>
    </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';

// localStorage keys
const DRAFT_KEY = 'taxistand_inprogress_trips_v1';

const mode = ref('new'); // 'new' | 'list' | 'edit' (we use 'new' and 'list' toggle)
const message = ref(null);
const preview = reactive({ start: null, end: null });

// In-memory current trip object
const currentTrip = reactive({
    // internal metadata
    _localId: null,
    _serverId: null,

    // trip fields
    datetime: new Date().toISOString().slice(0, 16),
    start_point: '',
    end_point: '',
    odometer_start: null,
    odometer_end: null,
    start_coords: null,
    end_coords: null,
    user_name: '',
    rating: null,
    comments: '',
    start_photo_file: null,
    end_photo_file: null,
});

// in-progress trips loaded from localStorage (array of plain objects)
const inProgressTrips = ref([]);

// computed helpers
const hasStarted = computed(() => !!(currentTrip._serverId || currentTrip._localId) && currentTrip.odometer_start != null);
const isEnding = computed(() => hasStarted.value);

// distance display
const calculatedDistance = computed(() => {
    if (currentTrip.odometer_start == null || currentTrip.odometer_end == null) return '—';
    const diff = Number(currentTrip.odometer_end) - Number(currentTrip.odometer_start);
    return diff >= 0 ? diff.toFixed(2) + ' km' : 'Invalid (end < start)';
});

onMounted(() => {
    loadDrafts();
});

// Utilities for local id
function makeLocalId() {
    return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
}

// load drafts from localStorage
function loadDrafts() {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        inProgressTrips.value = raw ? JSON.parse(raw) : [];
    } catch (e) {
        inProgressTrips.value = [];
    }
}

// persist drafts
function saveAllDrafts() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(inProgressTrips.value));
}

// Start a new blank trip editor
function startNewTrip() {
    mode.value = 'new';
    resetCurrentTrip();
}

// Reset currentTrip reactive object
function resetCurrentTrip() {
    currentTrip._localId = null;
    currentTrip._serverId = null;
    currentTrip.datetime = new Date().toISOString().slice(0, 16);
    currentTrip.start_point = '';
    currentTrip.end_point = '';
    currentTrip.odometer_start = null;
    currentTrip.odometer_end = null;
    currentTrip.start_coords = null;
    currentTrip.end_coords = null;
    currentTrip.user_name = '';
    currentTrip.rating = null;
    currentTrip.comments = '';
    currentTrip.start_photo_file = null;
    currentTrip.end_photo_file = null;
    preview.start = preview.end = null;
    message.value = null;
}

// Continue an in-progress trip (load into editor)
function continueTrip(localId) {
    const found = inProgressTrips.value.find(t => t._localId === localId);
    if (!found) {
        message.value = { type: 'error', text: 'Draft not found' };
        return;
    }
    // copy fields into reactive currentTrip
    currentTrip._localId = found._localId;
    currentTrip._serverId = found._serverId || null;
    currentTrip.datetime = found.datetime;
    currentTrip.start_point = found.start_point;
    currentTrip.end_point = found.end_point || '';
    currentTrip.odometer_start = found.odometer_start;
    currentTrip.odometer_end = found.odometer_end || null;
    currentTrip.start_coords = found.start_coords || null;
    currentTrip.end_coords = found.end_coords || null;
    currentTrip.user_name = found.user_name || '';
    currentTrip.rating = found.rating || null;
    currentTrip.comments = found.comments || '';
    // previews cannot store File objects; keep any stored preview data if present
    preview.start = found._previewStart || null;
    preview.end = found._previewEnd || null;

    mode.value = 'new'; // editor view
    message.value = null;
}

// remove a draft
function removeDraft(localId) {
    inProgressTrips.value = inProgressTrips.value.filter(t => t._localId !== localId);
    saveAllDrafts();
    loadDrafts();
}

// Save draft (both for start stage and end stage)
function saveDraft() {
    // Create a shallow snapshot for storage (remove file blobs)
    const snapshot = {
        _localId: currentTrip._localId || makeLocalId(),
        _serverId: currentTrip._serverId || null,
        datetime: currentTrip.datetime,
        start_point: currentTrip.start_point,
        end_point: currentTrip.end_point,
        odometer_start: currentTrip.odometer_start,
        odometer_end: currentTrip.odometer_end,
        start_coords: currentTrip.start_coords,
        end_coords: currentTrip.end_coords,
        user_name: currentTrip.user_name,
        rating: currentTrip.rating,
        comments: currentTrip.comments,
        // small base64 preview strings (if any) so UI shows previews when resuming
        _previewStart: preview.start || null,
        _previewEnd: preview.end || null,
    };

    // replace or push
    const idx = inProgressTrips.value.findIndex(t => t._localId === snapshot._localId);
    if (idx >= 0) inProgressTrips.value[idx] = snapshot;
    else inProgressTrips.value.unshift(snapshot);

    saveAllDrafts();
    loadDrafts();
    // ensure currentTrip has local id stored
    currentTrip._localId = snapshot._localId;
    message.value = { type: 'success', text: 'Draft saved locally.' };
}

// handle image inputs
function onImageChange(e, which) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) { message.value = { type: 'error', text: 'Image too large (>6MB).' }; return; }
    // set file blob in reactive object
    if (which === 'start') currentTrip.start_photo_file = file;
    else currentTrip.end_photo_file = file;

    // preview
    const reader = new FileReader();
    reader.onload = () => {
        preview[which] = reader.result;
    };
    reader.readAsDataURL(file);
    message.value = null;
}

// START RIDE: called before ride begins (create)
async function startRide() {
    // validation for start stage
    if (!currentTrip.start_point) { message.value = { type: 'error', text: 'Please enter start point.' }; return; }
    if (currentTrip.odometer_start == null) { message.value = { type: 'error', text: 'Please enter start odometer reading.' }; return; }

    // build payload (FormData)
    const fd = new FormData();
    fd.append('datetime', currentTrip.datetime);
    fd.append('start_point', currentTrip.start_point);
    fd.append('odometer_start', currentTrip.odometer_start);
    if (currentTrip.start_coords) fd.append('start_coords', JSON.stringify(currentTrip.start_coords));
    if (currentTrip.start_photo_file) fd.append('start_photo', currentTrip.start_photo_file);

    // optimistic local save
    const localId = currentTrip._localId || makeLocalId();
    currentTrip._localId = localId;

    // try POST to server
    try {
        const res = await fetch('/api/trips', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Server error: ' + res.status);
        const json = await res.json();
        currentTrip._serverId = json.id || json.tripId || null;

        // persist in drafts as in-progress
        saveDraft();
        message.value = { type: 'success', text: 'Ride started and saved (server).' };
    } catch (err) {
        // fallback: save locally only
        saveDraft();
        message.value = { type: 'success', text: 'Offline: Ride started locally (will sync later).' };
    }
}

// COMPLETE RIDE: called after ride ends (edit)
async function completeRide() {
    // validations for end stage
    if (!currentTrip.end_point) { message.value = { type: 'error', text: 'Please enter end point.' }; return; }
    if (currentTrip.odometer_end == null) { message.value = { type: 'error', text: 'Please enter end odometer reading.' }; return; }
    if (Number(currentTrip.odometer_end) < Number(currentTrip.odometer_start)) { message.value = { type: 'error', text: 'End odometer cannot be less than start.' }; return; }

    const fd = new FormData();
    fd.append('odometer_end', currentTrip.odometer_end);
    fd.append('end_point', currentTrip.end_point);
    if (currentTrip.end_coords) fd.append('end_coords', JSON.stringify(currentTrip.end_coords));
    if (currentTrip.end_photo_file) fd.append('end_photo', currentTrip.end_photo_file);
    fd.append('user_name', currentTrip.user_name || '');
    fd.append('rating', currentTrip.rating ?? '');
    fd.append('comments', currentTrip.comments || '');

    // If we have a server id, PATCH; otherwise attempt PATCH with local id or POST complete to server
    const serverId = currentTrip._serverId;
    const localId = currentTrip._localId;

    try {
        let res;
        if (serverId) {
            res = await fetch(`/api/trips/${serverId}`, { method: 'PATCH', body: fd });
        } else {
            // If not created on server earlier, try sending a "complete" POST with the whole trip so server can create a full record
            // include start fields too
            fd.append('datetime', currentTrip.datetime);
            fd.append('start_point', currentTrip.start_point);
            fd.append('odometer_start', currentTrip.odometer_start);
            res = await fetch('/api/trips/complete', { method: 'POST', body: fd });
        }

        if (!res.ok) throw new Error('Server error: ' + res.status);
        const json = await res.json();

        // remove draft locally on successful server completion
        if (localId) {
            inProgressTrips.value = inProgressTrips.value.filter(t => t._localId !== localId);
            saveAllDrafts();
        }

        resetCurrentTrip();
        message.value = { type: 'success', text: 'Ride completed and submitted.' };
        loadDrafts();
    } catch (err) {
        // fallback: save as draft (still in-progress), inform user
        saveDraft();
        message.value = { type: 'success', text: 'Offline: Ride data saved locally. Sync later.' };
    }
}

// submit handler (delegates to start or complete depending on state)
function onSubmit() {
    if (!hasStarted.value) startRide();
    else completeRide();
}

// cancel editing - just reset and go to list
function cancelEditing() {
    resetCurrentTrip();
    mode.value = 'list';
}

</script>

<style scoped>
/* rely on Nuxt UI tokens for main styling; keep small helpers here if needed */
</style>
