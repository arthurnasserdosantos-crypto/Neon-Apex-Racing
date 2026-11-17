import * as THREE from 'three';
import { Wllama } from '@wllama/wllama';
import wllamaWasmUrl from '@wllama/wllama/esm/wasm/wllama.wasm?url';

export type AiBotDirective =
  | 'PATROL'
  | 'RACE_OBBY'
  | 'FOLLOW'
  | 'JUMP'
  | 'WAVE'
  | 'DANCE'
  | 'CHEER';

export type OllamaConnectionMode = 'none' | 'ollama-api' | 'local-file';

export interface OllamaDiscoveredModel {
  id: string;
  label: string;
  sizeBytes?: number;
  mode: 'ollama-api' | 'local-file';
  file?: File;
}

export interface OllamaModelStatus {
  state: 'idle' | 'loading' | 'ready' | 'error';
  mode: OllamaConnectionMode;
  progressPct: number;
  loadingStep?: string;
  activeModel?: string;
  modelKind?: 'instruct' | 'base';
  endpointUrl: string;
  models: OllamaDiscoveredModel[];
  errorMsg?: string;
}

export interface OllamaAgentQuery {
  botName: string;
  zone: string;
  playerNear: boolean;
  lastAction: AiBotDirective;
  playerChat?: string;
}

export interface OllamaAgentDecision {
  directive: AiBotDirective;
  speech: string;
  source: 'ollama' | 'warmup';
}

export type PlayerControlMove =
  | 'FORWARD'
  | 'BACK'
  | 'LEFT'
  | 'RIGHT'
  | 'TO_OBBY'
  | 'TO_COIN'
  | 'TO_FOUNTAIN'
  | 'TO_BOT'
  | 'STOP';

export type PlayerControlEmote = 'NONE' | 'WAVE' | 'DANCE' | 'CHEER' | 'SIT';

export interface PlayerControlQuery {
  stage: number;
  totalStages: number;
  coins: number;
  totalCoins: number;
  onGround: boolean;
  onTruss: boolean;
  gapAhead: boolean;
  nearestCoinDist?: number;
  nearestBotName?: string;
  lastMove: PlayerControlMove;
  userGoal?: string;
}

export interface PlayerControlDecision {
  move: PlayerControlMove;
  jump: boolean;
  sprint: boolean;
  emote: PlayerControlEmote;
  say: string;
  source: 'ollama' | 'warmup';
}

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
const STORAGE_URL_KEY = 'bloxverse_ollama_url';

const VALID_DIRECTIVES: AiBotDirective[] = [
  'RACE_OBBY',
  'FOLLOW',
  'PATROL',
  'JUMP',
  'WAVE',
  'DANCE',
  'CHEER',
];

const SYSTEM_PROMPT =
  'You control an AI player inside BloxVerse 3D, a Roblox-style 3D obby world. Reply ONLY with one line in this exact format: ACTION: <ONE OF PATROL, RACE_OBBY, FOLLOW, JUMP, WAVE, DANCE, CHEER> | SAY: <friendly reply under 16 words>';

function buildMessages(q: OllamaAgentQuery) {
  const playerPart = q.playerChat
    ? ` Player just said: "${q.playerChat.slice(0, 80)}".`
    : '';
  return [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    {
      role: 'user' as const,
      content: `Name: ${q.botName}. Location: ${q.zone}. Player nearby: ${q.playerNear}. Last action: ${q.lastAction}.${playerPart}`,
    },
  ];
}

function buildBotFewShotPrompt(q: OllamaAgentQuery): string {
  const playerPart = q.playerChat ? ` Player said: "${q.playerChat.slice(0, 80)}".` : '';
  return [
    'Example 1:',
    'Input: Name: BloxRacer. Location: ObbyStage1. Player nearby: false. Last action: PATROL.',
    'Output: ACTION: RACE_OBBY | SAY: Racing straight up the Sky Obby!',
    'Example 2:',
    'Input: Name: ObbyKing. Location: Plaza. Player nearby: true. Last action: WAVE.',
    'Output: ACTION: CHEER | SAY: Awesome jump, keep climbing!',
    'Current:',
    `Input: Name: ${q.botName}. Location: ${q.zone}. Player nearby: ${q.playerNear}. Last action: ${q.lastAction}.${playerPart}`,
    'Output:',
  ].join('\n');
}

const VALID_PLAYER_MOVES: PlayerControlMove[] = [
  'TO_OBBY',
  'TO_COIN',
  'TO_FOUNTAIN',
  'TO_BOT',
  'FORWARD',
  'BACK',
  'LEFT',
  'RIGHT',
  'STOP',
];

const VALID_PLAYER_EMOTES: PlayerControlEmote[] = ['WAVE', 'DANCE', 'CHEER', 'SIT', 'NONE'];

const PLAYER_CONTROL_SYSTEM =
  'You pilot the player character in BloxVerse 3D, a Roblox 3D platformer obby. Reply ONLY with one line: MOVE: <TO_OBBY|TO_COIN|TO_FOUNTAIN|TO_BOT|FORWARD|BACK|LEFT|RIGHT|STOP> | JUMP: <YES|NO> | SPRINT: <YES|NO> | EMOTE: <NONE|WAVE|DANCE|CHEER|SIT> | SAY: <short character line under 12 words>';

function buildPlayerControlMessages(q: PlayerControlQuery) {
  const goalPart = q.userGoal ? ` Command: "${q.userGoal.slice(0, 100)}".` : '';
  const coinPart = q.nearestCoinDist !== undefined ? ` NearestCoin: ${q.nearestCoinDist.toFixed(1)}m.` : '';
  const botPart = q.nearestBotName ? ` NearestBot: ${q.nearestBotName}.` : '';
  return [
    { role: 'system' as const, content: PLAYER_CONTROL_SYSTEM },
    {
      role: 'user' as const,
      content: `Stage: ${q.stage}/${q.totalStages}. Coins: ${q.coins}/${q.totalCoins}. Ground: ${q.onGround}. Truss: ${q.onTruss}. GapAhead: ${q.gapAhead}. LastMove: ${q.lastMove}.${coinPart}${botPart}${goalPart}`,
    },
  ];
}

function buildPlayerControlFewShotPrompt(q: PlayerControlQuery): string {
  const goalPart = q.userGoal ? ` Command: "${q.userGoal.slice(0, 100)}".` : '';
  return [
    'Example 1:',
    'State: Stage: 0/10. Ground: true. GapAhead: true. Command: "beat the obby".',
    'Output: MOVE: TO_OBBY | JUMP: YES | SPRINT: YES | EMOTE: NONE | SAY: Leaping across the obby gap!',
    'Example 2:',
    'State: Stage: 2/10. Ground: true. GapAhead: false. Command: "dance".',
    'Output: MOVE: STOP | JUMP: NO | SPRINT: NO | EMOTE: DANCE | SAY: Busting out my victory moves!',
    'Current:',
    `State: Stage: ${q.stage}/${q.totalStages}. Coins: ${q.coins}/${q.totalCoins}. Ground: ${q.onGround}. Truss: ${q.onTruss}. GapAhead: ${q.gapAhead}. LastMove: ${q.lastMove}.${goalPart}`,
    'Output:',
  ].join('\n');
}

function parsePlayerControlResponse(raw: string, q: PlayerControlQuery): PlayerControlDecision | null {
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\r/g, '').trim();
  if (!stripped) return null;

  const firstLine = stripped.split('\n').find((l) => l.trim().length > 0)?.trim() ?? stripped;
  const upper = firstLine.toUpperCase();

  let move: PlayerControlMove | null = null;
  for (const m of VALID_PLAYER_MOVES) {
    if (upper.includes(m)) {
      move = m;
      break;
    }
  }
  if (!move) {
    if (upper.includes('OBBY') || upper.includes('STAGE') || upper.includes('CLIMB') || upper.includes('RACE')) {
      move = 'TO_OBBY';
    } else if (upper.includes('COIN') || upper.includes('GOLD')) {
      move = 'TO_COIN';
    } else if (upper.includes('FOUNTAIN')) {
      move = 'TO_FOUNTAIN';
    } else if (upper.includes('FOLLOW') || upper.includes('BOT')) {
      move = 'TO_BOT';
    } else if (upper.includes('BACK')) {
      move = 'BACK';
    } else if (upper.includes('LEFT')) {
      move = 'LEFT';
    } else if (upper.includes('RIGHT')) {
      move = 'RIGHT';
    } else if (upper.includes('STOP') || upper.includes('WAIT') || upper.includes('STAY')) {
      move = 'STOP';
    } else if (upper.includes('FORWARD') || upper.includes('GO') || upper.includes('RUN')) {
      move = 'FORWARD';
    }
  }

  let emote: PlayerControlEmote = 'NONE';
  for (const em of VALID_PLAYER_EMOTES) {
    if (em !== 'NONE' && upper.includes(em)) {
      emote = em;
      break;
    }
  }
  if (!move) {
    move = emote !== 'NONE' ? 'STOP' : q.lastMove || 'TO_OBBY';
  }

  const jumpMatch = upper.match(/JUMP\s*:\s*(YES|TRUE|1)/);
  const sprintMatch = upper.match(/SPRINT\s*:\s*(YES|TRUE|1)/);
  const jump = Boolean(jumpMatch) || q.gapAhead || (upper.includes('JUMP') && !/JUMP\s*:\s*NO/.test(upper));
  const sprint = Boolean(sprintMatch) || (move === 'TO_OBBY' && !/SPRINT\s*:\s*NO/.test(upper));

  let say = '';
  const sayIdx = firstLine.search(/SAY\s*:/i);
  if (sayIdx !== -1) {
    say = firstLine
      .slice(sayIdx)
      .replace(/^SAY\s*:\s*/i, '')
      .split('|')[0]
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .slice(0, 180);
  } else {
    say =
      emote !== 'NONE'
        ? `${emote.charAt(0)}${emote.slice(1).toLowerCase()} time!`
        : move === 'TO_OBBY'
          ? 'Climbing the Sky Obby!'
          : move === 'TO_COIN'
            ? 'Grabbing that Blox Coin!'
            : move === 'TO_BOT'
              ? `Heading over to ${q.nearestBotName ?? 'friends'}!`
              : 'On the move!';
  }

  return {
    move,
    jump,
    sprint,
    emote,
    say,
    source: 'ollama',
  };
}

function parseModelResponse(
  raw: string,
  fallbackZone: string,
  playerNear: boolean,
): OllamaAgentDecision | null {
  // Strip <think>...</think> blocks for reasoning models (e.g. qwen3 / deepseek-r1)
  const stripped = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/\r/g, '').trim();
  if (!stripped) return null;

  const firstLine = stripped.split('\n').find((l) => l.trim().length > 0)?.trim() ?? stripped;
  const upper = firstLine.toUpperCase();

  let matched: AiBotDirective | null = null;
  for (const dir of VALID_DIRECTIVES) {
    if (upper.includes(dir)) {
      matched = dir;
      break;
    }
  }
  if (!matched) {
    if (upper.includes('OBBY') || upper.includes('RACE') || upper.includes('RUN')) matched = 'RACE_OBBY';
    else if (upper.includes('FOLLOW') || upper.includes('COMING')) matched = 'FOLLOW';
    else if (upper.includes('DANCE')) matched = 'DANCE';
    else if (upper.includes('CHEER')) matched = 'CHEER';
    else if (upper.includes('JUMP') || upper.includes('HOP')) matched = 'JUMP';
    else if (upper.includes('WAVE') || upper.includes('HELLO') || upper.includes('HI')) matched = 'WAVE';
    else matched = playerNear ? 'WAVE' : fallbackZone.includes('Obby') ? 'RACE_OBBY' : 'PATROL';
  }

  let speech = '';
  const sayIdx = firstLine.search(/SAY\s*:/i);
  if (sayIdx !== -1) {
    speech = firstLine
      .slice(sayIdx)
      .replace(/^SAY\s*:\s*/i, '')
      .split('|')[0]
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .slice(0, 180);
  } else {
    speech = firstLine
      .replace(/^(ACTION\s*:\s*)?[A-Z_]+\s*\|?\s*/i, '')
      .replace(/^["'\s]+|["'\s]+$/g, '')
      .slice(0, 180);
  }

  if (!speech || speech.length < 2) {
    speech =
      matched === 'RACE_OBBY'
        ? 'Climbing the Sky Obby!'
        : matched === 'FOLLOW'
          ? 'Right behind you!'
          : matched === 'WAVE'
            ? 'Hey there, Bloxxer!'
            : matched === 'DANCE'
              ? 'Grooving in Blox Plaza!'
              : matched === 'CHEER'
                ? 'You got this!'
                : matched === 'JUMP'
                  ? 'Watch this jump!'
                  : 'Exploring Blox Plaza!';
  }

  return {
    directive: matched,
    speech,
    source: 'ollama',
  };
}

async function hasGgufMagicHeader(file: File): Promise<boolean> {
  if (file.size < 16) return false;
  try {
    const buf = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buf);
    // "GGUF" = 0x47 0x47 0x55 0x46
    return bytes[0] === 0x47 && bytes[1] === 0x47 && bytes[2] === 0x55 && bytes[3] === 0x46;
  } catch {
    return false;
  }
}

interface OllamaManifest {
  layers?: {
    mediaType?: string;
    digest?: string;
    size?: number;
  }[];
}

function formatSizeMb(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export class OllamaAiController {
  private listeners = new Set<(status: OllamaModelStatus) => void>();
  private wllama: Wllama | null = null;
  private inferenceQueue: Promise<void> = Promise.resolve();
  private disposed = false;

  private status: OllamaModelStatus = {
    state: 'idle',
    mode: 'none',
    progressPct: 0,
    endpointUrl:
      (typeof window !== 'undefined' && window.localStorage?.getItem(STORAGE_URL_KEY)) ||
      DEFAULT_OLLAMA_URL,
    models: [],
  };

  public start() {
    this.disposed = false;
    // Automatically probe local Ollama server on startup
    void this.connectOllamaApi(this.status.endpointUrl, true);
  }

  private updateStatus(partial: Partial<OllamaModelStatus>) {
    this.status = { ...this.status, ...partial };
    this.listeners.forEach((cb) => cb(this.status));
  }

  public getStatus(): OllamaModelStatus {
    return this.status;
  }

  public subscribe(cb: (status: OllamaModelStatus) => void): () => void {
    this.listeners.add(cb);
    cb(this.status);
    return () => {
      this.listeners.delete(cb);
    };
  }

  /**
   * Connect to local Ollama HTTP API (e.g. http://localhost:11434) and fetch installed models.
   */
  public async connectOllamaApi(url?: string, silent = false): Promise<boolean> {
    const cleanUrl = (url ?? this.status.endpointUrl).trim().replace(/\/+$/, '') || DEFAULT_OLLAMA_URL;
    if (typeof window !== 'undefined') {
      try {
        window.localStorage?.setItem(STORAGE_URL_KEY, cleanUrl);
      } catch {
        // ignore storage restrictions
      }
    }

    this.updateStatus({
      endpointUrl: cleanUrl,
      ...(silent ? {} : { state: 'loading', errorMsg: undefined }),
    });

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), silent ? 2400 : 5000);

    try {
      const res = await fetch(`${cleanUrl}/api/tags`, {
        method: 'GET',
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        models?: { name?: string; model?: string; size?: number }[];
      };
      const rawModels = data.models ?? [];
      const apiModels: OllamaDiscoveredModel[] = rawModels
        .filter((m) => (m.name || m.model) && !/embed/i.test(m.name || m.model || ''))
        .map((m) => {
          const name = m.name || m.model || 'ollama-model';
          return {
            id: `api:${name}`,
            label: m.size ? `${name} (${formatSizeMb(m.size)})` : name,
            sizeBytes: m.size,
            mode: 'ollama-api' as const,
          };
        });

      // Preserve any already-discovered local file models too
      const existingFileModels = this.status.models.filter((m) => m.mode === 'local-file');
      const combined = [...apiModels, ...existingFileModels];

      if (apiModels.length === 0) {
        this.updateStatus({
          state: existingFileModels.length > 0 && this.status.mode === 'local-file' ? this.status.state : 'error',
          models: combined,
          errorMsg: 'Ollama responded, but no chat models were found (run: ollama pull llama3.2:1b)',
        });
        return false;
      }

      const preferred =
        apiModels.find((m) => /instruct|chat|qwen|llama|gemma|phi|mistral/i.test(m.id)) ?? apiModels[0];
      const modelName = preferred.id.replace(/^api:/, '');
      const modelKind: 'instruct' | 'base' = /base|pt|raw/i.test(modelName) ? 'base' : 'instruct';

      this.updateStatus({
        state: 'ready',
        mode: 'ollama-api',
        progressPct: 100,
        activeModel: modelName,
        modelKind,
        models: combined,
        errorMsg: undefined,
      });
      return true;
    } catch (err) {
      window.clearTimeout(timer);
      if (this.status.mode === 'local-file' && this.status.state === 'ready') {
        return false;
      }
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'Ollama localhost timed out'
          : 'Could not reach Ollama API (check OLLAMA_ORIGINS="*" or load local .ollama/models files)';
      this.updateStatus({
        state: silent ? 'idle' : 'error',
        errorMsg: silent ? undefined : msg,
      });
      return false;
    }
  }

  /**
   * Handle browser file requests: accepts a single GGUF/Ollama blob file OR an entire ~/.ollama/models folder!
   */
  public async loadFromFiles(fileList: FileList | File[]): Promise<void> {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    this.updateStatus({
      state: 'loading',
      progressPct: 5,
      errorMsg: undefined,
    });

    try {
      // Index blobs by filename (e.g. "sha256-abcdef...")
      const blobByName = new Map<string, File>();
      const manifestFiles: { file: File; relPath: string }[] = [];
      const standaloneCandidates: File[] = [];

      for (const f of files) {
        const rel = ((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name).replace(
          /\\/g,
          '/',
        );
        if (rel.includes('/blobs/') || f.name.startsWith('sha256-')) {
          blobByName.set(f.name, f);
        }
        if (rel.includes('/manifests/') && f.size > 0 && f.size < 256 * 1024) {
          manifestFiles.push({ file: f, relPath: rel });
        } else if (f.name.toLowerCase().endsWith('.gguf') || (f.name.startsWith('sha256-') && f.size > 5 * 1024 * 1024)) {
          standaloneCandidates.push(f);
        }
      }

      const discoveredFileModels: OllamaDiscoveredModel[] = [];

      // 1. Parse Ollama manifest files -> resolve model name + GGUF blob
      for (const mf of manifestFiles) {
        try {
          const text = await mf.file.text();
          const parsed = JSON.parse(text) as OllamaManifest;
          const modelLayer = parsed.layers?.find(
            (l) => l.mediaType === 'application/vnd.ollama.image.model' && l.digest,
          );
          if (!modelLayer?.digest) continue;

          const blobKey = modelLayer.digest.replace(':', '-');
          const blobFile = blobByName.get(blobKey);
          if (!blobFile) continue;

          // Extract nice Ollama model name from manifests/<registry>/<ns>/<model>/<tag>
          const parts = mf.relPath.split('/manifests/')[1]?.split('/').filter(Boolean) ?? [];
          let modelLabel = mf.file.name;
          if (parts.length >= 2) {
            const tag = parts[parts.length - 1];
            const name = parts[parts.length - 2];
            modelLabel = `${name}:${tag}`;
          }

          discoveredFileModels.push({
            id: `file:${modelLabel}:${blobKey.slice(0, 14)}`,
            label: `${modelLabel} (${formatSizeMb(blobFile.size)})`,
            sizeBytes: blobFile.size,
            mode: 'local-file',
            file: blobFile,
          });
        } catch {
          // skip unreadable manifest
        }
      }

      // 2. If no manifests matched (e.g. user picked a single .gguf or sha256-* blob directly), check magic header
      if (discoveredFileModels.length === 0) {
        for (const f of standaloneCandidates) {
          if (await hasGgufMagicHeader(f)) {
            discoveredFileModels.push({
              id: `file:${f.name}`,
              label: `${f.name} (${formatSizeMb(f.size)})`,
              sizeBytes: f.size,
              mode: 'local-file',
              file: f,
            });
          }
        }
      }

      if (discoveredFileModels.length === 0) {
        this.updateStatus({
          state: 'error',
          progressPct: 0,
          errorMsg:
            'No GGUF Ollama model found in selection. Pick ~/.ollama/models folder or a GGUF/sha256-* blob file.',
        });
        return;
      }

      // Sort smallest first so browser WASM picks a fast model by default if folder has multiple
      discoveredFileModels.sort((a, b) => (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0));

      const apiModels = this.status.models.filter((m) => m.mode === 'ollama-api');
      const combined = [...discoveredFileModels, ...apiModels];

      // Pick smallest model <= 1.8 GB if available (browser single-ArrayBuffer limit is ~2GB)
      const safeDefault =
        discoveredFileModels.find((m) => (m.sizeBytes ?? 0) <= 1.85 * 1024 * 1024 * 1024) ??
        discoveredFileModels[0];

      this.updateStatus({ models: combined });
      await this.selectModel(safeDefault.id);
    } catch (err) {
      this.updateStatus({
        state: 'error',
        progressPct: 0,
        errorMsg: err instanceof Error ? err.message : 'Failed reading local Ollama files',
      });
    }
  }

  public async selectModel(modelId: string): Promise<void> {
    const entry = this.status.models.find((m) => m.id === modelId);
    if (!entry) return;

    if (entry.mode === 'ollama-api') {
      const modelName = entry.id.replace(/^api:/, '');
      const modelKind: 'instruct' | 'base' = /base|pt|raw/i.test(modelName) ? 'base' : 'instruct';
      this.updateStatus({
        state: 'ready',
        mode: 'ollama-api',
        progressPct: 100,
        activeModel: modelName,
        modelKind,
        errorMsg: undefined,
      });
      return;
    }

    if (entry.mode === 'local-file' && entry.file) {
      if (entry.file.size > 2.0 * 1024 * 1024 * 1024) {
        this.updateStatus({
          state: 'error',
          progressPct: 0,
          errorMsg: `${entry.label} exceeds the ~2GB browser file buffer limit. Use a smaller model file or connect Ollama at localhost:11434.`,
        });
        return;
      }

      this.updateStatus({
        state: 'loading',
        mode: 'local-file',
        progressPct: 15,
        loadingStep: 'Preparing WASM runtime (9.8 MB)...',
        activeModel: entry.label,
        errorMsg: undefined,
      });

      const nativeErrors: string[] = [];
      let currentPct = 15;
      const pushProgress = (pct: number, step: string) => {
        if (this.disposed) return;
        currentPct = Math.max(currentPct, pct);
        this.updateStatus({ progressPct: currentPct, loadingStep: step });
      };

      const handleWllamaLog = (isErr: boolean, args: unknown[]) => {
        const text = args.map((a) => (typeof a === 'string' ? a : String(a))).join(' ');
        if (isErr && text.trim()) {
          nativeErrors.push(text.trim());
          if (nativeErrors.length > 6) nativeErrors.shift();
        }
        if (/Loading "wllama\.wasm"/i.test(text)) {
          pushProgress(30, 'Fetching & compiling wllama.wasm...');
        } else if (/Calling wllamaStart/i.test(text)) {
          pushProgress(50, 'Starting llama.cpp WASM worker...');
        } else if (/Loading model\.\.\./i.test(text)) {
          pushProgress(62, 'Opening local GGUF file...');
        } else if (/llama_model_loader|loaded meta data/i.test(text)) {
          pushProgress(70, 'Reading GGUF metadata...');
        } else if (/load_tensors|model_load/i.test(text)) {
          pushProgress(Math.min(88, currentPct + 3), 'Streaming GGUF tensors...');
        } else if (/llama_context|kv_self|new_context/i.test(text)) {
          pushProgress(94, 'Initializing inference context...');
        }
      };

      const silentConsole = console;
      const wllamaLogger = {
        ...silentConsole,
        debug: (...args: unknown[]) => handleWllamaLog(false, args),
        log: (...args: unknown[]) => handleWllamaLog(false, args),
        warn: (...args: unknown[]) => handleWllamaLog(false, args),
        error: (...args: unknown[]) => handleWllamaLog(true, args),
      };

      let instance: Wllama | null = null;
      let loadTimer: number | null = null;
      try {
        if (this.wllama) {
          await this.wllama.exit().catch(() => {});
          this.wllama = null;
        }

        // Use n_gpu_layers: 0 (CPU WASM) so GPUs without shader-f16/WebGPU compute never stall in emwgpu
        instance = new Wllama(
          { default: wllamaWasmUrl },
          { suppressNativeLog: false, logger: wllamaLogger },
        );

        const loadPromise = instance.loadModel([entry.file], {
          n_ctx: 512,
          n_parallel: 1,
          n_threads: 1,
          n_gpu_layers: 0,
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          loadTimer = window.setTimeout(() => {
            reject(
              new Error(
                'Model load timed out after 90s in WASM (file may be too large for browser RAM — try a smaller quantized model or connect Ollama at localhost:11434).',
              ),
            );
          }, 90000);
        });

        await Promise.race([loadPromise, timeoutPromise]);
        if (loadTimer !== null) window.clearTimeout(loadTimer);

        if (this.disposed) {
          await instance.exit().catch(() => {});
          return;
        }

        const hasChatTemplate = Boolean(instance.getChatTemplate());
        this.wllama = instance;
        this.updateStatus({
          state: 'ready',
          mode: 'local-file',
          progressPct: 100,
          loadingStep: undefined,
          activeModel: entry.label,
          modelKind: hasChatTemplate ? 'instruct' : 'base',
          errorMsg: undefined,
        });
      } catch (err) {
        if (loadTimer !== null) window.clearTimeout(loadTimer);
        if (instance) {
          await instance.exit().catch(() => {});
        }
        const detail = nativeErrors.length > 0 ? ` (${nativeErrors[nativeErrors.length - 1]})` : '';
        this.updateStatus({
          state: 'error',
          progressPct: 0,
          loadingStep: undefined,
          errorMsg: `${err instanceof Error ? err.message : 'Failed to load Ollama GGUF file in WASM'}${detail}`,
        });
      }
    }
  }

  private async runLlmPrompt(
    messages: { role: 'system' | 'user'; content: string }[],
    fewShotPrompt: string,
    maxTokens = 64,
  ): Promise<string> {
    if (this.status.state !== 'ready' || !this.status.activeModel) {
      return '';
    }

    return new Promise<string>((resolve) => {
      this.inferenceQueue = this.inferenceQueue.then(async () => {
        if (this.disposed) {
          resolve('');
          return;
        }
        try {
          if (this.status.mode === 'ollama-api') {
            const controller = new AbortController();
            const timer = window.setTimeout(() => controller.abort(), 9000);
            try {
              if (this.status.modelKind !== 'base') {
                const res = await fetch(`${this.status.endpointUrl}/api/chat`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  signal: controller.signal,
                  body: JSON.stringify({
                    model: this.status.activeModel,
                    messages,
                    stream: false,
                    options: {
                      num_predict: maxTokens,
                      temperature: 0.65,
                    },
                  }),
                });
                if (res.ok) {
                  const data = (await res.json()) as {
                    message?: { content?: string };
                    response?: string;
                  };
                  const out = data.message?.content ?? data.response ?? '';
                  if (out.trim()) {
                    window.clearTimeout(timer);
                    resolve(out);
                    return;
                  }
                }
              }

              // Fallback to /api/generate with few-shot prompt (works with both Base & Instruct models)
              const genRes = await fetch(`${this.status.endpointUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                  model: this.status.activeModel,
                  prompt: fewShotPrompt,
                  stream: false,
                  options: {
                    num_predict: maxTokens,
                    temperature: 0.65,
                    stop: ['\n', 'Example', '###'],
                  },
                }),
              });
              window.clearTimeout(timer);
              if (!genRes.ok) {
                resolve('');
                return;
              }
              const genData = (await genRes.json()) as { response?: string };
              resolve(genData.response ?? '');
            } catch {
              window.clearTimeout(timer);
              resolve('');
            }
            return;
          }

          if (this.status.mode === 'local-file' && this.wllama && this.wllama.isModelLoaded()) {
            const hasTemplate = Boolean(this.wllama.getChatTemplate());
            if (hasTemplate) {
              try {
                const resp = await this.wllama.createChatCompletion({
                  messages,
                  max_tokens: maxTokens,
                  temperature: 0.65,
                  top_k: 40,
                  penalty_repeat: 1.15,
                });
                const text = resp.choices?.[0]?.message?.content ?? '';
                if (text.trim()) {
                  resolve(text);
                  return;
                }
              } catch {
                // Fall back to raw completion below if chat template execution fails
              }
            }

            // Raw completion fallback for base / non-instruct GGUF models
            const rawResp = await this.wllama.createCompletion({
              prompt: fewShotPrompt,
              max_tokens: maxTokens,
              temperature: 0.65,
              top_k: 40,
              penalty_repeat: 1.15,
              stop: ['\n', 'Example', '###'],
            });
            resolve(rawResp.choices?.[0]?.text ?? '');
            return;
          }

          resolve('');
        } catch {
          resolve('');
        }
      });
    });
  }

  public async decideAction(query: OllamaAgentQuery): Promise<OllamaAgentDecision> {
    if (this.status.state !== 'ready' || !this.status.activeModel) {
      return this.warmupFallback(query);
    }

    const rawText = await this.runLlmPrompt(
      buildMessages(query),
      buildBotFewShotPrompt(query),
      64,
    );

    const parsed = parseModelResponse(rawText, query.zone, query.playerNear);
    if (parsed) return parsed;
    return this.warmupFallback(query);
  }

  public async decidePlayerControl(query: PlayerControlQuery): Promise<PlayerControlDecision> {
    if (this.status.state !== 'ready' || !this.status.activeModel) {
      return this.playerWarmupFallback(query);
    }

    const rawText = await this.runLlmPrompt(
      buildPlayerControlMessages(query),
      buildPlayerControlFewShotPrompt(query),
      64,
    );

    const parsed = parsePlayerControlResponse(rawText, query);
    if (parsed) return parsed;
    return this.playerWarmupFallback(query);
  }

  private playerWarmupFallback(q: PlayerControlQuery): PlayerControlDecision {
    const goal = (q.userGoal ?? '').toLowerCase();
    if (goal.includes('dance')) {
      return { move: 'STOP', jump: false, sprint: false, emote: 'DANCE', say: 'Dancing right now!', source: 'warmup' };
    }
    if (goal.includes('wave')) {
      return { move: 'STOP', jump: false, sprint: false, emote: 'WAVE', say: 'Hey everyone!', source: 'warmup' };
    }
    if (goal.includes('coin')) {
      return { move: 'TO_COIN', jump: q.gapAhead, sprint: true, emote: 'NONE', say: 'Hunting Blox Coins!', source: 'warmup' };
    }
    if (goal.includes('fountain')) {
      return { move: 'TO_FOUNTAIN', jump: false, sprint: false, emote: 'NONE', say: 'Heading to Fountain!', source: 'warmup' };
    }
    return {
      move: q.lastMove === 'STOP' ? 'TO_OBBY' : q.lastMove,
      jump: q.gapAhead,
      sprint: true,
      emote: 'NONE',
      say: this.status.state === 'ready' ? 'Auto-running Sky Obby!' : 'Connect Ollama for AI Pilot!',
      source: 'warmup',
    };
  }

  private warmupFallback(q: OllamaAgentQuery): OllamaAgentDecision {
    if (q.playerChat) {
      return {
        directive: 'WAVE',
        speech: `Nice! "${q.playerChat.slice(0, 22)}"`,
        source: 'warmup',
      };
    }
    const cycle: AiBotDirective[] = q.playerNear
      ? ['WAVE', 'CHEER', 'FOLLOW', 'JUMP']
      : ['RACE_OBBY', 'PATROL', 'DANCE', 'JUMP'];
    const idx = (q.botName.length + Math.floor(performance.now() / 3000)) % cycle.length;
    const directive = cycle[idx];
    return {
      directive,
      speech:
        this.status.state === 'loading'
          ? `Loading Ollama (${this.status.progressPct}%)`
          : directive === 'RACE_OBBY'
            ? 'Heading up the Obby!'
            : 'Cruising Blox Plaza!',
      source: 'warmup',
    };
  }

  public dispose() {
    this.disposed = true;
    if (this.wllama) {
      void this.wllama.exit().catch(() => {});
      this.wllama = null;
    }
  }
}

// Overhead 3D Billboard Sprite for AI Player Name + Ollama Chat Bubble
export interface BotBillboard {
  sprite: THREE.Sprite;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
}

export function createBotBillboard(
  botName: string,
  action: string,
  speech: string,
  isModelActive: boolean,
): BotBillboard {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 176;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(4.1, 1.4, 1);
  sprite.position.set(0, 4.15, 0);

  const bb: BotBillboard = { sprite, canvas, ctx, texture };
  updateBotBillboard(bb, botName, action, speech, isModelActive);
  return bb;
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxLineWidth: number,
  maxLines = 5,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  const pushWordHardWrap = (word: string) => {
    let chunk = '';
    for (const ch of word) {
      if (ctx.measureText(chunk + ch).width > maxLineWidth && chunk.length > 0) {
        lines.push(chunk);
        chunk = ch;
        if (lines.length >= maxLines) return;
      } else {
        chunk += ch;
      }
    }
    if (chunk && lines.length < maxLines) {
      current = chunk;
    }
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxLineWidth) {
      current = candidate;
    } else if (!current) {
      pushWordHardWrap(word);
    } else {
      lines.push(current);
      current = '';
      if (lines.length >= maxLines) break;
      if (ctx.measureText(word).width <= maxLineWidth) {
        current = word;
      } else {
        pushWordHardWrap(word);
      }
    }
  }

  if (current && lines.length < maxLines) {
    lines.push(current);
  }

  // Indicate truncation only if text still exceeded maxLines
  if (lines.length === maxLines) {
    const reconstructed = lines.join(' ');
    if (reconstructed.length + 2 < words.join(' ').length) {
      let last = lines[maxLines - 1];
      while (last.length > 3 && ctx.measureText(`${last}..`).width > maxLineWidth) {
        last = last.slice(0, -1);
      }
      lines[maxLines - 1] = `${last}..`;
    }
  }

  return lines;
}

export function updateBotBillboard(
  bb: BotBillboard,
  botName: string,
  action: string,
  speech: string,
  isModelActive: boolean,
) {
  const { canvas, ctx } = bb;

  const speechFont = 'bold 24px monospace';
  const nameFont = 'bold 24px sans-serif';
  const nameText = `${botName} · ${action}`;

  ctx.font = nameFont;
  const nameTextW = ctx.measureText(nameText).width;
  const nameBadgeW = Math.max(300, Math.ceil(nameTextW) + 56);
  const nameBadgeH = 54;

  let lines: string[] = [];
  let bubbleW = 0;
  let bubbleH = 0;
  const padX = 28;
  const padY = 18;
  const lineHeight = 32;

  if (speech.trim()) {
    ctx.font = speechFont;
    const maxTextW = 540;
    lines = wrapTextLines(ctx, speech, maxTextW, 5);
    const widestLine = lines.reduce(
      (maxW, line) => Math.max(maxW, ctx.measureText(line).width),
      0,
    );
    bubbleW = Math.max(220, Math.min(620, Math.ceil(widestLine) + padX * 2));
    bubbleH = Math.max(66, lines.length * lineHeight + padY * 2);
  }

  const targetW = Math.max(512, bubbleW + 32, nameBadgeW + 32);
  const tailH = speech.trim() ? 14 : 0;
  const gapBetween = speech.trim() ? 10 : 0;
  const targetH = (speech.trim() ? bubbleH + tailH + gapBetween : 0) + nameBadgeH + 20;

  const sizeChanged = canvas.width !== targetW || canvas.height !== targetH;
  if (sizeChanged) {
    canvas.width = targetW;
    canvas.height = targetH;
    const oldTex = bb.texture;
    const newTex = new THREE.CanvasTexture(canvas);
    newTex.colorSpace = THREE.SRGBColorSpace;
    bb.texture = newTex;
    const mat = bb.sprite.material as THREE.SpriteMaterial;
    mat.map = newTex;
    mat.needsUpdate = true;
    oldTex.dispose();
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  let currentY = 8;
  if (lines.length > 0) {
    const bubbleX = (canvas.width - bubbleW) / 2;
    const bubbleStroke = isModelActive ? '#38BDF8' : '#94A3B8';

    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = bubbleStroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(bubbleX, currentY, bubbleW, bubbleH, 16);
    ctx.fill();
    ctx.stroke();

    // Pointer tail connecting speech bubble to the name badge
    const cx = canvas.width / 2;
    const tailTop = currentY + bubbleH - 1;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.moveTo(cx - 11, tailTop);
    ctx.lineTo(cx, tailTop + tailH);
    ctx.lineTo(cx + 11, tailTop);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = bubbleStroke;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - 11, tailTop + 1);
    ctx.lineTo(cx, tailTop + tailH);
    ctx.lineTo(cx + 11, tailTop + 1);
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.font = speechFont;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const firstLineY = currentY + padY + lineHeight / 2;
    lines.forEach((line, idx) => {
      ctx.fillText(line, cx, firstLineY + idx * lineHeight);
    });

    currentY += bubbleH + tailH + gapBetween;
  }

  const badgeX = (canvas.width - nameBadgeW) / 2;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
  ctx.strokeStyle = isModelActive ? '#22C55E' : '#FACC15';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(badgeX, currentY, nameBadgeW, nameBadgeH, 12);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isModelActive ? '#4ADE80' : '#FDE047';
  ctx.font = nameFont;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameText, canvas.width / 2, currentY + nameBadgeH / 2 + 1);

  // Scale sprite proportionally to canvas pixels & anchor above avatar head
  const worldPerPx = 4.1 / 512;
  const worldW = canvas.width * worldPerPx;
  const worldH = canvas.height * worldPerPx;
  bb.sprite.scale.set(worldW, worldH, 1);
  bb.sprite.position.set(0, 3.42 + worldH * 0.5, 0);

  bb.texture.needsUpdate = true;
}
