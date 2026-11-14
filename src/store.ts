import { create } from 'zustand';
import {
  ACT1_BOSS_ID,
  FINAL_BOSS_ID,
  getBuiltRaceTrack,
  getProgressionStatus,
  getScaledPayout,
  isTrackUnlocked,
  RaceCompletionRecord,
} from './utils/raceTracks';
import { CAR_CATALOG } from './utils/carCatalog';
import { TURNTABLE_CONFIG } from './utils/turntableConfig';

export type ViewState = 'MENU' | 'GARAGE' | 'CAREER' | 'FREE_ROAM' | 'RACE' | 'CAR_LOT';

export interface CarBuildConfig {
  color: string;
  wheelsColor: string;
  speedLevel: number;
  accelLevel: number;
  handlingLevel: number;
  vinyl: 'none' | 'stripes' | 'flames';
}

interface PersistedSaveData {
  cash: number;
  driverAlias: string;
  autoOrbitCam: boolean;
  ownedCarIds: string[];
  selectedCarId: string;
  cars: Record<string, CarBuildConfig>;
  completedRaces: Record<string, RaceCompletionRecord>;
}

const SAVE_STORAGE_KEY = 'neon_apex_progression_v1';

const DEFAULT_CARS: Record<string, CarBuildConfig> = {
  apex_gt: {
    color: '#dc2626',
    wheelsColor: '#27272a',
    speedLevel: 1,
    accelLevel: 1,
    handlingLevel: 1,
    vinyl: 'none',
  },
  shinobi_rx: {
    color: '#059669',
    wheelsColor: '#e4e4e7',
    speedLevel: 1,
    accelLevel: 1,
    handlingLevel: 1,
    vinyl: 'none',
  },
  vanguard_v12: {
    color: '#d97706',
    wheelsColor: '#18181b',
    speedLevel: 1,
    accelLevel: 1,
    handlingLevel: 1,
    vinyl: 'none',
  },
};

function loadSavedProgress(): PersistedSaveData {
  const fallback: PersistedSaveData = {
    cash: 1500,
    driverAlias: 'NIGHT_RUNNER',
    autoOrbitCam: true,
    ownedCarIds: ['apex_gt'],
    selectedCarId: 'apex_gt',
    cars: { ...DEFAULT_CARS },
    completedRaces: {},
  };

  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw) as Partial<PersistedSaveData> & { car?: CarBuildConfig };
    const ownedCarIds =
      Array.isArray(parsed.ownedCarIds) && parsed.ownedCarIds.length > 0
        ? parsed.ownedCarIds
        : ['apex_gt'];

    const selectedCarId =
      typeof parsed.selectedCarId === 'string' && ownedCarIds.includes(parsed.selectedCarId)
        ? parsed.selectedCarId
        : ownedCarIds[0];

    const cars: Record<string, CarBuildConfig> = {
      apex_gt: { ...DEFAULT_CARS.apex_gt, ...(parsed.cars?.apex_gt ?? parsed.car ?? {}) },
      shinobi_rx: { ...DEFAULT_CARS.shinobi_rx, ...(parsed.cars?.shinobi_rx ?? {}) },
      vanguard_v12: { ...DEFAULT_CARS.vanguard_v12, ...(parsed.cars?.vanguard_v12 ?? {}) },
    };

    return {
      cash: typeof parsed.cash === 'number' && Number.isFinite(parsed.cash) ? parsed.cash : 1500,
      driverAlias:
        typeof parsed.driverAlias === 'string' && parsed.driverAlias.trim().length > 0
          ? parsed.driverAlias.trim().slice(0, 18).toUpperCase()
          : 'NIGHT_RUNNER',
      autoOrbitCam: typeof parsed.autoOrbitCam === 'boolean' ? parsed.autoOrbitCam : true,
      ownedCarIds,
      selectedCarId,
      cars,
      completedRaces:
        parsed.completedRaces && typeof parsed.completedRaces === 'object'
          ? parsed.completedRaces
          : {},
    };
  } catch {
    return fallback;
  }
}

function persistProgress(data: PersistedSaveData) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota / private-browsing errors cleanly
  }
}

export interface GameState {
  view: ViewState;
  previousView: ViewState;
  cash: number;
  driverAlias: string;
  autoOrbitCam: boolean;
  ownedCarIds: string[];
  selectedCarId: string;
  cars: Record<string, CarBuildConfig>;
  car: CarBuildConfig;
  raceState: 'idle' | 'countdown' | 'racing' | 'finished';
  raceSessionId: number;
  countdownValue: 3 | 2 | 1 | 0 | null;
  activeTrackId: string;
  raceTime: number;
  raceStartTime: number;
  raceDistance: number;
  raceLaps: number;
  raceTitle: string;
  raceIsBoss: boolean;
  raceParticipantCount: number;
  racePlacement: number;
  baseReward: number;
  currentReward: number;
  currentSpeed: number;
  justUnlockedAct2: boolean;
  justCompletedGame: boolean;
  isPaused: boolean;
  completedRaces: Record<string, RaceCompletionRecord>;

  pauseStartTimestamp: number;
  turntableResetId: number;
  isTransitionFading: boolean;

  // Actions
  setView: (view: ViewState) => void;
  openCarLot: (fromView?: ViewState) => void;
  setDriverAlias: (alias: string) => void;
  setAutoOrbitCam: (enabled: boolean) => void;
  addCash: (amount: number) => void;
  spendCash: (amount: number) => boolean;
  buyCar: (carId: string) => boolean;
  selectCar: (carId: string) => void;
  updateCarColor: (part: 'color' | 'wheelsColor', color: string) => void;
  updateVinyl: (vinyl: 'none' | 'stripes' | 'flames') => void;
  upgradeStat: (stat: 'speedLevel' | 'accelLevel' | 'handlingLevel', cost: number) => boolean;
  startRace: (trackId: string) => boolean;
  setCountdownValue: (value: 3 | 2 | 1 | 0 | null) => void;
  beginRaceGo: () => void;
  finishRace: (placement?: number) => void;
  setCurrentSpeed: (speed: number) => void;
  togglePause: () => void;
  resumeRace: () => void;
  restartRace: () => void;
  resetProgression: () => void;
  resetTurntableShowcase: () => void;
  setTransitionFading: (fading: boolean) => void;

  // Developer Override Actions
  setCash: (amount: number) => void;
  setCarStat: (stat: 'speedLevel' | 'accelLevel' | 'handlingLevel', level: number, carId?: string) => void;
  maxOutCar: (carId?: string) => void;
  resetCarStats: (carId?: string) => void;
  unlockAllCars: () => void;
  unlockAct2Dev: () => void;
  completeAllRacesDev: () => void;
  toggleRaceCompletedDev: (trackId: string) => void;
  instantWinCurrentRace: () => void;
}

const saved = loadSavedProgress();
const initialTrack = getBuiltRaceTrack('act1-r1');

export const useGameStore = create<GameState>((set, get) => ({
  view: 'MENU',
  previousView: 'MENU',
  cash: saved.cash,
  driverAlias: saved.driverAlias,
  autoOrbitCam: saved.autoOrbitCam,
  ownedCarIds: saved.ownedCarIds,
  selectedCarId: saved.selectedCarId,
  cars: saved.cars,
  car: saved.cars[saved.selectedCarId] ?? DEFAULT_CARS.apex_gt,
  raceState: 'idle',
  raceSessionId: 0,
  countdownValue: null,
  activeTrackId: initialTrack.id,
  raceTime: 0,
  raceStartTime: 0,
  raceDistance: Math.round(initialTrack.totalLength * initialTrack.laps),
  raceLaps: initialTrack.laps,
  raceTitle: initialTrack.title,
  raceIsBoss: initialTrack.isBoss,
  raceParticipantCount: initialTrack.isBoss ? 2 : 3,
  racePlacement: 3,
  baseReward: initialTrack.reward,
  currentReward: initialTrack.reward,
  currentSpeed: 0,
  justUnlockedAct2: false,
  justCompletedGame: false,
  isPaused: false,
  pauseStartTimestamp: 0,
  completedRaces: saved.completedRaces,
  turntableResetId: 0,
  isTransitionFading: false,

  setTransitionFading: (fading) => set({ isTransitionFading: fading }),

  resetTurntableShowcase: () => {
    set((state) => ({
      turntableResetId: state.turntableResetId + 1,
      isTransitionFading: true,
    }));
    setTimeout(() => {
      get().setTransitionFading(false);
    }, TURNTABLE_CONFIG.transitionDurationMs);
  },

  setView: (view) =>
    set((state) => {
      const isEnteringMenu = view === 'MENU' && state.view !== 'MENU';
      const nextTurntableResetId = isEnteringMenu
        ? state.turntableResetId + 1
        : state.turntableResetId;
      const nextIsTransitionFading = isEnteringMenu ? true : state.isTransitionFading;

      if (isEnteringMenu) {
        setTimeout(() => {
          get().setTransitionFading(false);
        }, TURNTABLE_CONFIG.transitionDurationMs);
      }

      return {
        previousView: state.view !== 'CAR_LOT' ? state.view : state.previousView,
        view,
        turntableResetId: nextTurntableResetId,
        isTransitionFading: nextIsTransitionFading,
        raceState: 'idle',
        countdownValue: null,
        currentSpeed: 0,
        justUnlockedAct2: false,
        justCompletedGame: false,
        isPaused: false,
      };
    }),

  openCarLot: (fromView) =>
    set((state) => ({
      previousView: fromView ?? (state.view !== 'CAR_LOT' ? state.view : 'MENU'),
      view: 'CAR_LOT',
      raceState: 'idle',
      countdownValue: null,
      currentSpeed: 0,
      isPaused: false,
    })),

  setDriverAlias: (alias) =>
    set((state) => {
      const cleaned = alias.trim().slice(0, 18).toUpperCase() || 'NIGHT_RUNNER';
      persistProgress({
        cash: state.cash,
        driverAlias: cleaned,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: state.completedRaces,
      });
      return { driverAlias: cleaned };
    }),

  setAutoOrbitCam: (enabled) =>
    set((state) => {
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: enabled,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: state.completedRaces,
      });
      return { autoOrbitCam: enabled };
    }),

  addCash: (amount) =>
    set((state) => {
      const cash = state.cash + amount;
      persistProgress({
        cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: state.completedRaces,
      });
      return { cash };
    }),

  spendCash: (amount) => {
    const state = get();
    if (state.cash >= amount) {
      const cash = state.cash - amount;
      persistProgress({
        cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: state.completedRaces,
      });
      set({ cash });
      return true;
    }
    return false;
  },

  buyCar: (carId: string) => {
    const target = CAR_CATALOG[carId];
    if (!target) return false;

    const state = get();
    if (state.ownedCarIds.includes(carId)) {
      get().selectCar(carId);
      return true;
    }

    if (state.cash < target.price) {
      return false;
    }

    const nextCash = state.cash - target.price;
    const nextOwned = [...state.ownedCarIds, carId];
    const nextCars = {
      ...state.cars,
      [carId]: state.cars[carId] ?? {
        color: target.defaultColor,
        wheelsColor: target.defaultWheelsColor,
        speedLevel: 1,
        accelLevel: 1,
        handlingLevel: 1,
        vinyl: 'none',
      },
    };

    persistProgress({
      cash: nextCash,
      driverAlias: state.driverAlias,
      autoOrbitCam: state.autoOrbitCam,
      ownedCarIds: nextOwned,
      selectedCarId: carId,
      cars: nextCars,
      completedRaces: state.completedRaces,
    });

    set({
      cash: nextCash,
      ownedCarIds: nextOwned,
      selectedCarId: carId,
      cars: nextCars,
      car: nextCars[carId],
    });
    return true;
  },

  selectCar: (carId: string) =>
    set((state) => {
      if (!state.ownedCarIds.includes(carId)) return state;
      const activeCar = state.cars[carId] ?? DEFAULT_CARS[carId] ?? DEFAULT_CARS.apex_gt;
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: carId,
        cars: state.cars,
        completedRaces: state.completedRaces,
      });
      return {
        selectedCarId: carId,
        car: activeCar,
      };
    }),

  updateCarColor: (part, color) =>
    set((state) => {
      const activeCar = { ...state.car, [part]: color };
      const nextCars = { ...state.cars, [state.selectedCarId]: activeCar };
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: nextCars,
        completedRaces: state.completedRaces,
      });
      return { car: activeCar, cars: nextCars };
    }),

  updateVinyl: (vinyl) =>
    set((state) => {
      const activeCar = { ...state.car, vinyl };
      const nextCars = { ...state.cars, [state.selectedCarId]: activeCar };
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: nextCars,
        completedRaces: state.completedRaces,
      });
      return { car: activeCar, cars: nextCars };
    }),

  upgradeStat: (stat, cost) => {
    const { cash, driverAlias, autoOrbitCam, car, cars, selectedCarId, ownedCarIds, completedRaces } = get();
    if (cash >= cost && car[stat] < 5) {
      const nextCash = cash - cost;
      const nextCar = { ...car, [stat]: car[stat] + 1 };
      const nextCars = { ...cars, [selectedCarId]: nextCar };
      persistProgress({
        cash: nextCash,
        driverAlias,
        autoOrbitCam,
        ownedCarIds,
        selectedCarId,
        cars: nextCars,
        completedRaces,
      });
      set({ cash: nextCash, car: nextCar, cars: nextCars });
      return true;
    }
    return false;
  },

  startRace: (trackId) => {
    const { completedRaces, raceSessionId } = get();
    if (!isTrackUnlocked(trackId, completedRaces).unlocked) {
      return false;
    }
    const track = getBuiltRaceTrack(trackId);
    set({
      view: 'RACE',
      raceState: 'countdown',
      raceSessionId: raceSessionId + 1,
      countdownValue: 3,
      activeTrackId: track.id,
      raceStartTime: 0,
      raceTime: 0,
      raceDistance: Math.round(track.totalLength * track.laps),
      raceLaps: track.laps,
      raceTitle: track.title,
      raceIsBoss: track.isBoss,
      raceParticipantCount: track.isBoss ? 2 : 3,
      racePlacement: track.isBoss ? 2 : 3,
      baseReward: track.reward,
      currentReward: track.reward,
      currentSpeed: 0,
      justUnlockedAct2: false,
      justCompletedGame: false,
      isPaused: false,
    });
    return true;
  },

  setCountdownValue: (value) => set({ countdownValue: value }),

  beginRaceGo: () =>
    set((state) => {
      if (state.view !== 'RACE' || state.raceState !== 'countdown') return state;
      return {
        raceState: 'racing',
        countdownValue: 0,
        raceStartTime: Date.now(),
      };
    }),

  finishRace: (placement = 1) =>
    set((state) => {
      if (state.raceState === 'finished') return state;
      const elapsedMs = state.raceStartTime > 0 ? Date.now() - state.raceStartTime : 0;
      const earned = getScaledPayout(state.baseReward, placement);
      const prevStatus = getProgressionStatus(state.completedRaces);

      const prevRecord = state.completedRaces[state.activeTrackId];
      const nextRecord: RaceCompletionRecord = {
        bestTimeMs: prevRecord ? Math.min(prevRecord.bestTimeMs, elapsedMs) : elapsedMs,
        bestPosition: prevRecord ? Math.min(prevRecord.bestPosition, placement) : placement,
      };
      const nextCompleted = {
        ...state.completedRaces,
        [state.activeTrackId]: nextRecord,
      };
      const nextCash = state.cash + earned;

      const justUnlockedAct2 =
        state.activeTrackId === ACT1_BOSS_ID && placement === 1 && !prevStatus.act2Unlocked;
      const justCompletedGame =
        state.activeTrackId === FINAL_BOSS_ID && placement === 1;

      persistProgress({
        cash: nextCash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: nextCompleted,
      });

      return {
        raceState: 'finished',
        countdownValue: null,
        racePlacement: placement,
        currentReward: earned,
        cash: nextCash,
        raceTime: elapsedMs,
        completedRaces: nextCompleted,
        justUnlockedAct2,
        justCompletedGame,
        isPaused: false,
      };
    }),

  togglePause: () =>
    set((state) => {
      if (state.view !== 'RACE' || state.raceState !== 'racing') return state;
      const nextPaused = !state.isPaused;
      if (nextPaused) {
        return { isPaused: true, pauseStartTimestamp: Date.now() };
      } else {
        const pausedDuration =
          state.pauseStartTimestamp > 0 ? Date.now() - state.pauseStartTimestamp : 0;
        return {
          isPaused: false,
          raceStartTime: state.raceStartTime + pausedDuration,
          pauseStartTimestamp: 0,
        };
      }
    }),

  resumeRace: () =>
    set((state) => {
      if (!state.isPaused) return state;
      const pausedDuration =
        state.pauseStartTimestamp > 0 ? Date.now() - state.pauseStartTimestamp : 0;
      return {
        isPaused: false,
        raceStartTime: state.raceStartTime + pausedDuration,
        pauseStartTimestamp: 0,
      };
    }),

  restartRace: () => {
    const { activeTrackId } = get();
    set({ isPaused: false });
    get().startRace(activeTrackId);
  },

  setCurrentSpeed: (speed) => set({ currentSpeed: speed }),

  resetProgression: () => {
    const state = get();
    const fresh: PersistedSaveData = {
      cash: 1500,
      driverAlias: state.driverAlias,
      autoOrbitCam: state.autoOrbitCam,
      ownedCarIds: ['apex_gt'],
      selectedCarId: 'apex_gt',
      cars: { ...DEFAULT_CARS },
      completedRaces: {},
    };
    persistProgress(fresh);
    set({
      cash: fresh.cash,
      ownedCarIds: fresh.ownedCarIds,
      selectedCarId: fresh.selectedCarId,
      cars: fresh.cars,
      car: fresh.cars.apex_gt,
      completedRaces: fresh.completedRaces,
      activeTrackId: 'act1-r1',
      justUnlockedAct2: false,
      justCompletedGame: false,
    });
  },

  setCash: (amount) =>
    set((state) => {
      const cash = Math.max(0, Math.round(amount));
      persistProgress({
        cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: state.completedRaces,
      });
      return { cash };
    }),

  setCarStat: (stat, level, targetCarId) =>
    set((state) => {
      const carId = targetCarId ?? state.selectedCarId;
      const currentCar = state.cars[carId] ?? state.car;
      const clampedLevel = Math.max(1, Math.min(5, Math.round(level)));
      const nextCar = { ...currentCar, [stat]: clampedLevel };
      const nextCars = { ...state.cars, [carId]: nextCar };
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: nextCars,
        completedRaces: state.completedRaces,
      });
      return {
        cars: nextCars,
        car: carId === state.selectedCarId ? nextCar : state.car,
      };
    }),

  maxOutCar: (targetCarId) =>
    set((state) => {
      const carId = targetCarId ?? state.selectedCarId;
      const currentCar = state.cars[carId] ?? state.car;
      const nextCar = {
        ...currentCar,
        speedLevel: 5,
        accelLevel: 5,
        handlingLevel: 5,
      };
      const nextCars = { ...state.cars, [carId]: nextCar };
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: nextCars,
        completedRaces: state.completedRaces,
      });
      return {
        cars: nextCars,
        car: carId === state.selectedCarId ? nextCar : state.car,
      };
    }),

  resetCarStats: (targetCarId) =>
    set((state) => {
      const carId = targetCarId ?? state.selectedCarId;
      const currentCar = state.cars[carId] ?? state.car;
      const nextCar = {
        ...currentCar,
        speedLevel: 1,
        accelLevel: 1,
        handlingLevel: 1,
      };
      const nextCars = { ...state.cars, [carId]: nextCar };
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: nextCars,
        completedRaces: state.completedRaces,
      });
      return {
        cars: nextCars,
        car: carId === state.selectedCarId ? nextCar : state.car,
      };
    }),

  unlockAllCars: () =>
    set((state) => {
      const allIds = Object.keys(CAR_CATALOG);
      const nextCars = { ...state.cars };
      for (const id of allIds) {
        if (!nextCars[id]) {
          const def = CAR_CATALOG[id];
          nextCars[id] = {
            color: def?.defaultColor ?? '#dc2626',
            wheelsColor: def?.defaultWheelsColor ?? '#27272a',
            speedLevel: 1,
            accelLevel: 1,
            handlingLevel: 1,
            vinyl: 'none',
          };
        }
      }
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: allIds,
        selectedCarId: state.selectedCarId,
        cars: nextCars,
        completedRaces: state.completedRaces,
      });
      return {
        ownedCarIds: allIds,
        cars: nextCars,
      };
    }),

  unlockAct2Dev: () =>
    set((state) => {
      const act1Tracks = ['act1-r1', 'act1-r2', 'act1-r3', 'act1-r4', ACT1_BOSS_ID];
      const nextCompleted = { ...state.completedRaces };
      for (const tid of act1Tracks) {
        nextCompleted[tid] = { bestPosition: 1, bestTimeMs: 42000 };
      }
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: nextCompleted,
      });
      return { completedRaces: nextCompleted };
    }),

  completeAllRacesDev: () =>
    set((state) => {
      const allTrackIds = [
        'act1-r1', 'act1-r2', 'act1-r3', 'act1-r4', ACT1_BOSS_ID,
        'act2-r5', 'act2-r6', 'act2-r7', 'act2-r8', 'act2-r9', FINAL_BOSS_ID,
      ];
      const nextCompleted = { ...state.completedRaces };
      for (const tid of allTrackIds) {
        nextCompleted[tid] = { bestPosition: 1, bestTimeMs: 38500 };
      }
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: nextCompleted,
      });
      return { completedRaces: nextCompleted };
    }),

  toggleRaceCompletedDev: (trackId) =>
    set((state) => {
      const nextCompleted = { ...state.completedRaces };
      if (nextCompleted[trackId]) {
        delete nextCompleted[trackId];
      } else {
        nextCompleted[trackId] = { bestPosition: 1, bestTimeMs: 45000 };
      }
      persistProgress({
        cash: state.cash,
        driverAlias: state.driverAlias,
        autoOrbitCam: state.autoOrbitCam,
        ownedCarIds: state.ownedCarIds,
        selectedCarId: state.selectedCarId,
        cars: state.cars,
        completedRaces: nextCompleted,
      });
      return { completedRaces: nextCompleted };
    }),

  instantWinCurrentRace: () => {
    const { view, raceState, finishRace } = get();
    if (view === 'RACE' && (raceState === 'racing' || raceState === 'countdown')) {
      finishRace(1);
    }
  },
}));

