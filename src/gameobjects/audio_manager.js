/**
 * AudioManager — dual-layer music system with zone crossfade + storm intensity.
 *
 * Architecture:
 *   Layer 1 (zone base):    One of 5 zone tracks, loops continuously.
 *                           Crossfades on zone transition (500ms).
 *   Layer 2 (storm overlay): One of 4 storm intensity tracks, loops continuously.
 *                           Crossfades on phase change (2000ms).
 *
 * Graceful degradation: if an audio key hasn't been loaded (Suno tracks not
 * yet generated), every play/crossfade is a silent no-op. The game never
 * crashes due to missing music.
 */

const ZONE_SUFFIXES = ['cypress', 'us41', 'collier', 'conner', 'lolhs'];
const ZONE_FADE_MS  = 500;
const STORM_FADE_MS = 2000;

// Volume tables: zone base layer ducks under storm as intensity rises
const ZONE_VOL = { 1: 0.35, 2: 0.35, 3: 0.25, 4: 0.25 };
const STORM_VOL = { 1: 0.0, 2: 0.15, 3: 0.30, 4: 0.45 };

export default class AudioManager {
  constructor(scene) {
    this._scene = scene;
    this._muted = localStorage.getItem('musicMuted') === '1';

    // Active music layer references
    this._zoneSound = null;
    this._stormSound = null;
    this._currentZoneKey = null;
    this._currentStormKey = null;

    // Active crossfade tweens
    this._zoneFadeOut = null;
    this._zoneFadeIn = null;
    this._stormFadeOut = null;
    this._stormFadeIn = null;

    // Wire up event listeners
    this._onZoneChanged = this._onZoneChanged.bind(this);
    this._onStormPhaseChanged = this._onStormPhaseChanged.bind(this);

    scene.events.on('zoneChanged', this._onZoneChanged);
    scene.registry.on('changedata-stormPhase', this._onStormPhaseChanged);
    scene.events.once('shutdown', () => this._cleanup());
  }

  _onZoneChanged(zoneId) {
    if (zoneId < 0 || zoneId >= ZONE_SUFFIXES.length) return;
    const newZoneKey = `zone${zoneId}_${ZONE_SUFFIXES[zoneId]}`;
    if (newZoneKey === this._currentZoneKey) return;

    this._crossfadeZone(newZoneKey);
  }

  _onStormPhaseChanged(parent, key, value) {
    const phase = value; // 1, 2, 3, or 4
    const newStormKey = `storm_phase${phase}`;
    if (newStormKey === this._currentStormKey) return;

    this._crossfadeStorm(newStormKey, phase);
  }

  _crossfadeZone(newZoneKey) {
    const sound = this._scene.sound.get(newZoneKey);
    if (!sound) return; // Graceful degradation: track not loaded

    // Kill any in-flight tween
    if (this._zoneFadeOut) this._zoneFadeOut.stop();
    if (this._zoneFadeIn) this._zoneFadeIn.stop();

    // Fade out current
    if (this._zoneSound && this._zoneSound.isPlaying) {
      this._zoneFadeOut = this._scene.tweens.add({
        targets: this._zoneSound,
        volume: 0,
        duration: ZONE_FADE_MS,
        onComplete: () => this._zoneSound.stop(),
      });
    }

    // Fade in new
    const newVol = ZONE_VOL[this._scene.registry.get('stormPhase') || 1] || 0.35;
    sound.volume = 0;
    sound.loop = true;
    sound.play();

    this._zoneFadeIn = this._scene.tweens.add({
      targets: sound,
      volume: newVol,
      duration: ZONE_FADE_MS,
    });

    this._zoneSound = sound;
    this._currentZoneKey = newZoneKey;
  }

  _crossfadeStorm(newStormKey, phase) {
    const sound = this._scene.sound.get(newStormKey);
    if (!sound) return; // Graceful degradation

    // Kill in-flight tweens
    if (this._stormFadeOut) this._stormFadeOut.stop();
    if (this._stormFadeIn) this._stormFadeIn.stop();

    // Fade out current
    if (this._stormSound && this._stormSound.isPlaying) {
      this._stormFadeOut = this._scene.tweens.add({
        targets: this._stormSound,
        volume: 0,
        duration: STORM_FADE_MS,
        onComplete: () => this._stormSound.stop(),
      });
    }

    // Fade in new
    const newVol = STORM_VOL[phase] || 0;
    sound.volume = 0;
    sound.loop = true;
    sound.play();

    this._stormFadeIn = this._scene.tweens.add({
      targets: sound,
      volume: newVol,
      duration: STORM_FADE_MS,
    });

    this._stormSound = sound;
    this._currentStormKey = newStormKey;
  }

  toggleMute() {
    this._muted = !this._muted;
    localStorage.setItem('musicMuted', this._muted ? '1' : '0');
    
    if (this._zoneSound) this._zoneSound.mute = this._muted;
    if (this._stormSound) this._stormSound.mute = this._muted;
  }

  _cleanup() {
    if (this._zoneFadeOut) this._zoneFadeOut.stop();
    if (this._zoneFadeIn) this._zoneFadeIn.stop();
    if (this._stormFadeOut) this._stormFadeOut.stop();
    if (this._stormFadeIn) this._stormFadeIn.stop();

    if (this._zoneSound) this._zoneSound.stop();
    if (this._stormSound) this._stormSound.stop();

    this._scene.events.off('zoneChanged', this._onZoneChanged);
    this._scene.registry.off('changedata-stormPhase', this._onStormPhaseChanged);
  }
}
