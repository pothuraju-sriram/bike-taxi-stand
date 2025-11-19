// stores/trips.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import tripsListMock from "../assets/mock/trips-list-mock.json";

export type Trip = {
  id: number;
  start_coordinates?: number[];
  end_coordinates?: number[];
  start_time: string;
  end_time?: string;
  start_odometer_reading?: number;
  end_odometer_reading?: number;
  passenger: string;
  fare?: number;
  completed: boolean;
};

export const useTripsStore = defineStore("trips", () => {
  const trips = ref<Trip[]>([]);
  const loading = ref(false);

  const inProgress = computed(() => trips.value.filter((r) => !r.completed));
  const closed = computed(() => trips.value.filter((r) => r.completed));

  async function loadTrips() {
    loading.value = true;
    setTimeout(() => {
      loading.value = false;
      trips.value = tripsListMock;
    }, 1500);
  }

  async function startNewTrip(payload: {
    start_coordinates?: number[];
    passenger?: string;
    start_odometer_reading?: number;
  }): Promise<string> {
    trips.value.push({
      id: trips.value.length + 1,
      start_time: new Date().toISOString(),
      start_coordinates: payload.start_coordinates,
      start_odometer_reading: payload.start_odometer_reading,
      completed: false,
      passenger: payload?.passenger || "Unknown passenger",
    });
    return String(trips.value.length);
  }

  async function completeTrip(
    id: string,
    payload: {
      end_coordinates?: number[];
      end_odometer_reading?: number;
      end_time?: string;
      fare?: number;
      passenger: string;
      complete: boolean;
    }
  ): Promise<void> {
    const trip = trips.value.find((r) => String(r.id) === id);
    if (trip) {
      trip.completed = true;
      trip.end_time = new Date().toISOString();
      trip.end_odometer_reading = payload.end_odometer_reading;
      trip.end_coordinates = payload.end_coordinates;
      trip.fare = payload.fare;
      trip.passenger = payload.passenger;
    }
  }

  async function fetchTrip(id: string): Promise<Trip | null> {
    const trip = trips.value.find((r) => String(r.id) === id);
    return trip || null;
  }

  return {
    trips,
    loading,
    inProgress,
    closed,
    loadTrips,
    startNewTrip,
    completeTrip,
    fetchTrip,
  };
});
