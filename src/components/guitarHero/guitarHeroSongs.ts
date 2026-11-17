export type GuitarDifficulty = 'NORMAL' | 'HARD' | 'EXPERT';

export interface ChartNote {
  id: number;
  time: number;       // seconds from song start
  lane: number;       // 0..4 (Green, Red, Yellow, Blue, Orange)
  duration: number;   // sustain tail length in seconds (0 = tap note)
  isHopo: boolean;    // hammer-on / pull-off cap
  isStarPower: boolean;
  freqHz: number;     // synthesized lead guitar pitch
  hit?: boolean;
  missed?: boolean;
  holding?: boolean;
  holdCompleted?: boolean;
}

export interface GuitarSongDef {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  durationSec: number;
  accentColor: string;
  rootMidi: number;
  scaleIntervals: number[];
  progression: number[]; // bar root offsets
}

export const LANE_COLORS = [
  '#22C55E', // 0: Green
  '#EF4444', // 1: Red
  '#FACC15', // 2: Yellow
  '#3B82F6', // 3: Blue
  '#F97316', // 4: Orange
] as const;

export const LANE_NAMES = ['G', 'R', 'Y', 'B', 'O'] as const;

export const GUITAR_SONGS: GuitarSongDef[] = [
  {
    id: 'neon_overdrive',
    title: 'Neon Overdrive',
    artist: 'Apex Voltage',
    genre: 'Arena Synth-Rock',
    bpm: 122,
    durationSec: 64,
    accentColor: '#38BDF8',
    rootMidi: 52, // E3
    scaleIntervals: [0, 3, 5, 7, 10, 12, 15, 17],
    progression: [0, 0, 5, 7, 3, 5, 0, 7],
  },
  {
    id: 'crimson_thunder',
    title: 'Crimson Thunder',
    artist: 'Iron fret',
    genre: 'Classic Hard Rock',
    bpm: 138,
    durationSec: 68,
    accentColor: '#F97316',
    rootMidi: 50, // D3
    scaleIntervals: [0, 2, 3, 5, 7, 9, 10, 12, 14],
    progression: [0, 5, 7, 5, 0, 3, 5, 7],
  },
  {
    id: 'inferno_shred',
    title: 'Inferno Shredder',
    artist: 'Hyperion',
    genre: 'Speed Metal',
    bpm: 158,
    durationSec: 72,
    accentColor: '#EF4444',
    rootMidi: 48, // C3
    scaleIntervals: [0, 2, 3, 5, 7, 8, 11, 12, 14, 15],
    progression: [0, 0, 8, 7, 5, 3, 8, 10],
  },
];

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Deterministic seeded generator per song + difficulty so charts are musical, rhythmic, and repeatable
export function generateSongChart(
  song: GuitarSongDef,
  difficulty: GuitarDifficulty,
): ChartNote[] {
  const beatSec = 60 / song.bpm;
  const totalBeats = Math.floor((song.durationSec - 3.5) / beatSec);
  const notes: ChartNote[] = [];

  const maxLane = difficulty === 'NORMAL' ? 3 : difficulty === 'HARD' ? 4 : 4;
  let idCounter = 1;
  let seed = song.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0) * 31, 17);
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  // Start after a 2.4-second count-in lead-in
  const leadIn = 2.4;
  let prevLane = 0;

  for (let beat = 0; beat < totalBeats; beat++) {
    const barIndex = Math.floor(beat / 4);
    const beatInBar = beat % 4;
    const section = Math.floor(barIndex / 4) % 4; // 0: verse groove, 1: chorus chords, 2: solo shred, 3: bridge/climax
    const barRoot = song.rootMidi + song.progression[barIndex % song.progression.length];
    const tBase = leadIn + beat * beatSec;

    // Star Power phrase every 6th bar (beats 0..3)
    const isStarPhrase = barIndex % 6 === 3;

    // Determine subdivisions for this beat based on difficulty & song section
    let subs: number[] = [0]; // fractions of a beat
    if (section === 0) {
      // Driving verse groove
      subs = difficulty === 'NORMAL' ? [0] : beatInBar % 2 === 0 ? [0, 0.5] : [0];
    } else if (section === 1) {
      // Chorus power-chord riff
      subs = difficulty === 'EXPERT' ? [0, 0.5] : [0];
    } else if (section === 2) {
      // Guitar Solo section!
      if (difficulty === 'EXPERT') {
        subs = [0, 0.25, 0.5, 0.75];
      } else if (difficulty === 'HARD') {
        subs = [0, 0.5];
      } else {
        subs = [0];
      }
    } else {
      // Breakdown / Climax
      subs = difficulty === 'NORMAL' ? [0] : beatInBar === 0 || beatInBar === 2 ? [0, 0.5] : [0];
    }

    // Occasional breath rest in Normal mode so it feels musical
    if (difficulty === 'NORMAL' && beatInBar === 3 && section === 0 && rand() < 0.45) {
      continue;
    }

    for (let sIdx = 0; sIdx < subs.length; sIdx++) {
      const sub = subs[sIdx];
      const noteTime = tBase + sub * beatSec;

      // Pick melodic lane progression
      let lane: number;
      if (section === 2) {
        // Ascending / descending shred staircase
        const wave = ((beat * subs.length + sIdx) % (maxLane * 2));
        lane = wave <= maxLane ? wave : maxLane * 2 - wave;
      } else if (beatInBar === 0 && sIdx === 0) {
        lane = barIndex % (maxLane + 1);
      } else {
        const step = rand() < 0.55 ? 1 : -1;
        lane = Math.max(0, Math.min(maxLane, prevLane + step));
        if (lane === prevLane) lane = (lane + 1) % (maxLane + 1);
      }

      const interval = song.scaleIntervals[(lane + barIndex) % song.scaleIntervals.length];
      const octaveShift = section === 2 ? 12 : 0;
      const freqHz = midiToHz(barRoot + interval + octaveShift);

      // Add sustain tail on accented half-note holds
      const canSustain =
        subs.length === 1 &&
        (beatInBar === 0 || beatInBar === 2) &&
        (section === 1 || section === 3) &&
        rand() < 0.55;
      const duration = canSustain ? beatSec * 1.45 : 0;

      const isHopo = sIdx > 0 && duration === 0 && lane !== prevLane && difficulty !== 'NORMAL';

      notes.push({
        id: idCounter++,
        time: noteTime,
        lane,
        duration,
        isHopo,
        isStarPower: isStarPhrase,
        freqHz,
      });

      // Add 2-note power chord partner in Chorus on Hard/Expert
      if (
        section === 1 &&
        sIdx === 0 &&
        beatInBar === 0 &&
        difficulty !== 'NORMAL' &&
        lane <= maxLane - 2
      ) {
        const chordLane = lane + 2;
        notes.push({
          id: idCounter++,
          time: noteTime,
          lane: chordLane,
          duration,
          isHopo: false,
          isStarPower: isStarPhrase,
          freqHz: freqHz * 1.498, // perfect fifth
        });
      }

      prevLane = lane;
    }
  }

  return notes;
}
