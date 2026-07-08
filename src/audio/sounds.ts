/**
 * Defensive audio manager. Every path is wrapped so a missing module, a codec
 * quirk, or an autoplay block can NEVER crash the game — audio simply stays silent.
 *
 * SFX are synthesized placeholders (see scripts note); swap in pro audio later at the
 * same paths. Voice lines have a manifest + hooks but no bundled files yet — drop
 * ElevenLabs mp3s into assets/audio/voice/ and register them in VOICE_FILES to enable.
 */
import { useStore } from '@/state/store';

type ExpoAudio = typeof import('expo-audio');
let AudioMod: ExpoAudio | null = null;
try {
  // Lazy, guarded — if the native module isn't present we degrade to silence.
  AudioMod = require('expo-audio');
} catch {
  AudioMod = null;
}

const SFX = {
  click: require('../../assets/audio/sfx/click.wav'),
  place: require('../../assets/audio/sfx/place.wav'),
  hit: require('../../assets/audio/sfx/hit.wav'),
  crit: require('../../assets/audio/sfx/crit.wav'),
  death: require('../../assets/audio/sfx/death.wav'),
  waveclear: require('../../assets/audio/sfx/waveclear.wav'),
  boss: require('../../assets/audio/sfx/boss.wav'),
  win: require('../../assets/audio/sfx/win.wav'),
  lose: require('../../assets/audio/sfx/lose.wav'),
} as const;

export type SfxName = keyof typeof SFX;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const players: Partial<Record<SfxName, any>> = {};
const lastPlayed: Partial<Record<SfxName, number>> = {};

function sfxOn(): boolean {
  try {
    return useStore.getState().settings.sfx;
  } catch {
    return false;
  }
}

function voiceOn(): boolean {
  try {
    return useStore.getState().settings.voice;
  } catch {
    return false;
  }
}

/** Fire a one-shot SFX. No-op if disabled, unsupported, or anything throws. */
export function playSfx(name: SfxName): void {
  if (!AudioMod || !sfxOn()) return;
  try {
    let p = players[name];
    if (!p) {
      p = AudioMod.createAudioPlayer(SFX[name]);
      players[name] = p;
    }
    p.seekTo(0);
    p.play();
  } catch {
    /* silence */
  }
}

/** Rate-limited SFX for high-frequency events (kills, crits) so it doesn't machine-gun. */
export function playSfxThrottled(name: SfxName, minGapMs = 110): void {
  const now = Date.now();
  if (now - (lastPlayed[name] ?? 0) < minGapMs) return;
  lastPlayed[name] = now;
  playSfx(name);
}

// ---- Voice (manifest ready; audio pending ElevenLabs) ----

export type VoiceChar = 'corvus' | 'sage' | 'pip' | 'mira';
export type VoiceEvent =
  | 'tower_placed'
  | 'crit'
  | 'enemy_death'
  | 'wave_clear'
  | 'boss_spawn'
  | 'boss_phase2'
  | 'prestige'
  | 'campaign_won';

/** Line script to pre-record with ElevenLabs (spec Part 6). Text is the record sheet. */
export const VOICE_LINES: Partial<Record<VoiceChar, Partial<Record<VoiceEvent, string>>>> = {
  corvus: {
    tower_placed: 'THIS tower? Bold choice.',
    crit: 'PERFECT!',
    enemy_death: 'One less ghost!',
    wave_clear: "They're scared now. I can smell it.",
    boss_spawn: 'Oh, HERE we go.',
    prestige: 'Eternal recurrence. I love it.',
  },
  sage: {
    tower_placed: 'Strategic placement.',
    campaign_won: 'We have bought another cycle.',
    boss_phase2: 'Its nature changes. Adapt.',
    prestige: 'The pattern repeats.',
  },
  pip: {
    crit: 'GOT IT!',
    enemy_death: 'NEXT?',
    wave_clear: 'Can we do that again??',
  },
  mira: {
    boss_spawn: 'The fallen feed the next war.',
    prestige: 'Begin again.',
  },
};

// Register bundled voice audio here once recorded, e.g. corvus_tower_placed: require('.../corvus/tower_placed.mp3')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const VOICE_FILES: Record<string, any> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const voicePlayers: Record<string, any> = {};

/** Play a character voice line if its audio is bundled + voice is enabled. No-op otherwise. */
export function playVoice(character: VoiceChar, event: VoiceEvent): void {
  if (!AudioMod || !voiceOn()) return;
  const key = `${character}_${event}`;
  const src = VOICE_FILES[key];
  if (!src) return; // no audio yet — silently skip
  try {
    let p = voicePlayers[key];
    if (!p) {
      p = AudioMod.createAudioPlayer(src);
      voicePlayers[key] = p;
    }
    p.seekTo(0);
    p.play();
  } catch {
    /* silence */
  }
}
