/**
 * AudioManager -- dual-layer music system with zone crossfade + storm intensity.
 *
 * Architecture:
 *   Layer 1 (zone base):    One of 5 zone tracks, loops continuously.
 *                           Crossfades on zone transition (500ms).
 *   Layer 2 (storm overlay): One of 4 storm intensity tracks, loops continuously.
 *                           Crossfades on phase change (2000ms).
 *   One-shots:              Install sting, launch fanfare, failure drone.
 *
 * Graceful degradation: if an audio key hasn't been loaded (Suno tracks not
 * yet generated), every play/crossfade is a silent no-op. The game never
 * crashes due to missing music.
 *
 * Integration:
 *   - Listens to scene 'zoneChanged' event (from game.js transitionToZone)
 *   - Listens to registry 'changedata-stormPhase' (from StormManager)
 *   - Exposes playSFX() as drop-in for the old game.playAudio() interface
 *   - Cleans up all listeners on scene shutdown
 */

// ── Volume tables ────────────────────────────────────────────────────────────
// Zone base layer ducks under the storm layer as intensity rises.
const ZONE_VOL = { 1: 0.35, 2: 0.35, 3: 0.25, 4: 0.25 };

// Storm layer starts silent and ramps up per phase.
const STORM_VOL = { 1: 0.0, 2: 0.15, 3: 0.30, 4: 0.45 };

// ── Crossfade durations (ms) ─────────────────────────────────────────────────
const ZONE_FADE_MS  = 500;
const STORM_FADE_MS = 2000;

// ── Zone key suffixes (match filenames in public/assets/music/) ──────────────
const ZONE_SUFFIXES = ['cypress', 'us41', 'collier', 'conner', 'lolhs'];

export default class AudioManager {
  /**
   * @param {Phaser.Scene} scene -- the GameScene instance
   */
  constructor(scene) {
    this._scene = scene;
    this._muted = localStorage.getItem('musicMuted') === '1';

    // Active music layer references
    this._zoneSound     = null;   // Phaser.Sound.BaseSound
    this._stormSound    = null;   // Phaser.Sound.BaseSound
    this._currentZoneKey  = null; // e.g. 'zone_cypress'
    this._currentStormKey = null; // e.g. 'storm_phase1'

    // Active crossfade tweens (tracked so we can kill on overlap)
    this._zoneFadeOut  = null;
    this._zoneFadeIn   = null;
    this._stormFadeOut = null;
    this._stormFadeIn  = null;

    // Legacy SFX cache (fire-and-forget sounds loaded via old bootloader)
    this._sfxCache = {};

    // ── Wire up event listeners ──────────────────────────────────────────────
    this._onZoneChanged = this._onZoneChanged.bind(this);
    this._onStormPhaseChanged = this._onStormPhaseChanged.bind(this);

    scene.events.on('zoneChanged', this._onZoneChanged);
    scene.registry.events.on('changedata-stormPhase', this._onStormPhaseChanged);

    // Cleanup on scene shutdown (death/restart)
    scene.events.once('shutdown', this.destroy, this);

    // Apply global mute state
    if (this._muted) {
      scene.sound.mute = true;
    }

    // ── Start initial layers ─────────────────────────────────────────────────
    // Zone 0 is always the starting zone
    const initialPhase = scene.registry.get('stormPhase') ?? 1;
    this._startZoneTrack(0, initialPhase);
    this._startStormTrack(initialPhase);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Drop-in replacement for the old game.playAudio(key).
   * Fire-and-forget SFX that respects the mute toggle.
   */
  playSFX(key) {
    if (!this._scene?.cache.audio.exists(key)) return;
    try {
      this._scene.sound.play(key);
    } catch (_) {
      // Swallow — sound may have been disposed during shutdown
    }
  }

  /**
   * Play a one-shot sting (install, launch, failure).
   * Slightly louder than ambient; non-looping.
   */
  playSting(key) {
    if (!this._scene?.cache.audio.exists(key)) return;
    try {
      this._scene.sound.play(key, { volume: 0.5, loop: false });
    } catch (_) {
      // Swallow
    }
  }

  /**
   * Toggle music mute. Persists to localStorage.
   */
  setMuted(muted) {
    this._muted = muted;
    if (this._scene) {
      this._scene.sound.mute = muted;
    }
    localStorage.setItem('musicMuted', muted ? '1' : '0');
  }

  /**
   * Tear down all listeners and active sounds. Called on scene shutdown.
   */
  destroy() {
    // Kill active tweens
    this._killTween('_zoneFadeOut');
    this._killTween('_zoneFadeIn');
    this._killTween('_stormFadeOut');
    this._killTween('_stormFadeIn');

    // Stop and destroy active music
    this._destroySound('_zoneSound');
    this._destroySound('_stormSound');

    // Detach event listeners
    if (this._scene) {
      this._scene.events.off('zoneChanged', this._onZoneChanged);
      this._scene.events.off('shutdown', this.destroy, this);
      this._scene.registry.events.off(
        'changedata-stormPhase', this._onStormPhaseChanged
      );
    }

    this._scene = null;
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  /**
   * Fired by game.js transitionToZone() after the zone swap.
   * @param {number} zoneId -- 0-4
   */
  _onZoneChanged(zoneId) {
    const phase = this._scene?.registry.get('stormPhase') ?? 1;
    this._crossfadeZone(zoneId, phase);
  }

  /**
   * Fired by StormManager when registry.stormPhase changes.
   * @param {*}      _parent -- registry ref (unused)
   * @param {number} phase   -- 1-4
   */
  _onStormPhaseChanged(_parent, phase) {
    this._crossfadeStorm(phase);
    this._duckZoneVolume(phase);
  }

  // ── Zone layer ─────────────────────────────────────────────────────────────

  /**
   * Start the initial zone track (no crossfade, just play).
   */
  _startZoneTrack(zoneId, phase) {
    const key = this._zoneKey(zoneId);
    this._currentZoneKey = key;
    this._zoneSound = this._safePlay(key, {
      volume: ZONE_VOL[phase] ?? 0.35,
      loop: true,
    });
  }

  /**
   * 500ms crossfade from current zone track to the new zone.
   */
  _crossfadeZone(zoneId, phase) {
    const newKey = this._zoneKey(zoneId);
    if (newKey === this._currentZoneKey) return; // same zone, no-op

    // Kill any in-progress zone crossfade
    this._killTween('_zoneFadeOut');
    this._killTween('_zoneFadeIn');

    const targetVol = ZONE_VOL[phase] ?? 0.35;

    // Fade out old
    if (this._zoneSound) {
      const oldSound = this._zoneSound;
      this._zoneFadeOut = this._fadeTo(oldSound, 0, ZONE_FADE_MS, () => {
        oldSound.stop();
        oldSound.destroy();
      });
    }

    // Fade in new
    this._currentZoneKey = newKey;
    this._zoneSound = this._safePlay(newKey, { volume: 0, loop: true });
    if (this._zoneSound) {
      this._zoneFadeIn = this._fadeTo(this._zoneSound, targetVol, ZONE_FADE_MS);
    }
  }

  // ── Storm layer ────────────────────────────────────────────────────────────

  /**
   * Start the initial storm track (silent for Phase 1).
   */
  _startStormTrack(phase) {
    const key = this._stormKey(phase);
    this._currentStormKey = key;
    const vol = STORM_VOL[phase] ?? 0;
    if (vol <= 0) return; // Phase 1 is silent — don't even load
    this._stormSound = this._safePlay(key, { volume: vol, loop: true });
  }

  /**
   * 2000ms crossfade from current storm track to the new phase.
   */
  _crossfadeStorm(phase) {
    const newKey = this._stormKey(phase);
    if (newKey === this._currentStormKey) return;

    // Kill any in-progress storm crossfade
    this._killTween('_stormFadeOut');
    this._killTween('_stormFadeIn');

    const targetVol = STORM_VOL[phase] ?? 0;

    // Fade out old
    if (this._stormSound) {
      const oldSound = this._stormSound;
      this._stormFadeOut = this._fadeTo(oldSound, 0, STORM_FADE_MS, () => {
        oldSound.stop();
        oldSound.destroy();
      });
    }

    // Fade in new (skip if target volume is 0)
    this._currentStormKey = newKey;
    if (targetVol > 0) {
      this._stormSound = this._safePlay(newKey, { volume: 0, loop: true });
      if (this._stormSound) {
        this._stormFadeIn = this._fadeTo(this._stormSound, targetVol, STORM_FADE_MS);
      }
    } else {
      this._stormSound = null;
    }
  }

  /**
   * Duck the zone base volume when the storm layer gets loud.
   */
  _duckZoneVolume(phase) {
    if (!this._zoneSound) return;
    const targetVol = ZONE_VOL[phase] ?? 0.35;
    // Quick duck (200ms) so it doesn't feel laggy
    this._fadeTo(this._zoneSound, targetVol, 200);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Build the audio key for a zone track.
   * Maps to bootloader keys: 'zone_cypress', 'zone_us41', etc.
   */
  _zoneKey(zoneId) {
    return `zone_${ZONE_SUFFIXES[zoneId] ?? 'cypress'}`;
  }

  /**
   * Build the audio key for a storm track.
   * Maps to bootloader keys: 'storm_phase1', 'storm_phase2', etc.
   */
  _stormKey(phase) {
    return `storm_phase${phase}`;
  }

  /**
   * Safely create and play a sound. Returns the Sound instance or null
   * if the key doesn't exist in the audio cache (track not yet generated).
   */
  _safePlay(key, config) {
    if (!this._scene?.cache.audio.exists(key)) return null;
    try {
      const sound = this._scene.sound.add(key, config);
      sound.play();
      return sound;
    } catch (_) {
      return null;
    }
  }

  /**
   * Tween a sound's volume to a target over duration.
   * Returns the tween so it can be killed on overlap.
   */
  _fadeTo(sound, targetVolume, duration, onComplete) {
    if (!sound || !this._scene) return null;
    return this._scene.tweens.add({
      targets: sound,
      volume:  targetVolume,
      duration,
      onComplete: onComplete ? () => onComplete() : undefined,
    });
  }

  /**
   * Kill an active tween stored in a named property.
   */
  _killTween(prop) {
    if (this[prop]) {
      this[prop].stop();
      this[prop] = null;
    }
  }

  /**
   * Stop + destroy a sound stored in a named property.
   */
  _destroySound(prop) {
    if (this[prop]) {
      try {
        this[prop].stop();
        this[prop].destroy();
      } catch (_) {
        // Sound may already be disposed
      }
      this[prop] = null;
    }
  }
}
