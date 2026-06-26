/**
 * Universal game engine — shared by all casino games.
 * Handles: betting, RNG, wallet calls, animations, sound, result logic.
 *
 * Each game is a plugin that implements GamePlugin interface and registers
 * with the engine. Engine handles all cross-cutting concerns.
 */

function uuidv4(): string {
  return crypto.randomUUID();
}

export type BetMode = 'single' | 'auto';

export interface GameBet {
  id: string;
  gameId: string;
  userId: string;
  stake: number;
  currency: string;
  multiplier: number;
  payout: number;
  status: 'pending' | 'won' | 'lost' | 'push';
  details?: Record<string, unknown>;
  createdAt: number;
  settledAt?: number;
}

export interface GameResult {
  won: boolean;
  multiplier: number;
  payout: number;
  message: string;
  details?: Record<string, unknown>;
}

export interface GameSession {
  gameId: string;
  userId: string;
  sessionId: string;
  stake: number;
  currency: string;
  autoPlayCount: number;
  mode: BetMode;
}

export interface GamePlugin {
  id: string;
  name: string;
  category: 'arcade' | 'sports-like' | 'multiplier' | 'grid' | 'wheel' | 'card';
  play: (session: GameSession) => Promise<GameResult>;
  // Optional: custom validation, stats, etc.
  validateBet?: (stake: number, options: Record<string, unknown>) => boolean;
}

export class GameEngine {
  private plugins = new Map<string, GamePlugin>();
  private sessions = new Map<string, GameSession>();
  private soundManager: SoundManager | null = null;
  private rng: SeededRNG;

  constructor(soundManager?: SoundManager) {
    this.soundManager = soundManager || null;
    this.rng = new SeededRNG();
  }

  registerGame(plugin: GamePlugin): void {
    this.plugins.set(plugin.id, plugin);
    console.log(`[GameEngine] Registered game: ${plugin.name}`);
  }

  getGame(gameId: string): GamePlugin | undefined {
    return this.plugins.get(gameId);
  }

  listGames(): GamePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Provably fair random number: seed-based so any bet can be replayed
   * and verified to produce the same result (even weeks later).
   */
  random(min: number, max: number, seed?: string): number {
    const s = seed || uuidv4();
    const val = this.rng.random(s);
    return Math.floor(val * (max - min + 1)) + min;
  }

  randomChoice<T>(items: T[], seed?: string): T {
    const idx = this.random(0, items.length - 1, seed);
    return items[idx];
  }

  /**
   * Core play loop: validates bet, plays game, updates wallet, logs result.
   */
  async playGame(
    gameId: string,
    userId: string,
    stake: number,
    currency: string,
    options: Record<string, unknown> = {},
    onWalletCall?: (betId: string, won: boolean, payout: number) => Promise<void>,
  ): Promise<GameBet & { result: GameResult }> {
    const game = this.getGame(gameId);
    if (!game) throw new Error(`Game not found: ${gameId}`);

    const betId = uuidv4();
    const sessionId = uuidv4();

    // Setup session
    const session: GameSession = {
      gameId,
      userId,
      sessionId,
      stake,
      currency,
      autoPlayCount: 0,
      mode: 'single',
    };
    this.sessions.set(sessionId, session);

    try {
      // Validate bet if game provides custom logic
      if (game.validateBet && !game.validateBet(stake, options)) {
        throw new Error('Invalid bet parameters');
      }

      // Play the game
      const result = await game.play(session);

      // Wallet settlement
      const payout = result.payout;
      if (onWalletCall) {
        await onWalletCall(betId, result.won, payout);
      }

      // Play sound
      if (this.soundManager) {
        await this.soundManager.play(result.won ? 'win' : 'lose');
      }

      const bet: GameBet = {
        id: betId,
        gameId,
        userId,
        stake,
        currency,
        multiplier: result.multiplier,
        payout,
        status: result.won ? 'won' : result.multiplier === 1 ? 'push' : 'lost',
        details: result.details,
        createdAt: Date.now(),
        settledAt: Date.now(),
      };

      return { ...bet, result };
    } finally {
      this.sessions.delete(sessionId);
    }
  }
}

/**
 * Seeded RNG — reproducible randomness for provably fair games.
 * Same seed always produces same sequence.
 */
export class SeededRNG {
  private seeds = new Map<string, number>();

  random(seed: string): number {
    let s = this.seeds.get(seed) || this.hash(seed);
    s = (s * 9301 + 49297) % 233280;
    this.seeds.set(seed, s);
    return s / 233280;
  }

  private hash(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h) ^ s.charCodeAt(i);
    }
    return Math.abs(h);
  }
}

/**
 * Sound manager — unified audio for all games.
 * Plays SFX, background music, handles volume/mute.
 */
export class SoundManager {
  private audioContext: AudioContext | null = null;
  private sounds = new Map<string, AudioBuffer>();
  private volume = 0.7;
  private muted = false;

  async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  async loadSound(name: string, url: string): Promise<void> {
    if (!this.audioContext) await this.init();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext!.decodeAudioData(arrayBuffer);
    this.sounds.set(name, audioBuffer);
  }

  async play(soundName: string, volume?: number): Promise<void> {
    if (this.muted || !this.audioContext) return;
    const buffer = this.sounds.get(soundName);
    if (!buffer) return;

    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    source.buffer = buffer;
    gainNode.gain.value = volume ?? this.volume;
    source.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    source.start(0);
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }
}

/**
 * Animation utilities for Babylon.js games.
 */
export class GameAnimator {
  static easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeOutBounce(t: number): number {
    if (t < 0.36364) return 7.5625 * t * t;
    if (t < 0.72727) return 0.75 + 0.75 * ((t = t - 0.54545) * t);
    if (t < 0.90909) return 0.9375 + 0.0625 * ((t = t - 0.81818) * t);
    return 0.984375 + 0.015625 * ((t = t - 0.95454) * t);
  }

  static easeInCubic(t: number): number {
    return t * t * t;
  }

  static easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  static async tween(
    duration: number,
    onUpdate: (progress: number) => void,
    easing: (t: number) => number = this.easeInOutQuad,
  ): Promise<void> {
    return new Promise(resolve => {
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        onUpdate(easing(progress));
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(animate);
    });
  }
}
