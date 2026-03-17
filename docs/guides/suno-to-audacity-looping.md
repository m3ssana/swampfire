# Suno to Game: Preparing Music Tracks for Swampfire

The game handles looping in code — you don't need to make the file loop-length perfect. Your job is just: **export Suno tracks as OGG, trim any dead silence, drop them in the folder.**

OGG Vorbis is the target format because it loops gaplessly in the browser. MP3 adds invisible silence padding at the start/end which creates an audible hiccup on every loop. OGG doesn't have this problem.

---

## What You Need

- **Audacity** (free): [https://www.audacityteam.org/download/](https://www.audacityteam.org/download/)
- Your Suno-generated `.mp3` file

That's it. No plugins needed — Audacity exports OGG natively.

---

## Step 1: Open Your Suno Track

1. Open Audacity
2. `File > Open` and select your downloaded Suno MP3
3. You'll see the waveform (blue squiggly lines)

---

## Step 2: Trim Dead Silence (If Any)

Suno sometimes adds a second of silence at the start or a fade-to-nothing at the end. Remove it:

1. Zoom in on the **start** of the track (`Ctrl + Scroll Up`)
2. If there's flat silence before the music begins, click and drag to select just that silence
3. Press `Delete` to remove it
4. Do the same at the **end** — zoom in, select any trailing silence or long fade-out, delete it

> If the track starts and ends with music (no dead air), skip this step entirely.

---

## Step 3: Quick Listen Check

1. Select all audio: `Ctrl + A`
2. Loop play: `Shift + Space`
3. Listen to the transition from end back to start. You're checking for:
   - **Jarring volume change** (end much louder/quieter than start)
   - **Rhythmic hiccup** (if the music has a beat, does it stumble at the loop?)

If it sounds rough, try trimming a beat or two from the end so the rhythm wraps more naturally. But don't overthink it — the game crossfades between tracks on zone transitions anyway, so most players won't hear a raw loop-point very often.

---

## Step 4: Export as OGG

1. `File > Export Audio`
2. In the export dialog:
   - **Format:** OGG Vorbis (select from the format dropdown)
   - **Quality:** 6 (default, roughly equivalent to 160kbps — good for game audio)
3. Use the exact filenames from the table below
4. **Save to:** `public/assets/music/` in the Swampfire project folder
5. Audacity may show a metadata dialog — leave it blank or fill in "Swampfire Protocol". Click OK.

### Filenames

| Track | Filename |
|-------|----------|
| Zone 0 - Cypress Creek | `zone0_cypress.ogg` |
| Zone 1 - US-41 | `zone1_us41.ogg` |
| Zone 2 - Collier Commons | `zone2_collier.ogg` |
| Zone 3 - Conner Preserve | `zone3_conner.ogg` |
| Zone 4 - LOLHS | `zone4_lolhs.ogg` |
| Storm Phase 1 | `storm_phase1.ogg` |
| Storm Phase 2 | `storm_phase2.ogg` |
| Storm Phase 3 | `storm_phase3.ogg` |
| Storm Phase 4 | `storm_phase4.ogg` |
| Menu Theme | `menu_theme.ogg` |
| Install Sting | `sting_install.ogg` |
| Launch Sting | `sting_launch.ogg` |
| Failure Sting | `sting_failure.ogg` |

> **Safari users:** If you also want Safari support, export a second copy as MP3 (128kbps) with the same base filename but `.mp3` extension. The game tries OGG first and falls back to MP3 automatically. Safari is the only major browser that doesn't support OGG.

---

## Step 5: Verify in Game

1. Drop the `.ogg` file into `public/assets/music/`
2. Run `npm run dev`
3. Start the game — the AudioManager picks up any track that exists and loops it automatically
4. Walk between zones to hear crossfades
5. Wait for storm phase changes to hear the intensity layers build

---

## Quick Reference

| Type | What Suno Should Generate | Loop? |
|------|--------------------------|-------|
| Zone base tracks | ~60-120 seconds of ambient music | Yes (game loops it) |
| Storm intensity layers | ~30-60 seconds of tension music | Yes (game loops it) |
| Menu theme | ~60 seconds | Yes (game loops it) |
| Install sting | ~3 seconds | No (one-shot) |
| Launch sting | ~15 seconds | No (one-shot) |
| Failure sting | ~8 seconds | No (one-shot) |

**The track doesn't need to be exactly these lengths.** The game loops whatever you give it. Shorter tracks are fine — they just repeat sooner. Aim for enough music that the repetition isn't obvious (30s minimum for looping tracks).

---

## Troubleshooting

**"I hear a click/pop every time the music loops"**
You're probably using MP3 instead of OGG. MP3 encoding adds padding frames that create a gap at the loop point. Export as OGG instead — it loops gaplessly.

**"The loop has an awkward pause"**
Trim the dead silence at the end of the track (Step 2). Suno sometimes fades to silence before the track ends.

**"Audacity can't open the Suno file"**
Make sure you downloaded the actual MP3 from Suno (not a streaming link). If Suno gave you a `.wav`, that works too.

**"The file is too large"**
OGG at quality 6 should be roughly 1.2MB per minute of stereo audio. All 13 tracks together should be under 12MB. If much larger, check that you exported as OGG (not WAV).

**"Music doesn't play in Safari"**
Safari doesn't support OGG. Export an MP3 copy alongside each OGG (same filename, `.mp3` extension). The game automatically falls back to MP3 when OGG isn't supported.
