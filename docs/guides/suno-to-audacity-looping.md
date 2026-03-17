# Suno to Audacity: Creating Seamless 120s Loops for Swampfire

This guide walks you through taking a raw Suno-generated track and turning it into a clean looping MP3 for the game. No prior Audacity experience needed.

---

## What You Need

- **Audacity** (free): [https://www.audacityteam.org/download/](https://www.audacityteam.org/download/)
- **LAME MP3 encoder**: Audacity will prompt you to install this the first time you export MP3. Just follow the prompt.
- Your Suno-generated `.mp3` file (usually 60-240 seconds long)

---

## Step 1: Open Your Suno Track

1. Open Audacity
2. `File > Open` and select your downloaded Suno MP3
3. You'll see the waveform (the blue squiggly lines) — this is your audio

The bottom of the screen shows **Selection Start** and **Length** or **End** in seconds. Make sure the dropdown next to these says **seconds** (not hh:mm:ss).

---

## Step 2: Select Exactly 120 Seconds

You need a clean 120.000-second region. Don't eyeball it — use exact numbers.

1. Click anywhere in the waveform to place your cursor
2. At the bottom of the screen, find the **Selection** toolbar:
   ```
   Selection Start: [______]    Length: [______]
   ```
3. Click the **Selection Start** box and type `0.000`
4. Click the **Length** box and type `120.000`
5. The waveform should now show a highlighted region from 0 to 120 seconds

> **Tip:** If your Suno track is shorter than 120s, that's fine. Use whatever length you got (e.g., 60s for storm tracks). The game loops whatever you give it.

---

## Step 3: Find a Good Loop Point (Zero-Cross Trim)

The beginning and end of your loop need to meet cleanly, or you'll hear a **click/pop** every time it repeats. Here's how to fix that:

### Check the start:
1. Zoom into the very beginning: `Ctrl + Scroll Wheel Up` (or `View > Zoom In`) while your cursor is at the start
2. Look at where the waveform crosses the **center line** (the horizontal line at 0.0 amplitude). This is called a **zero crossing**
3. If the waveform starts right at or near the center line, you're good

### Check the end:
1. Press `End` key to jump to the end of your selection
2. Zoom in on the end point (around the 120.000s mark)
3. The waveform should also be crossing the center line here

### Auto-fix both:
1. Make sure your 120s region is still selected (the blue highlight)
2. Go to `Select > At Zero Crossings` (or press `Z`)
3. Audacity will nudge your selection start and end to the nearest zero crossings
4. Your length might change by a few milliseconds (e.g., 119.998s or 120.003s) — that's perfect

---

## Step 4: Trim to Selection

Remove everything outside your selected region:

1. Make sure your 120s region is selected (blue highlight)
2. `Edit > Remove Special > Trim Audio` (or `Ctrl + T`)
3. Now you only have your 120s loop remaining

---

## Step 5: Apply a Micro-Fade (Optional but Recommended)

This adds a tiny invisible fade at the start and end to guarantee no click, even if the zero-cross wasn't perfect:

### Fade in (first 50ms):
1. Click at position `0.000` in the Selection Start box
2. Set Length to `0.050` (50 milliseconds)
3. `Effect > Fade In`

### Fade out (last 50ms):
1. Click at the end of the track. Set Selection Start to your track length minus 0.05
   - Example: if track is 120.003s, set Start to `119.953` and Length to `0.050`
2. `Effect > Fade Out`

> These fades are so short (50ms) they're inaudible, but they eliminate any residual pop.

---

## Step 6: Test the Loop

Before exporting, make sure it actually loops well:

1. `Edit > Preferences > Playback` (or `Ctrl + P` on some systems)
2. Check if there's a "Loop" option — if not, don't worry
3. Select all audio: `Ctrl + A`
4. Hit the green **Play** button
5. When it reaches the end, it should loop back to the start. Listen for:
   - **Clicks/pops** at the loop point (go back to Step 3)
   - **Jarring volume change** (the end should be roughly the same volume as the start)
   - **Rhythmic hiccup** (if the music has a beat, the loop should feel seamless)

> **Alternative loop test:** `Transport > Loop Play` (or `Shift + Space`) will loop the selected region continuously.

---

## Step 7: Export as MP3

1. `File > Export Audio` (or `File > Export > Export as MP3` in older versions)
2. In the export dialog:
   - **Format:** MP3
   - **Bit Rate Mode:** Constant
   - **Quality:** 128 kbps (good balance of quality vs file size for a game)
   - **Channel Mode:** Stereo (or Joint Stereo)
3. **Filename:** Use the exact names from the spec:

| Track | Filename |
|-------|----------|
| Zone 0 - Cypress Creek | `zone0_cypress.mp3` |
| Zone 1 - US-41 | `zone1_us41.mp3` |
| Zone 2 - Collier Commons | `zone2_collier.mp3` |
| Zone 3 - Conner Preserve | `zone3_conner.mp3` |
| Zone 4 - LOLHS | `zone4_lolhs.mp3` |
| Storm Phase 1 | `storm_phase1.mp3` |
| Storm Phase 2 | `storm_phase2.mp3` |
| Storm Phase 3 | `storm_phase3.mp3` |
| Storm Phase 4 | `storm_phase4.mp3` |
| Menu Theme | `menu_theme.mp3` |
| Install Sting | `sting_install.mp3` |
| Launch Sting | `sting_launch.mp3` |
| Failure Sting | `sting_failure.mp3` |

4. **Save location:** `public/assets/music/` in the Swampfire project folder
5. Audacity may show a metadata dialog — you can leave it blank or fill in "Swampfire Protocol" as the album. Click OK.

---

## Step 8: Verify in Game

1. Save the MP3 to `public/assets/music/`
2. Run `npm run dev` (or whatever starts the dev server)
3. Start the game — the AudioManager automatically picks up any track that exists
4. Walk between zones to hear crossfades
5. Wait for storm phase changes to hear the intensity layers

---

## Quick Reference: Track Durations

| Type | Target Duration | Notes |
|------|----------------|-------|
| Zone base tracks | **120 seconds** | Must loop seamlessly |
| Storm intensity layers | **60 seconds** | Must loop seamlessly |
| Menu theme | **60 seconds** | Must loop seamlessly |
| Install sting | **~3 seconds** | One-shot, no loop needed |
| Launch sting | **~15 seconds** | One-shot, no loop needed |
| Failure sting | **~8 seconds** | One-shot, no loop needed |

For one-shot stings (install, launch, failure): skip Steps 2-3 and just trim to the length you want. No loop point needed.

---

## Troubleshooting

**"I hear a click every time the music loops"**
Go back to Step 3 and use `Select > At Zero Crossings`. Also apply the micro-fades from Step 5.

**"The loop has an awkward pause"**
Your Suno track probably has a natural ending (fade-out or silence) before 120s. Try starting your selection a few seconds in (e.g., start at 4.000 instead of 0.000) and ending earlier to avoid the outro.

**"The music sounds different in-game vs Audacity"**
Phaser plays audio through WebAudio which can sound slightly different than desktop playback. The 128kbps MP3 encoding may also affect high frequencies. If it sounds muffled, try exporting at 192kbps instead.

**"Audacity can't open the Suno file"**
Make sure you downloaded the MP3 from Suno (not a streaming link). If Suno gave you a `.wav`, that works too — just export as MP3 in Step 7.

**"The file is too large"**
A 120s stereo MP3 at 128kbps should be about 1.9MB. All 13 tracks together should be under 15MB. If a file is much larger, check that you exported as MP3 (not WAV) and used 128kbps.
