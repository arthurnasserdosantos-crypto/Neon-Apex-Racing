/**
 * Background Music Player for Apex Game Station
 * Manages the two soundtrack files:
 * 1. Main Menu / Game Station: Hush - Fired Up
 * 2. Racing / Free Roam / Shooter: Styles of Beyond - Nine Thou (NFS Most Wanted Soundtrack)
 */

export type BgmTrackId = 'MENU' | 'GAMEPLAY';

export interface BgmState {
  currentTrack: BgmTrackId;
  trackTitle: string;
  artist: string;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number; // 0..1
}

const MENU_AUDIO_SRC = '/assets/aistudio/Hush_-_Fired_up_320__mp3.pm__51702957.mp3';
const GAMEPLAY_AUDIO_SRC =
  '/assets/aistudio/Styles_of_Beyond_-_Nine_Thou_-_Need_for_Speed_Most_Wanted_Soundtrack_-_1080p_3767b698.mp3';

class BgmPlayerController {
  private menuAudio: HTMLAudioElement | null = null;
  private gameplayAudio: HTMLAudioElement | null = null;
  private currentTrack: BgmTrackId = 'MENU';
  private isMuted = false;
  private volume = 0.65;
  private isPlaying = false;
  private hasUserUnlocked = false;
  private listeners = new Set<(state: BgmState) => void>();
  private crossfadeInterval: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initAudioElements();
      this.setupGlobalUnlockListener();
    }
  }

  private initAudioElements() {
    try {
      this.menuAudio = new Audio(MENU_AUDIO_SRC);
      this.menuAudio.loop = true;
      this.menuAudio.preload = 'auto';
      this.menuAudio.volume = this.volume;

      this.gameplayAudio = new Audio(GAMEPLAY_AUDIO_SRC);
      this.gameplayAudio.loop = true;
      this.gameplayAudio.preload = 'auto';
      this.gameplayAudio.volume = 0;
    } catch {
      // Audio element initialization fallback for SSR or restricted environments
    }
  }

  private setupGlobalUnlockListener() {
    const unlockHandler = () => {
      this.unlock();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
    };
    window.addEventListener('pointerdown', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });
  }

  public unlock() {
    this.hasUserUnlocked = true;
    if (!this.isPlaying && !this.isMuted) {
      this.playCurrent();
    }
  }

  private emitState() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  public getState(): BgmState {
    const isMenu = this.currentTrack === 'MENU';
    return {
      currentTrack: this.currentTrack,
      trackTitle: isMenu ? 'Fired Up' : 'Nine Thou (Grant Mohrman Remix)',
      artist: isMenu ? 'Hush' : 'Styles of Beyond',
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
      volume: this.volume,
    };
  }

  public subscribe(cb: (state: BgmState) => void): () => void {
    this.listeners.add(cb);
    cb(this.getState());
    return () => this.listeners.delete(cb);
  }

  public setTrack(target: BgmTrackId, forceRestart = false) {
    if (forceRestart) {
      this.restartTrack(target);
      return;
    }

    if (this.currentTrack === target && this.isPlaying) return;
    this.currentTrack = target;

    if (!this.hasUserUnlocked) {
      this.emitState();
      return;
    }

    this.crossfadeTo(target);
    this.emitState();
  }

  public restartTrack(target: BgmTrackId = 'MENU') {
    this.currentTrack = target;
    this.hasUserUnlocked = true;

    if (this.crossfadeInterval !== null) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    const targetAudio = target === 'MENU' ? this.menuAudio : this.gameplayAudio;
    const otherAudio = target === 'MENU' ? this.gameplayAudio : this.menuAudio;

    if (otherAudio) {
      otherAudio.pause();
      otherAudio.currentTime = 0;
      otherAudio.volume = 0;
    }

    if (targetAudio) {
      try {
        targetAudio.currentTime = 0;
      } catch {
        // In case audio is not loaded yet
      }
      targetAudio.volume = this.isMuted ? 0 : this.volume;
      targetAudio
        .play()
        .then(() => {
          this.isPlaying = true;
          this.emitState();
        })
        .catch(() => {
          this.isPlaying = false;
          this.emitState();
        });
    }

    this.emitState();
  }

  private crossfadeTo(target: BgmTrackId) {
    if (!this.menuAudio || !this.gameplayAudio) return;

    if (this.crossfadeInterval !== null) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }

    const targetAudio = target === 'MENU' ? this.menuAudio : this.gameplayAudio;
    const fadeOutAudio = target === 'MENU' ? this.gameplayAudio : this.menuAudio;

    const targetMaxVol = this.isMuted ? 0 : this.volume;

    // Start playing target audio if not running
    if (targetAudio.paused && !this.isMuted) {
      targetAudio.play().catch(() => {
        // Autoplay may be blocked until explicit click
      });
    }

    let step = 0;
    const steps = 15;
    const stepDuration = 40; // 600ms total fade

    this.crossfadeInterval = window.setInterval(() => {
      step++;
      const factor = Math.min(1, step / steps);

      if (!this.isMuted) {
        targetAudio.volume = Math.min(1, factor * targetMaxVol);
        fadeOutAudio.volume = Math.max(0, (1 - factor) * targetMaxVol);
      }

      if (step >= steps) {
        if (this.crossfadeInterval !== null) {
          clearInterval(this.crossfadeInterval);
          this.crossfadeInterval = null;
        }
        fadeOutAudio.pause();
        fadeOutAudio.currentTime = 0;
        targetAudio.volume = targetMaxVol;
        this.isPlaying = !targetAudio.paused;
        this.emitState();
      }
    }, stepDuration);
  }

  private playCurrent() {
    if (!this.menuAudio || !this.gameplayAudio) return;

    const activeAudio = this.currentTrack === 'MENU' ? this.menuAudio : this.gameplayAudio;
    const inactiveAudio = this.currentTrack === 'MENU' ? this.gameplayAudio : this.menuAudio;

    inactiveAudio.pause();
    inactiveAudio.volume = 0;

    activeAudio.volume = this.isMuted ? 0 : this.volume;
    activeAudio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.emitState();
      })
      .catch(() => {
        this.isPlaying = false;
        this.emitState();
      });
  }

  public togglePlayPause(): boolean {
    this.unlock();
    if (this.isPlaying) {
      this.pause();
    } else {
      this.playCurrent();
    }
    return this.isPlaying;
  }

  public pause() {
    if (this.menuAudio) this.menuAudio.pause();
    if (this.gameplayAudio) this.gameplayAudio.pause();
    this.isPlaying = false;
    this.emitState();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    const targetAudio = this.currentTrack === 'MENU' ? this.menuAudio : this.gameplayAudio;
    if (targetAudio && !this.isMuted) {
      targetAudio.volume = this.volume;
    }
    this.emitState();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.menuAudio) this.menuAudio.volume = muted ? 0 : this.currentTrack === 'MENU' ? this.volume : 0;
    if (this.gameplayAudio)
      this.gameplayAudio.volume = muted ? 0 : this.currentTrack === 'GAMEPLAY' ? this.volume : 0;
    this.emitState();
  }

  public toggleMute(): boolean {
    this.unlock();
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public destroy() {
    if (this.crossfadeInterval !== null) {
      clearInterval(this.crossfadeInterval);
    }
    if (this.menuAudio) {
      this.menuAudio.pause();
      this.menuAudio.src = '';
    }
    if (this.gameplayAudio) {
      this.gameplayAudio.pause();
      this.gameplayAudio.src = '';
    }
    this.listeners.clear();
  }
}

export const bgmPlayer = new BgmPlayerController();
