# SWAMPFIRE PROTOCOL

## Game Specification Document

---

## 1. OVERVIEW

**Title:** Swampfire Protocol
**Engine:** Phaser 3.80+ (Matter.js physics)
**Platform:** Desktop browser (Chrome, Firefox, Edge), mobile-responsive
**Resolution:** 1280x720 (16:9 widescreen), Phaser.Scale.FIT with CENTER_BOTH
**Genre:** Top-down speed scavenger / countdown action
**Tone:** Urgent, humid, desperate. Florida swamp noir meets speedrun thriller.
**Target Session Length:** 55-65 minutes (one sitting, one shot, one hour)

**One-sentence pitch:** A hurricane hits in 60 minutes. Juan has a half-built rocket in the swamp. Scavenge the real streets of Land O' Lakes, FL 34639 for parts, slam them together, and launch before the storm erases everything -- in one breathless hour.

**Design Philosophy:** This game is built for the generation that grew up on TikTok, Subway Surfers, and dopamine-rich mobile games. Every second must feel productive. Every action must produce visible, audible, satisfying feedback. The player should never wonder "what do I do next?" or feel like they are wasting time. Progress is constant, visible, and celebrated. The hurricane is always escalating. The clock is always ticking. One hour. One run. Go.

---

## 2. NARRATIVE

### 2.1 Backstory

Juan is a former aerospace engineer who was laid off during budget cuts at a Cape Canaveral contractor. He relocated to Land O' Lakes, FL -- cheap land, low profile, deep wilderness in the preserves. Over five years he has been secretly constructing a single-seat escape rocket in a hidden clearing deep inside Cypress Creek Preserve, off Pump Station Road.

The rocket is 90% complete. It has heat shielding, a hybrid engine frame, and a guidance skeleton. What it does not have: a fuel injector, oxidizer, avionics wiring, and a battery array.

### 2.2 The Inciting Event

Hurricane Kendra -- a Category 6+ hypercane -- has formed in the Gulf of Mexico. NOAA models predict direct landfall on Tampa Bay in 60 minutes. The highways are gridlocked. The only way out is up.

### 2.3 Story Delivery -- The 10-Second Intro

The game opens with a **micro-intro** that lets players absorb each beat at their own pace. SPACE advances each phase:

1. Black screen. EMERGENCY ALERT SYSTEM banner. CRT static. Scrolling ticker: "HURRICANE KENDRA -- CAT 6 -- LANDFALL 60 MIN -- EVACUATE NOW". Press SPACE to continue.
2. Hard cut: the rocket in a clearing, clearly unfinished. Wind whipping. Press SPACE to continue.
3. Three words slam onto screen automatically, one at a time, with screen shake: "FIND. BUILD. LAUNCH." Press SPACE to continue.
4. The 60:00 countdown appears. Press SPACE to begin.

Self-paced. No auto-advance. Players can read the full EAS broadcast, study the rocket, absorb the mission before the clock starts. No text walls. No monologue. Pure visual storytelling.

**Why this works:** Players understand the stakes in four beats through visuals alone. The emergency broadcast is universally recognized. The unfinished rocket is self-explanatory. "FIND. BUILD. LAUNCH." is the entire tutorial. Everything else is learned by doing.

---

## 3. WORLD DESIGN -- LAND O' LAKES FL 34639

The game world is a compressed, game-paced interpretation of the real 34639 zip code. It preserves spatial relationships and real landmarks so that locals recognize it, but distances are compressed for a 60-minute experience. No zone should take more than 15-20 seconds to cross at full sprint.

### 3.1 World Structure

The map is divided into **5 interconnected zones** (reduced from 7 for pacing). Each zone is compact and dense with searchable locations. Travel between zones takes 5-10 seconds of real-time movement through road corridors. There is no fast travel -- the short distances make it unnecessary, and the travel itself is filled with weather escalation, random events, and pickup opportunities.

### 3.2 Zone Design Principles

- Every zone fits on approximately 2-3 screen widths of explorable area
- Every zone has 4-6 searchable locations (not all required)
- Every zone has at least one hazard type and one NPC
- Loot is front-loaded: the first 2-3 containers in each zone always yield useful items
- Dead ends do not exist. Every path leads somewhere productive.
- Zone boundaries have road connectors with brief camera transitions (0.5s fade, no loading screen for adjacent zones)

### 3.3 Zones

#### ZONE 0 -- CYPRESS CREEK PRESERVE (Home Base)
- **Real location:** 8,720 Pump Station Rd, 7,400-acre preserve
- **In-game:** Juan's rocket clearing. The hub. Small, intimate -- campfire, workbench, the rocket scaffold. The player returns here to install parts. Each visit shows the rocket progressing visually.
- **Features:** Workbench (instant crafting station), the rocket (visual progress model), supply stash (unlimited storage)
- **Ambient:** Cypress canopy, standing water, Spanish moss, fireflies, distant thunder growing louder every visit
- **Hazards:** Flooded trails (worsen over time), pygmy rattlesnakes near the edges
- **Design note:** This zone is deliberately calm and safe. It is the eye of the storm. The warm acoustic guitar loop plays here. It is the only moment of peace. This contrast makes the scavenging zones feel more intense.
- **Access:** South to Zone 1, west to Zone 3

#### ZONE 1 -- LAND O' LAKES BOULEVARD CORRIDOR (US-41)
- **Real location:** US Route 41 / Land O' Lakes Boulevard
- **In-game:** The central commercial strip. Dense with auto parts stores and hardware shops. This is where most early-game scavenging happens.
- **Key locations:**
  - **Harvey's Hardware** (real: since 1961) -- Hand tools, wire, bolts, pipe fittings. Harvey is here and gives a side quest.
  - **NAPA Auto Parts** (real: 3911 Land O' Lakes Blvd) -- Fuel injector components, wiring harnesses
  - **Advance Auto Parts** (real: 3813 Land O' Lakes Blvd) -- Backup source for automotive electrical, solenoids
  - **O'Reilly Auto Parts** (real: 3600 Land O' Lakes Blvd) -- Specialty chemicals, brake fluid (oxidizer precursor)
  - **Gulf Coast Tractor & Equipment** (real: 3827 Land O' Lakes Blvd) -- Hydraulic parts, welding gas cylinders
  - **RaceTrac Gas Station** (real: 3817 Land O' Lakes Blvd) -- Fuel, propane, snacks for stamina
- **Hazards:** Looters (appear after 20-min mark), downed power lines (after 40-min mark)
- **NPC:** Harvey (hardware store owner, knows Juan's secret)
- **Ambient:** Strip mall signage flickering, traffic lights swinging, palm fronds skidding across asphalt

#### ZONE 2 -- COLLIER PARKWAY DISTRICT
- **Real location:** Collier Pkwy, east from US-41
- **In-game:** Community infrastructure and residential. Key for crafting recipes and precision components.
- **Key locations:**
  - **Publix at Collier Commons** (real: 2121 Collier Pkwy) -- Food (stamina), first aid, batteries, duct tape
  - **Land O' Lakes Branch Library** (real: 2818 Collier Pkwy) -- Contains "The Foundry" makerspace. Precision tools, soldering irons, technical manuals that auto-unlock all remaining crafting recipes
  - **Land O' Lakes Recreation Center** (real: 3032 Collier Pkwy) -- NPC shelter hub. Aluminum tubing, nylon rope, quest giver
  - **Residential garages** (procedurally sampled) -- Car batteries, jumper cables, gasoline, PVC pipe
- **Hazards:** Panicked civilians, structural collapse (after 35-min mark)
- **NPC:** Maria (librarian / Foundry maker, unlocks recipes)
- **Ambient:** Suburban sprawl, retention ponds overflowing, wind chimes going berserk

#### ZONE 3 -- CONNER PRESERVE (Wild Zone)
- **Real location:** 22500 SR-52, 2,980-acre preserve
- **In-game:** Dangerous wilderness with unique high-value components. The RC flying field is the key target.
- **Key locations:**
  - **RC Flying Field** (real: Bay City Flyers, two grass runways) -- Radio transmitters, servos, LiPo batteries, carbon fiber rods. Primary avionics source.
  - **Equestrian Camp** (real: separate camping sites) -- Rope, tarps, metal stakes
  - **Fire Tower** -- Climbing it triggers a panoramic camera zoom-out showing the hurricane approaching. Unlocks full minimap. Screenshot-worthy moment.
- **Hazards:** Rattlesnakes, flooded sloughs, wild boar, sinkholes
- **NPC:** Old Dale (hermit prepper with rare components, trades for a generator)
- **Ambient:** Wind through longleaf pine, marsh fog, armadillos scurrying

#### ZONE 4 -- SCHOOL DISTRICT / SR-54 (Combined Zone)
- **Real locations:** Land O' Lakes High School, SR-54 corridor, Tractor Supply area
- **In-game:** Combines the school campus and southern highway into one dense zone. Chemistry lab for oxidizer, shop class for metalwork, plus commercial stores on the highway.
- **Key locations:**
  - **Land O' Lakes High School** (real: IB World School) -- Chemistry lab (oxidizer compounds), shop class (metalworking tools, drill press)
  - **Tractor Supply Co.** (real: near SR-54) -- Welding supplies, generators, fuel cans, heavy-gauge wire
  - **Pine View Middle School** (real: near Cypress Creek) -- Small science lab, athletic storage (backup parts)
- **Hazards:** National Guard roadblock on SR-54 (after 30-min mark), highway pileups, bridge flooding
- **NPC:** Coach Reeves (stayed behind to protect the school, grants lab access after a quick favor)
- **Ambient:** Empty hallways echoing, billboards snapping, distant sirens

### 3.4 Road Network

Real roads connect the zones. All roads are short corridors (5-10 seconds to traverse at sprint speed):

| Road | Connects | Notes |
|------|----------|-------|
| **Parkway Boulevard** | Zone 0 to Zone 2 | Primary route from base. Always open. |
| **US-41 / Land O' Lakes Blvd** | Zone 1 (north-south spine), Zone 2 east | Main artery. Fastest but most exposed. |
| **SR-52** | Zone 1 north to Zone 3 | Access to Conner Preserve. |
| **SR-54** | Zone 1 south to Zone 4 | Southern highway. Roadblock after 30 min. |
| **Pump Station Road** | Zone 0 internal | Deep preserve access. Floods at 45-min mark. |
| **Collier Parkway** | Zone 1 to Zone 2 | Commercial to residential transition. |

### 3.5 Road Events

Roads are not dead space. While traversing between zones, players encounter:

- **Debris pickups:** Scattered items on the road that can be grabbed without stopping (drive-by scavenging). Worth small XP.
- **Weather escalation:** Rain intensifies, wind picks up, visibility drops. Each road traversal feels different than the last.
- **Random encounters:** 20% chance of a looter ambush, fleeing NPC with a tip, or a supply cache in an abandoned car.
- **Visual set pieces:** A billboard ripping off its frame, a palm tree snapping, a power transformer exploding in sparks. These moments are screenshot-worthy and happen during the "boring" travel sections to keep energy high.

---

## 4. GAME MECHANICS

### 4.1 Core Loop (The 60-Second Micro-Loop)

The game is a series of **tight 60-second micro-loops** nested inside the 60-minute macro-loop:

1. **Grab:** Sprint to the nearest highlighted searchable location (5-10s)
2. **Loot:** Interact to instantly search. Items pop out with XP numbers and pickup SFX (2-3s)
3. **React:** Dodge a hazard, grab a road pickup, or fight a quick encounter (5-10s)
4. **Craft/Install:** If you have what you need, sprint back to base and slam the part together (10-15s)
5. **Celebrate:** Installation cutscene, rocket progress update, achievement toast, XP dump (5s)
6. **Redirect:** Check the progress tracker, pick the next target zone, sprint (5-10s)

**Every action in the game should map to one of these micro-loop steps.** If a player is ever doing something that does not fall into Grab/Loot/React/Craft/Celebrate/Redirect, the design has failed.

### 4.2 Time System -- The 60-Minute Hurricane

- The game runs on a **real-time 60-minute countdown** displayed prominently in the HUD. The countdown ticks in real seconds. 60 real minutes = 60 game minutes. No time compression, no action-costs-time abstraction. The timer is a real clock.
- The world escalates on **four storm phases** (not day-based, since there is no multi-day cycle):

| Phase | Timer | World State |
|-------|-------|-------------|
| **PHASE 1: Warning** | 60:00 - 45:00 | Light rain. All zones accessible. NPCs cooperative. Low hazard rate. Tutorial-friendly window. |
| **PHASE 2: Evacuation** | 44:59 - 30:00 | Moderate rain and wind. Looters appear in Zone 1. Some NPCs leave. First road debris. |
| **PHASE 3: Storm Surge** | 29:59 - 15:00 | Heavy rain. National Guard roadblock on SR-54. Power outages (street lights die). Flooding begins on low roads. Wind affects player movement. |
| **PHASE 4: Landfall** | 14:59 - 0:00 | Torrential downpour. Near-darkness. Extreme wind. Most roads partially flooded. Screen shake from thunder is constant. Lightning every 5-15 seconds. The hurricane wall cloud is visible on the horizon. Final desperation. |

- **Phase transitions are dramatic.** When the timer crosses a threshold, the game triggers a 2-second "storm surge" event: screen shake, thunder crack, rain intensity jump, brief camera zoom-out showing the storm advancing, then a HUD toast: "PHASE 2: EVACUATION -- STORM INTENSIFYING". These are designed to be alarming and shareable.
- **The last 5 minutes** are pure chaos. The screen is dark, rain is torrential, wind force pushes the player sideways, lightning is constant. If the player is still scavenging at this point, they feel genuinely panicked. This is by design.

### 4.3 Feedback Systems -- Constant Dopamine

Every player action produces immediate, layered feedback. This is the core UX principle of the entire game.

#### 4.3.1 XP Popups

Every action awards XP, displayed as a floating number that rises from the action point and fades:

| Action | XP | Popup Color |
|--------|----|-------------|
| Pick up any item | +10 | White |
| Pick up a rocket component | +50 | Gold with glow |
| Search a new location | +25 | Cyan |
| Complete a craft | +100 | Orange with screen shake |
| Install a rocket system | +500 | Red with full-screen flash |
| Dodge a hazard (near-miss) | +15 | Green |
| Complete an NPC quest | +200 | Purple |
| Road pickup (drive-by grab) | +5 | Gray |
| Discover a new zone | +50 | Cyan with minimap ping |

XP is purely a feel-good number. It feeds into the end-of-run score screen and leaderboard. It does NOT unlock abilities or gate content. Its only purpose is to make every action feel rewarding.

#### 4.3.2 Combo Streaks

Picking up items in rapid succession (within 3 seconds of each other) builds a **combo multiplier**:

- 2 items: "DOUBLE!" (x2 XP)
- 3 items: "TRIPLE!" (x3 XP, screen edge glow)
- 4 items: "QUAD!" (x4 XP, brief screen shake)
- 5+ items: "FRENZY!" (x5 XP cap, particle burst, distorted SFX)

Combos appear as large text in the center of the screen with scaling animation. They feel like a fighting game hit counter. The combo breaks if 3 seconds pass without a pickup.

**Why combos matter for virality:** Players will naturally screenshot or clip their FRENZY moments. The combo system turns mundane looting into a skill expression -- experienced players will route through zones to maximize combo chains.

#### 4.3.3 Screen Effects on Actions

| Action | Visual Feedback | Audio Feedback |
|--------|----------------|----------------|
| Item pickup | Item sprite pops toward player with tween, brief white flash on item, floating +XP | Crisp "click-whoosh" SFX, pitch increases with combo |
| Rocket part pickup | Screen-edge gold pulse, camera zoom bump (1.5x to 1.6x for 200ms), confetti burst | Deep satisfying "THUNK" + ascending chime |
| Craft completion | Sparks particle burst at workbench, screen shake (0.003 intensity, 150ms) | Metal clang + sizzle + success jingle |
| System installation | Full-screen white flash (100ms), rocket model visibly updates, camera pulls back to show rocket, HUD rocket icon segment lights up with glow animation | Rocket rumble + orchestral swell sting (2s) |
| Near-miss dodge | Brief slow-motion (200ms at 0.5x speed), green screen-edge pulse | Whoosh + heartbeat thump |
| Taking damage | Red screen flash, camera shake (0.005, 200ms), health bar bounces | Impact thud + grunt |
| Phase transition | 2s screen shake, thunder crack, rain jump, camera zoom-out and back | Thunder + wind surge + alert klaxon |

#### 4.3.4 Progress Bars and Indicators

The HUD maintains constant visible progress:

- **Rocket Progress Ring:** A circular progress indicator in the top-left showing overall completion percentage (0-100%). Each of the 5 systems is 20%. Finding a component for a system fills its segment partially. Installing the completed system fills it fully. The ring pulses gently when progress increases.
- **Current Objective Banner:** Always visible below the timer. "Find fuel injector -- check NAPA Auto Parts or Gulf Coast Tractor". Updates automatically based on what the player still needs. Never vague. Always actionable.
- **System Checklist:** Accessible by pressing TAB. Shows each of the 5 systems with component requirements and checkmarks. Green check = found, yellow circle = in inventory (not yet crafted), gray X = still needed. Each entry shows which zones contain the needed item.

#### 4.3.5 Achievement Toasts

One-time achievements that pop as banner notifications with a "ding" SFX:

| Achievement | Trigger | Shareability |
|-------------|---------|--------------|
| "First Blood" | Pick up your first item | Low -- onboarding moment |
| "Shopping Spree" | Loot 5 locations in Zone 1 | Medium |
| "FRENZY!" | Hit a 5x combo | High -- skill expression |
| "Speed Demon" | Install first system in under 10 minutes | High -- speedrun flex |
| "Storm Chaser" | Climb the fire tower during Phase 3+ | High -- screenshot moment |
| "MacGyver" | Craft all 5 systems | Medium -- completionist |
| "Under the Wire" | Launch with less than 2 minutes remaining | Very High -- clutch moment |
| "Overkill" | Launch with more than 20 minutes remaining | High -- flex |
| "Florida Man" | Die to a wild boar | Very High -- meme potential |

### 4.4 Inventory System (Simplified)

- Juan carries a **backpack** with **8 inventory slots** (reduced from 12 for faster decisions)
- **No item weight.** Every item takes 1 slot. Simplicity over realism.
- Items are categorized with colored borders:
  - **Gold border:** Rocket components (direct install parts)
  - **Blue border:** Crafting materials (combine at workbench)
  - **Green border:** Consumables (food = stamina, medkit = health)
  - **Gray border:** Tools (reusable, auto-equip)
- A **stash** at base camp has unlimited storage
- Inventory management should take less than 5 seconds. If the player spends more than 5 seconds in the inventory screen, the UI has failed.
- **Auto-pickup** for consumables when inventory has space. Player only manually decides on components and materials.

### 4.5 Crafting System (Streamlined)

Crafting is instant. There is no crafting time, no progress bar for crafting, no waiting. The player brings materials to the workbench, the recipe resolves immediately with a satisfying particle burst and sound effect. Crafting should feel like snapping LEGO together, not waiting for a progress bar.

**Recipes are simple: 2 ingredients each.** No recipe requires more than 2 input items. This means the player needs to find 2 things and bring them back. That is a 2-step quest, not a 5-step fetch chain.

| Output (Rocket Component) | Input A | Input B | Primary Source |
|---------------------------|---------|---------|----------------|
| Fuel Injector Assembly | Solenoid Valve | Copper Wiring | NAPA or Advance Auto |
| Pressure Regulator | Hydraulic Seal | PVC Coupler | Gulf Coast Tractor or Tractor Supply |
| Avionics Harness | RC Transmitter | LiPo Battery Pack | RC Flying Field (Zone 3) |
| Battery Array | Car Battery (x2 stack) | Jumper Cables | Residential garages or School |
| Oxidizer Tank | Lab Oxidizer Compound | Gas Cylinder | Chemistry lab + RaceTrac or O'Reilly |

**Recipe discovery:** All recipes are visible from the start in the System Checklist (TAB). The player always knows what they need and where to look. No recipe-gating behind NPC quests. Visiting Maria at the Library is optional but marks all item locations on the minimap (a powerful shortcut, not a gate).

### 4.6 Rocket Completion

The rocket requires **5 systems** to launch. Each system requires one crafted component:

| # | System | Component Needed | Visual Update When Installed |
|---|--------|-----------------|------------------------------|
| 1 | Engine | Fuel Injector Assembly | Engine nacelle glows, smoke particles begin |
| 2 | Fuel Safety | Pressure Regulator | Piping illuminates along the rocket body |
| 3 | Guidance | Avionics Harness | Cockpit lights turn on, antenna deploys |
| 4 | Power | Battery Array | Electrical arcs crawl up the hull (shader effect) |
| 5 | Propellant | Oxidizer Tank | Fuel gauge fills, vapor vents from base |

Each installation takes 5 seconds of cutscene (camera zooms to the rocket, the part snaps into place with particles and sound, the rocket visually upgrades, the progress ring fills, XP dumps on screen). These 5-second moments are the biggest dopamine hits in the game. They are the payoff for scavenging.

The player can attempt launch with 4/5 systems (see Section 11). The 5th system (Oxidizer Tank) is the hardest to obtain because it requires ingredients from two different zones, making it the optional "perfect run" challenge.

### 4.7 Health and Stamina (Simplified)

- **Health:** 3 hits and you are dead. Displayed as 3 heart icons, not a bar. Restored by medkits (found at Publix, Rec Center, residential houses). Getting hit flashes the screen red, shakes the camera, and plays a visceral impact sound. The simplicity of 3HP makes every hit feel dangerous.
- **Stamina:** Infinite sprint. There is no stamina meter. The player is always moving at full speed unless affected by wind (Phase 3+) or flooding (wadding through water slows to 60% speed). Removing stamina management eliminates a "boring" resource and keeps the pace relentless.
- **Death:** If health reaches 0, the game shows a death screen with a specific, memorable, often darkly funny death message (see Section 11.4). The player restarts from the last auto-save checkpoint.

### 4.8 Combat (Minimal, Avoidance-Focused)

Combat is not the point. Juan is an engineer, not a fighter. All encounters are designed to be avoidable or resolvable in under 5 seconds:

- **Looters:** Appear after Phase 2. Walk patrol routes in zones. Player can sprint past them (they are slower), hide behind objects (line-of-sight stealth), or throw a distraction item (food tossed draws them away). Getting caught = 1 hit of damage + they steal a random non-component item.
- **Wildlife:** Snakes are static hazards (step on them = 1 damage, hiss SFX warns you). Boar charges in a straight line (dodge sideways). Both are brief, reflex-based encounters -- not extended fights.
- **Environmental:** Downed power lines spark visibly. Flooding slows movement. Falling debris during Phase 4 requires awareness. These are obstacle-course elements, not combat.

### 4.9 NPC Interactions (Quick and Punchy)

NPCs deliver information fast. No long dialogue trees. Each NPC has:
- A 2-line greeting that establishes who they are
- A single quest (completable in 2-3 minutes, always in the same zone)
- A reward (either a rare component, a map reveal, or access to a locked area)

| NPC | Zone | Quest (30-second description) | Reward | Time to Complete |
|-----|------|------------------------------|--------|-----------------|
| **Harvey** | 1 | "My safe has a pressure gauge in it. It is in my house on the next block. Grab it." (Retrieve item from a nearby building) | Pressure Regulator component (skip crafting) | 1-2 min |
| **Maria** | 2 | "Help me grab the backup drives from The Foundry before the power dies." (Interact with 3 terminals in the library) | All item locations revealed on minimap | 1-2 min |
| **Sgt. Polk** | 4 | "Show me proof you have a way out and I will open the roadblock." (Return with a photo of the rocket -- auto-obtained on first base visit) | SR-54 roadblock removed, access to Tractor Supply | 30 sec (backtrack) |
| **Old Dale** | 3 | "Bring me a generator from Tractor Supply and I will give you what I have got." (Deliver a generator from Zone 4) | Avionics Harness (skip crafting) | 2-3 min |
| **Coach Reeves** | 4 | "Help me board up these windows." (Interact with 3 window objects in the gym) | Chemistry lab access (oxidizer source) | 1 min |

**Design note:** Every NPC quest is a shortcut. They let the player skip crafting a component or unlock faster routes. They are never mandatory. A player who ignores all NPCs can still win by finding and crafting everything themselves. NPCs are time-savers for smart players, not gates for all players.

---

## 5. TECHNICAL ARCHITECTURE

### 5.1 Project Structure

```
src/
  main.js                    -- Phaser.Game config, scene registration
  constants.js               -- All tunable game parameters (centralized)
  scenes/
    BootScene.js             -- Asset preloading with animated progress bar
    IntroScene.js            -- 10-second micro-intro (emergency broadcast + rocket + FIND.BUILD.LAUNCH)
    MenuScene.js             -- Title screen, settings, leaderboard
    GameScene.js             -- Primary gameplay scene (manages world, player, entities)
    HUDScene.js              -- Overlay: timer, progress ring, objective, health, combo, toasts
    CraftingScene.js         -- Workbench overlay (instant craft, no time cost)
    MapScene.js              -- Full-screen zone map with item locations
    CutsceneScene.js         -- Rocket installation sequences + ending
    GameOverScene.js         -- Death / time-up / victory screen with stats + share
  world/
    ZoneManager.js           -- Loads/unloads zone tilemaps (5 zones)
    Zone.js                  -- Base zone class
    zones/
      CypressCreekPreserve.js
      LandOLakesBlvd.js
      CollierParkway.js
      ConnerPreserve.js
      SchoolSR54.js
    RoadNetwork.js           -- Zone connections, road events, debris spawning
    WeatherSystem.js         -- Hurricane escalation, rain, wind, flooding (4 phases)
    StormClock.js            -- Real-time 60-minute countdown, phase transitions
    PhaseManager.js          -- Triggers world changes at phase thresholds
  entities/
    Player.js                -- Movement, physics, auto-pickup, near-miss detection
    NPC.js                   -- Base NPC class (quick dialogue, quest, trading)
    npcs/
      Harvey.js
      Maria.js
      SergeantPolk.js
      OldDale.js
      CoachReeves.js
    Hazard.js                -- Base hazard class (snake, power line, debris)
    Looter.js                -- Patrol AI, line-of-sight, steal mechanic
    WildBoar.js              -- Charge AI
  systems/
    InventorySystem.js       -- 8-slot inventory, auto-pickup, color-coded categories
    CraftingSystem.js        -- 2-ingredient instant recipes
    QuestSystem.js           -- Per-NPC quest state (not started / active / complete)
    SaveSystem.js            -- Auto-save checkpoints (localStorage)
    AudioManager.js          -- Layered ambient + SFX + music + combo pitch scaling
    FeedbackSystem.js        -- XP popups, combo tracking, achievement toasts, screen effects
    ScoreSystem.js           -- XP accumulation, end-of-run stats, leaderboard data
    ProgressTracker.js       -- Rocket system completion state, objective routing
  effects/
    WeatherFX.js             -- Rain, wind, lightning (particle + shader)
    FloodFX.js               -- Rising water (tilemap + shader)
    ScreenShake.js           -- Camera shake with intensity scaling
    LightingFX.js            -- Dynamic day/phase lighting, flashlight, lightning flash
    ParticleManager.js       -- Centralized particle emitter pool
    FogFX.js                 -- Screen-space fog for preserve zones
    WindFX.js                -- Debris particles, palm frond movement
    ComboFX.js               -- Combo counter visuals, frenzy burst, screen-edge glow
    PickupFX.js              -- Item pop-toward-player tween, XP float, flash
    InstallFX.js             -- Rocket installation particles, camera work, glow
  ui/
    CountdownTimer.js        -- 60:00 real-time display, pulse on phase change, red under 5 min
    ProgressRing.js          -- Circular rocket completion indicator (0-100%)
    ObjectiveBanner.js       -- Current objective text, auto-updates
    SystemChecklist.js       -- TAB overlay showing 5 systems + component status
    HealthHearts.js          -- 3-heart display with damage animation
    ComboCounter.js          -- Center-screen combo text with scaling
    AchievementToast.js      -- Slide-in achievement banners
    NotificationToast.js     -- Item pickup, quest update, phase change toasts
    MinimapUI.js             -- Corner minimap with item pings
    InteractionPrompt.js     -- Context-sensitive "E to search" prompts
    EndRunScreen.js          -- Final stats, XP breakdown, share button, retry
  data/
    recipes.json             -- 5 crafting recipes (2 ingredients each)
    items.json               -- Item definitions
    quests.json              -- 5 NPC quest definitions
    dialogue.json            -- NPC dialogue (short, 2-3 lines each)
    zones.json               -- Zone metadata, connections, travel times
    loot_tables.json         -- Per-location loot probability tables
    achievements.json        -- Achievement definitions and triggers
    xp_values.json           -- XP awards per action type
```

### 5.2 Phaser Configuration

```javascript
const config = {
  type: Phaser.WEBGL,              // Required for shader pipeline + Light2D
  width: 1280,
  height: 720,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 0 },           // Top-down: no gravity
      debug: false,
    },
  },
  render: {
    pixelArt: true,                 // Crisp pixel scaling
    antialias: false,
    roundPixels: true,
  },
  plugins: {
    scene: [
      {
        plugin: PhaserMatterCollisionPlugin,
        key: 'matterCollision',
        mapping: 'matterCollision',
      },
    ],
  },
  scene: [
    BootScene, IntroScene, MenuScene,
    GameScene, HUDScene, CraftingScene,
    MapScene, CutsceneScene, GameOverScene,
  ],
};
```

### 5.2.1 Page Layout

The game canvas is embedded in a dark-themed HTML page that reinforces the swamp atmosphere:

```css
html, body {
  margin: 0;
  padding: 0;
  background-color: #0a0f0a;  /* near-black swamp green */
  overflow: hidden;            /* prevent scrollbars */
}

#game-container {
  border: 1px solid rgba(79, 255, 170, 0.15);   /* faint cyan accent border */
  border-radius: 2px;
  box-shadow: 0 0 40px rgba(79, 255, 170, 0.06); /* subtle cyan glow */
}
```

**Design rationale:** The dark background (`#0a0f0a`) is near-black with a green undertone that blends with the game's internal background (`0x1a2e1a`). The faint border and glow use the game's cyan HUD accent (`0x4fffaa`) at very low opacity so the canvas feels embedded in the world rather than floating on a blank page. No external CSS file — all styling lives inline in `index.html` for zero-dependency simplicity.

### 5.3 Scene Management

The game uses Phaser's scene stacking:

- **GameScene** is always running during gameplay. Manages world, player, entities, weather.
- **HUDScene** runs in parallel on top (launched with `this.scene.launch('HUDScene')`). Renders timer, progress ring, health, combo counter, toasts, minimap, and interaction prompts. Separated from world rendering for performance.
- **CraftingScene** and **MapScene** are overlay scenes that pause GameScene when active. Both are designed for sub-5-second interactions.
- **IntroScene** is a 10-second standalone sequence.
- **CutsceneScene** handles 5-second rocket installation sequences and the ending.
- **GameOverScene** shows death/victory with full stats breakdown and share hooks.

### 5.4 Zone Loading

Zones use Phaser Tilemaps created in Tiled. Each zone is a separate tilemap JSON. The ZoneManager handles:

1. Preloading the next zone's tilemap when the player approaches a boundary (predictive loading based on player velocity direction)
2. Destroying the previous zone when the player is fully in the new zone
3. Preserving zone state (looted locations, NPC quest progress) in memory and SaveSystem
4. Transition: 0.5-second camera fade. No loading screen. Target: under 300ms for zone swap.

With only 5 zones (reduced from 7), memory pressure is lower. On high-memory devices, keep 2 adjacent zones loaded for instant transitions.

---

## 6. ADVANCED PHASER 3 FEATURES

All of these technical features serve a single purpose: making actions feel satisfying. The shaders, particles, and lighting are not tech demos -- they ARE the dopamine delivery system.

### 6.1 Dynamic Weather System (The Hurricane Is the Game)

The hurricane is not a background element. It is the primary antagonist and the primary source of visual spectacle. It escalates constantly and is always visible to the player.

**Rain:**
- Phaser 3 Particle Emitter with rain drop texture, attached to HUDScene camera
- Intensity ramps continuously (not just at phase boundaries):
  - Phase 1: `quantity: 3`, `speedY: 200`, subtle drizzle
  - Phase 2: `quantity: 15`, `speedY: 400`, steady rain
  - Phase 3: `quantity: 35`, `speedY: 600`, heavy downpour, angle shifts to 70deg (wind)
  - Phase 4: `quantity: 50`, `speedY: 800`, torrential, angle at 55deg, near-horizontal
- Rain splashes on ground: secondary emitter on particle death, small radial burst
- Performance cap: 500 active rain particles desktop, 200 mobile

**Wind:**
- Debris particles (leaves, paper, palm fronds) blown horizontally, quantity scales with phase
- Wind applies Matter.js force to player body during Phase 3+: headwind slows by 20%, tailwind speeds by 10%
- Palm trees in tilemap have sprite animation that increases sway with wind speed
- Wind direction rotates slowly over the 60 minutes

**Lightning:**
- Phase 1: No lightning
- Phase 2: Every 20-30 seconds
- Phase 3: Every 10-20 seconds
- Phase 4: Every 5-15 seconds
- Implementation: Camera `flash()` white, 100ms. Followed by `cameras.main.shake(200, 0.005)` at 200-800ms delay (thunder distance). Procedural lightning bolt via `Graphics` with jagged segments, displayed for 2 frames.
- Lightning illuminates the entire scene through the Light2D system (ambient light snaps to white for 2 frames)
- **Lightning as a gameplay beat:** Each lightning strike briefly reveals all searchable objects in the current zone (items flash white). This rewards players who are still scavenging during the storm -- risk/reward.

**Fog:**
- `Phaser.GameObjects.Shader` with custom GLSL Perlin noise fog
- Dense in preserve zones (0, 3), absent on highways
- Fog thickens during Phase 3-4 (density uniform ramps from 0.1 to 0.5)

### 6.2 Dynamic Lighting

**Phase-Based Ambient Light:**
- Phaser 3 `LightsManager` (WebGL Light2D pipeline)
- Ambient light color shifts continuously over the 60-minute run:
  - 60:00 - 45:00: Warm overcast `(0.85, 0.82, 0.75)` -- daylight but cloudy
  - 44:59 - 30:00: Darkening `(0.55, 0.50, 0.45)` -- cloud cover thickening
  - 29:59 - 15:00: Storm dark `(0.25, 0.22, 0.20)` -- feels like dusk at noon
  - 14:59 - 0:00: Near-black `(0.08, 0.07, 0.10)` -- the hurricane blocks all light. Player relies on flashlight and lightning.
- All sprites and tilemaps use Light2D pipeline: `setPipeline('Light2D')`

**Player Flashlight:**
- `Phaser.GameObjects.Light` attached to player, cone simulated via radius + intensity
- Auto-activates during Phase 3+ (no battery management -- streamlined)
- Reveals hidden loot in dark locations (items glow when flashlight passes over them)

**Location-based Lights:**
- Street lights on US-41 and Collier Pkwy: functional Phase 1-2, flickering Phase 3, dead Phase 4
- Building interior lights: warm glow through windows, die at Phase 3
- Base camp fire: point light with flicker tween, always active
- RaceTrac gas station canopy: last powered location, bright white beacon in the storm

**Lightning Integration:**
- Lightning sets ambient light to `(1.0, 1.0, 1.0)` for 2 frames via the Light2D system
- This creates a natural flash through all lit surfaces, shadows snap to zero and back
- Combined with the item-reveal mechanic, lightning is both atmospheric and mechanically meaningful

### 6.3 Physics (Matter.js)

**Top-Down Movement:**
- Gravity `{ y: 0 }` for top-down perspective
- Player uses `applyForce` for acceleration-based movement with `frictionAir` deceleration
- Sprint is the default speed. No walk mode. Players hold a direction and go.
- Player compound body with sensors for interaction detection (reused from existing codebase)

**Environmental Physics:**
- Debris: small Matter bodies with wind force, `ignoreGravity: true`
- Flooding: static sensor body that applies drag force to player (60% speed in water)
- Vehicle obstacles on roads: static Matter bodies the player navigates around

**Near-Miss Detection (Dopamine Generator):**
- Hazard sensor bodies extend slightly beyond the actual damage hitbox
- When the player passes through the outer sensor without hitting the inner hitbox, a "near-miss" event fires
- Near-miss triggers: slow-motion (200ms at 0.5x timescale), green screen-edge pulse, +15 XP, whoosh SFX
- This turns hazard avoidance into a skill expression. Players will intentionally graze hazards for XP and style.

**Collision Layers:**
- Player body
- NPC bodies
- Searchable objects (sensor -- trigger interaction prompt)
- Hazard inner hitbox (sensor -- trigger damage)
- Hazard outer hitbox (sensor -- trigger near-miss)
- Walls / impassable terrain (static)
- Water / flooding (sensor -- apply drag)
- Pickup items on roads (sensor -- auto-collect on overlap)

### 6.4 Camera System

- **Follow camera** with tight lerp: `this.cameras.main.startFollow(player, false, 0.15, 0.15)` (snappier than default for fast-paced feel)
- **Default zoom:** 1.5x (character detail visible, zone traversal feels fast)
- **Zoom bumps:** Brief zoom-in (1.5x to 1.6x, 200ms ease-out) on rocket part pickup, creating a "hit pause" effect
- **Installation zoom:** Smooth zoom to 2.0x on rocket during installation cutscene, then pull back
- **Fire tower panoramic:** Zoom out to 0.5x when climbing fire tower, showing the full zone and the hurricane on the horizon. This is a scripted cinematic moment.
- **Screen shake table:**

| Trigger | Intensity | Duration | Frequency |
|---------|-----------|----------|-----------|
| Item pickup | 0.001 | 50ms | Per pickup |
| Rocket part pickup | 0.003 | 150ms | 5 per game |
| Craft completion | 0.003 | 150ms | 5 per game |
| System installation | 0.008 | 300ms | 5 per game |
| Thunder (distant) | 0.003 | 200ms | Varies by phase |
| Thunder (close) | 0.008 | 400ms | Varies by phase |
| Phase transition | 0.010 | 500ms | 3 per game |
| Taking damage | 0.005 | 200ms | Per hit |
| Near-miss | 0.002 | 100ms | Per dodge |
| Falling debris | 0.006 | 250ms | Phase 4 only |

- **Post-processing:** Subtle chromatic aberration shader during Phase 4 (disorientation feel). Vignette always active, intensity increases during Phase 3-4 and on low health.

### 6.5 Tilemap System

Each zone uses a Tiled-exported JSON tilemap with multiple layers:

| Layer | Purpose |
|-------|---------|
| Ground | Base terrain (asphalt, grass, dirt, water, sand) |
| Roads | Road markings, sidewalks, parking lots |
| Buildings | Structure footprints with collision |
| BuildingRoofs | Above player. Fades to 50% alpha when player overlaps building sensor |
| Furniture | Interior objects visible when roof transparent |
| Vegetation | Trees, bushes (some with collision, some decorative) |
| Collision | Invisible collision layer |
| Interaction | Object layer: `{ type: "searchable", lootTable: "hardware_shelf" }` |
| Flood | Becomes visible/collidable based on StormClock flood level |
| Pickups | Road debris auto-collect items (repopulate on phase change) |

Tilesets: 16x16 pixel tiles, scaled with `pixelArt: true`.

### 6.6 Particle Systems (Centralized Manager)

The `ParticleManager` maintains a pool of emitters:

| Effect | Max Particles | Texture | Trigger | Feel |
|--------|--------------|---------|---------|------|
| Rain | 200-500 | 1x4px blue | Continuous, scales | Atmosphere |
| Rain splash | 50-100 | 2x2px white | On rain death | Polish |
| Wind debris | 20-50 | Leaf/paper sprites | Continuous | Atmosphere |
| Dust step | 3-6 | Dust spritesheet | Player movement | Grounding |
| Sparks | 10-20 | 1x1px orange | Craft/power line | Satisfying |
| Item pickup burst | 8-12 | 2x2px white/gold | On pickup | Dopamine |
| Combo frenzy burst | 20-40 | 2x2px multicolor | On 5x combo | Excitement |
| Installation confetti | 50-80 | 2x2px multicolor | On system install | Celebration |
| Rocket exhaust | 20-40 | Smoke/fire sprites | Post engine install | Progress visible |
| Lightning bolt | N/A (Graphics) | Procedural | Per lightning event | Spectacle |
| Fireflies | 10-30 | 1x1px yellow-green | Zone 0 nighttime | Calm contrast |
| Water splash | 5-10 | 2x2px blue-white | Enter/exit flood | Tactile |
| Near-miss sparks | 5-8 | 1x1px green | On near-miss | Reward |

Total active particle budget: 800 desktop, 400 mobile.

### 6.7 Shader Effects

Custom GLSL shaders via `Phaser.GameObjects.Shader` or render texture:

1. **Screen-space fog:** Perlin noise. Density varies by zone (dense in preserves) and phase (thickens over time).
2. **Water ripple:** Sine-wave UV distortion on flooded areas.
3. **CRT/Static:** IntroScene emergency broadcast only. Scanlines + noise.
4. **Chromatic aberration:** Phase 4 only. Subtle RGB split conveys disorientation.
5. **Vignette:** Always active. Intensity increases at Phase 3+ and when health is 1 heart.
6. **Screen-edge glow:** Brief colored glow on screen borders for combo streaks (green for near-miss, gold for rocket part, red for damage). Implemented as a full-screen quad with radial alpha mask.

---

## 7. SCENE FLOW

### 7.1 BootScene

- Animated progress bar during asset preload
- Swampfire Protocol logo fades in behind progress bar
- Lightning flash effect when loading completes, transition to MenuScene

### 7.2 IntroScene -- SPACE-to-Continue Micro-Intro

Each phase waits for SPACE before advancing. No timers. Players set the pace.

1. Black screen. "EMERGENCY ALERT SYSTEM" banner with CRT static. Scrolling ticker: "HURRICANE KENDRA -- CAT 6 -- LANDFALL 60 MIN -- EVACUATE NOW". Body text block with broadcast details. Blinking "PRESS SPACE TO CONTINUE" prompt.
2. Hard cut (no fade): Cypress Creek clearing. Placeholder rocket on launch pad. Zone label. Blinking "PRESS SPACE TO CONTINUE" prompt.
3. Three words slam on screen automatically with screen shake: "FIND." → "BUILD." → "LAUNCH." After sequence completes, blinking "PRESS SPACE TO CONTINUE" prompt.
4. 60:00 countdown appears. "PRESS SPACE TO BEGIN" prompt. SPACE starts gameplay.

No auto-advance. No skip. Each phase is meaningful context.

### 7.3 MenuScene

- Title: "SWAMPFIRE PROTOCOL" in stencil military font, glowing amber
- Background: animated cypress trees with rain and distant lightning
- Options: NEW GAME, CONTINUE (if save exists), LEADERBOARD, SETTINGS
- **Leaderboard** shows: fastest completion times, highest XP runs, funniest death causes (community voted, if connected)
- Ambient: distant thunder, rain, wind

### 7.4 GameScene

Primary gameplay scene. See Sections 3-6 for complete details.

### 7.5 GameOverScene

Three variants, all designed to be shareable:

**Death:**
- Camera zooms out from Juan's position. Screen desaturates.
- Large text: cause of death in the style of a Florida news headline
- Stats summary: time survived, XP earned, systems completed, items found
- Buttons: RETRY (last checkpoint), NEW RUN, SHARE (generates screenshot card)

**Time's Up:**
- Hurricane makes landfall. Screen whites out. Massive wind roar, then silence.
- Text: "Hurricane Kendra made landfall. Wind speeds exceeded 200 mph. There were no survivors in Pasco County."
- Beat. Then: "Juan's rocket sat [X/5] systems complete in a clearing in Cypress Creek Preserve."
- List of installed vs. missing systems with visual rocket showing what was and was not finished
- Stats + RETRY + SHARE

**Victory:**
- See Section 11 for launch cutscene details
- After cutscene: full stats breakdown screen
- XP total with per-category breakdown (items, crafts, installs, quests, combos, near-misses)
- Time remaining when launched
- Achievements earned this run
- **Personal best comparison** (if previous run exists)
- **SHARE button** generates a styled screenshot card: "I escaped Hurricane Kendra in [TIME] with [SCORE] XP. Can you beat it?"
- PLAY AGAIN button

---

## 8. SOUND DESIGN

Sound is a primary feedback channel. Every player action must have an audio response. Silence is only used deliberately (base camp calm, post-launch space).

### 8.1 Music

| Track | Context | Style | Purpose |
|-------|---------|-------|---------|
| Main Theme | MenuScene | Slow synth pad + distant thunder. Minor key. | Set tone |
| Phase 1 | Gameplay 60:00-45:00 | Ambient electronic. Sparse, steady pulse. | Build tension slowly |
| Phase 2 | Gameplay 44:59-30:00 | Pulsing synth. Muted percussion. Tempo increase. | Raise urgency |
| Phase 3 | Gameplay 29:59-15:00 | Driving drums. Dissonant synth stabs. | Feel the pressure |
| Phase 4 | Gameplay 14:59-0:00 | Full intensity. Relentless beat. No melody -- pure urgency. | Panic |
| Base Camp | Zone 0 | Warm acoustic guitar. Calm contrast. | Emotional anchor |
| Installation Sting | System install | 2-second orchestral swell. Hope. | Celebrate progress |
| Launch | Victory sequence | Full orchestral + synth crescendo. Catharsis. | Peak emotion |
| Failure | GameOver (time up) | Single sustained low note fading to silence. | Gut punch |

**Music crossfade:** Tracks blend seamlessly as phases change. No hard cuts. The intensity ramp should feel continuous. The player should not consciously notice the music changing -- they should just feel more stressed.

### 8.2 Ambient Sound Layers

AudioManager blends ambient layers based on zone and weather:

- **Wind:** Constant. Volume and pitch scale with storm phase. Stereo panning based on wind direction.
- **Rain:** Three layers (light patter / steady / downpour). Crossfade between layers based on storm intensity.
- **Thunder:** Randomized intervals matching lightning events. Volume = distance. Deep rumble with reverb tail.
- **Zone-specific ambience:**
  - Preserve (0, 3): Frogs, cicadas, water dripping, armadillo rustling
  - US-41 (1): Distant car alarms, loose signage banging, glass breaking
  - Residential (2): Dogs barking, wind chimes, sprinklers
  - School/Highway (4): Empty hallway echo, billboard snapping, sirens

### 8.3 Sound Effects (Action Feedback)

| SFX | Trigger | Design Notes |
|-----|---------|--------------|
| Item pickup click | Any item pickup | Crisp, satisfying. Pitch increases with combo count (C4 to G5 over 5x combo). |
| Rocket part THUNK | Picking up a gold-border component | Deep, weighty impact. Unmistakable. |
| Craft snap | Completing a recipe | Metal click + sizzle + short jingle (0.5s). Feels like LEGO snap. |
| Install rumble | System installation | Low rumble building to orchestral sting. 5 seconds. The payoff. |
| Near-miss whoosh | Dodging a hazard | Fast whoosh + single heartbeat thump. Adrenaline trigger. |
| Damage impact | Taking a hit | Dull thud + grunt + glass-crack overlay. Alarming. |
| Combo "DOUBLE" | 2x combo | Ascending chime. |
| Combo "FRENZY" | 5x combo | Distorted ascending chime + crowd roar sample (brief). Peak excitement. |
| Phase transition alarm | Phase boundary crossed | Emergency klaxon (1s) + thunder crack. Alarming. |
| Achievement ding | Any achievement | Bright bell tone + subtle whoosh. |
| Heartbeat | Health at 1 heart | Persistent low heartbeat loop until healed. Dread. |
| Footstep (per terrain) | Player movement | Variant per tile type: asphalt, grass, water splash, dirt. Grounding. |
| Search rummage | Interacting with container | Brief rummage (1s). Shortened from original to maintain pace. |

---

## 9. UI/UX DESIGN

### 9.1 HUD Layout (HUDScene)

The HUD is designed to communicate maximum information with minimum reading. Everything is visual. No text-heavy displays during gameplay.

```
+------------------------------------------------------+
|  [60:00]  [O]         [MINIMAP]                      |
|  TIMER   PROGRESS       (corner)                     |
|           RING                                       |
|                                                       |
|  [>>> Find Fuel Injector -- NAPA Auto Parts >>>]     |
|                   OBJECTIVE BANNER                    |
|                                                       |
|           [ DOUBLE! x2 ]                              |
|            COMBO TEXT                                  |
|                                                       |
|                                                       |
|  [<3 <3 <3]                   [+50 XP]               |
|   HEARTS              FLOATING XP POPUP              |
|                [E] Search shelf                       |
+------------------------------------------------------+
```

- **Timer:** Top-left. Large monospace. White during Phase 1-2. Orange Phase 3. Pulsing red Phase 4. Red flash + pulse when under 5:00.
- **Progress Ring:** Top-left, beside timer. Circular ring with 5 colored segments. Fills as components are found and systems installed. Always visible, always updating. The single most important progress indicator.
- **Minimap:** Top-right. Current zone layout, player dot, discovered locations as icons, NPC markers. Item locations revealed after Maria's quest. Fog of war on unexplored areas.
- **Objective Banner:** Center-top, below timer. Single line: "Find [item] -- check [location]". Auto-updates based on ProgressTracker. Pulses briefly when objective changes. Tap/click to open SystemChecklist.
- **Combo Counter:** Center screen, appears only during combos. Large text with scale animation. Fades after combo breaks.
- **Health Hearts:** Bottom-left. 3 heart icons. Bounce animation on damage. Crack overlay on lost hearts.
- **XP Popups:** Float upward from action point. Multiple can be on screen simultaneously. Gold for high-value, white for standard.
- **Interaction Prompt:** Bottom-center. "[E] Search" / "[E] Talk" / "[E] Install". Only visible when in range.
- **Achievement/Notification Toasts:** Top-center. Slide down, hold 2 seconds, slide up. Queue if multiple.
- **Phase Alert:** Full-width banner that appears for 3 seconds on phase transition. "PHASE 3: STORM SURGE" with red background.

### 9.2 System Checklist (TAB)

Pressing TAB opens a quick overlay (no GameScene pause -- the timer keeps ticking):

```
ROCKET SYSTEMS                    [X] = installed  [/] = in inventory  [ ] = needed

1. ENGINE           [X] Fuel Injector Assembly
                        Solenoid Valve [X] + Copper Wiring [X]

2. FUEL SAFETY      [ ] Pressure Regulator
                        Hydraulic Seal [ ] + PVC Coupler [/]

3. GUIDANCE         [ ] Avionics Harness
                        RC Transmitter [ ] + LiPo Battery Pack [ ]

4. POWER            [/] Battery Array
                        Car Battery x2 [/] + Jumper Cables [X]

5. PROPELLANT       [ ] Oxidizer Tank
                        Lab Oxidizer [ ] + Gas Cylinder [ ]

                                            Progress: 1/5 systems (20%)
                                            Time remaining: 42:17
```

- Checkmarks are color-coded: green [X] = done, yellow [/] = have it but not crafted/installed, gray [ ] = need it
- Each missing item shows which zone(s) contain it (after Maria's quest reveals all)
- The checklist is glanceable in 2 seconds. The player should be able to TAB, see what they need, TAB out, and sprint to the right zone.

### 9.3 Crafting UI

Triggered at workbench (Zone 0). Minimal, instant:

- Left panel: inventory items that are craft ingredients (auto-filtered)
- Center: recipe list showing all 5 recipes. Available recipes are highlighted. Unavailable are grayed with missing ingredients shown.
- Select a recipe. If ingredients are present: single "CRAFT" button press. Instant resolution. Spark burst. Sound effect. Component appears in inventory.
- Total time in crafting UI: 3-5 seconds per craft. In and out.

### 9.4 Map UI (M key)

- Full-screen zone map showing all 5 zones and road connections
- Discovered locations marked with category icons
- Looted locations dimmed / checked off
- Current zone highlighted with pulsing border
- Item locations shown (after Maria's quest) as small colored dots matching component color
- Estimated travel time on each road: "~8s" (real seconds, not game time)

### 9.5 Mobile Controls

- Virtual joystick (bottom-left) for movement. Large, comfortable.
- Action button (bottom-right) for interact/search. Large, thumb-friendly.
- Inventory button (top-right, below minimap)
- TAB checklist: swipe up from bottom edge
- All touch targets: minimum 48px. Designed for one-handed play in portrait mode as stretch goal.

---

## 10. PROGRESSION SYSTEM

### 10.1 The 60-Minute Arc

The game is structured as a 4-act experience within 60 minutes:

| Act | Time Window | Player Activity | Emotional Arc | Systems Targetable |
|-----|-------------|----------------|---------------|-------------------|
| **Act 1: Orientation** | 60:00 - 50:00 | Explore Zone 0 and Zone 1. Grab easy pickups. Learn controls by doing. | Curiosity, confidence | 0-1 |
| **Act 2: Expansion** | 49:59 - 30:00 | Push to Zones 2, 3, 4. NPC quests. Bulk scavenging. Combos. | Momentum, excitement | 1-3 |
| **Act 3: Assembly** | 29:59 - 15:00 | Return to base with materials. Craft and install. Fill gaps. | Focus, determination | 3-4 |
| **Act 4: Desperation** | 14:59 - 0:00 | Find the last pieces. Install under storm. Launch. | Panic, triumph | 4-5 |

**Pacing guarantee:** A skilled player can complete all 5 systems in 35-40 minutes, leaving 20+ minutes for exploration and optimization. A first-time player should be able to complete 4/5 systems (partial win) in 55 minutes if they stay focused. A player who wastes significant time will fail, which is the intended consequence -- it drives the "one more run" loop.

### 10.2 XP and Score System

XP accumulates throughout the run and is displayed as a running total on the end-of-run screen:

| Category | XP Sources | Approximate Total |
|----------|-----------|-------------------|
| Scavenging | Item pickups, location searches, road debris | 1,500 - 2,500 |
| Crafting | Recipe completions, system installations | 2,500 (fixed) |
| Quests | NPC quest completions | 0 - 1,000 (optional) |
| Combos | Combo multiplier bonuses | 0 - 1,500 (skill-based) |
| Near-Misses | Hazard dodges | 0 - 500 (skill-based) |
| Achievements | One-time unlocks | 0 - 1,000 |
| Time Bonus | +10 XP per remaining second on clock | 0 - 3,600 |

**Score range:** A bare minimum win is approximately 4,000 XP. A perfect run with all quests, max combos, and fast completion is approximately 10,000 XP. This 2.5x spread creates meaningful score differentiation for the leaderboard.

### 10.3 Leaderboard Hooks

The game tracks and displays:

- **Fastest completion time** (clock remaining at launch)
- **Highest XP score** (total run score)
- **Most near-misses in a single run** (skill metric)
- **Best combo streak** (highest multiplier reached)
- **Personal bests** across all metrics (local storage)
- **Funniest death** (community feature if online component added later): death messages are inherently shareable

**Share card generation:** On game end (win or lose), a SHARE button generates a styled image card:
```
SWAMPFIRE PROTOCOL
------------------
[WIN] Escaped in 47:23  |  8,240 XP
Systems: 5/5  |  Best Combo: FRENZY x5
Near-Misses: 12  |  Deaths: 0
"Can you beat my time?"
------------------
swampfireprotocol.com
```
This card is designed for Twitter/X, Discord, and Instagram stories.

### 10.4 Replayability Drivers

Why play again after winning:

1. **Faster time:** "I beat it in 47 minutes, I bet I can do 35"
2. **Higher score:** Combo optimization, near-miss farming, quest completion
3. **All achievements:** Some achievements are mutually exclusive per run (e.g., "Speed Demon" vs. exploring every location)
4. **Different routes:** Multiple locations per component. Run 1 might go NAPA first, Run 2 goes Gulf Coast Tractor. Different routes encounter different NPCs and hazards.
5. **Perfect run:** 5/5 systems, all quests, all achievements, sub-30-minute completion
6. **The death messages:** Players will die to different things each run, and the death messages are collectible bragging rights

### 10.5 Difficulty Scaling (Natural, Not Selectable)

No difficulty selector. Difficulty is embedded in the clock and the storm:

- Phase 1 (60:00-45:00): Easy. Everything accessible. Forgiving. New players learn here.
- Phase 2 (44:59-30:00): Medium. Looters appear. Must be more deliberate.
- Phase 3 (29:59-15:00): Hard. Roads flood. Power out. Wind fights you. Must be efficient.
- Phase 4 (14:59-0:00): Extreme. Near-darkness. Constant hazards. If you are still scavenging, you are in trouble.

Every player experiences the same escalation. The difference is how prepared you are when it gets hard. Good players have 4/5 systems done before Phase 3. Struggling players are still scavenging during Phase 4. Both experiences are valid and create stories worth sharing.

---

## 11. WIN / LOSE CONDITIONS

### 11.1 Win -- Full Launch (5/5 Systems)

All 5 systems installed. Player initiates launch at the rocket.

**Launch Cutscene (15 seconds -- the longest cutscene in the game, earned by completing everything):**
1. Juan climbs into cockpit (2s)
2. Engine ignition: rumble, sparks, smoke particles, screen shake escalating (3s)
3. Camera zooms out as rocket lifts, showing Land O' Lakes from above (3s)
4. Hurricane wall cloud visible approaching from the Gulf (2s)
5. Rocket punches through cloud layer. Sudden silence. (2s)
6. Stars appear. Earth visible below. Juan in cockpit, watching Florida recede. (3s)
7. Text: "Juan escaped. 7 billion others were not so lucky."
8. End-of-run stats screen with SHARE button.

### 11.2 Win -- Partial Launch (4/5 Systems, Missing Oxidizer)

Launch succeeds but with damage. Same cutscene BUT:
- Hull breach alarm during ascent
- More violent screen shake
- Text: "Juan made it to orbit. Barely. The hull breach gave him 6 hours of oxygen instead of 12. He spent them watching the storm consume everything he'd ever known."
- Stats screen labels this as "PARTIAL ESCAPE"

### 11.3 Lose -- Time Expires

The hurricane makes landfall:
1. Screen whites out. Massive wind roar.
2. Silence.
3. Text: "Hurricane Kendra made landfall at 11:47 AM EST. Wind speeds exceeded 200 mph. There were no survivors in Pasco County."
4. Beat. "Juan's rocket sat [X/5] systems complete in Cypress Creek Preserve."
5. Visual: the rocket with installed and missing systems clearly shown
6. Stats screen + RETRY + SHARE

### 11.4 Lose -- Death

Specific, memorable, darkly funny death messages. These are designed to be screenshotted and shared:

- "Killed by a wild boar in Conner Preserve. The boar did not care about the hurricane."
- "Electrocuted by a downed power line on Land O' Lakes Boulevard. The line was from a Duke Energy pole installed in 2019."
- "Caught in structural collapse at Collier Commons. The Publix sign landed on him."
- "Bitten by a pygmy rattlesnake on Pump Station Road. It was a juvenile. Three inches long."
- "Hit by a flying shopping cart in the RaceTrac parking lot. Wind speed: 85 mph."
- "Mauled by a feral cat behind the Land O' Lakes Library. Maria is going to be devastated."
- "Fell into a sinkhole on SR-52. The karst geology of west-central Florida strikes again."
- "Looted by a man in a Tampa Bay Buccaneers jersey. He took the fuel injector and a granola bar."

Death messages include the specific location name (real place) and an absurd detail. This combination of real-world specificity and dark humor is inherently shareable.

Stats screen shows: time survived, XP earned, systems completed, cause of death.
Buttons: RETRY (last checkpoint), NEW RUN, SHARE.

---

## 12. ART DIRECTION

### 12.1 Style

- **Pixel art**, 16x16 tile base, character sprites at 32x32 or 48x48
- **Color palette:** Muted swamp tones (greens, browns, dark blues, amber) with HIGH CONTRAST accent colors for game-critical elements:
  - Gold: rocket components and XP popups
  - Red: timer (final phase), damage, hazard indicators
  - Cyan: new discovery highlights, minimap pings
  - Green: near-miss feedback, health
  - White: lightning, item reveal flash
- **Visual hierarchy:** The most important things on screen are always the brightest. Rocket parts glow. Timer pulses. XP numbers float above the muted world. The player's eye is always drawn to the next action.
- **Influence:** Hyper Light Drifter's desolate beauty + Vampire Survivors' constant feedback popups + Florida's oppressive humidity

### 12.2 Character Design

- **Juan:** Hispanic male, mid-30s, bald, short beard, black-framed glasses, cargo pants, tool belt, work boots. No baseball cap -- the baldness and glasses are his defining silhouette read at 48×48px. Pixel art at 48×48px per frame. Animations: idle (2 frames), run 4-directional (4 frames per direction), search (crouch), carry (heavy item), craft (workbench). No walk animation -- Juan only runs.
- **NPCs:** Distinct silhouettes. Harvey in overalls. Maria with glasses. Sergeant Polk in fatigues. Old Dale in camo. Coach Reeves in polo and whistle.

### 12.3 Environment Tiles

| Zone | Dominant Tiles | Mood |
|------|----------------|------|
| Cypress Creek (0) | Cypress trunks, standing water, moss, dirt, palmetto | Calm refuge |
| Land O' Lakes Blvd (1) | Gray asphalt, lane markings, strip mall stucco, palm trees | Urban scavenging |
| Collier Parkway (2) | Beige sidewalk, Spanish tile roofs, retention ponds, manicured grass | Suburban anxiety |
| Conner Preserve (3) | Sandhill, marsh grass, cypress slough, pine needle, RC runway dirt | Wild danger |
| School/SR-54 (4) | Red brick, chain link, athletic field, highway guardrails, billboards | Institutional decay |

---

## 13. SAVE SYSTEM (Session-Friendly)

The game is designed for a single 60-minute sitting, but life happens. The save system ensures no progress is lost.

### 13.1 Auto-Save Checkpoints

Auto-save triggers at these moments:
- Every time the player returns to Zone 0 (base camp)
- Every time a rocket system is installed
- Every time a phase transition occurs
- Every 5 minutes of real time (background save, no interruption)

### 13.2 Save Data (localStorage)

- Player position, zone, health
- Inventory contents
- Stash contents
- Rocket completion state
- Zone states (looted locations, NPC quest progress)
- Timer value (exact seconds remaining)
- Storm phase and weather intensity
- XP accumulated
- Achievements earned this run
- Combo stats (best streak)

### 13.3 Pause

Pressing ESC pauses the game AND the timer. The pause screen shows:
- Current stats summary
- System checklist (quick reference)
- RESUME, SETTINGS, QUIT TO MENU
- "Time paused. The hurricane waits for no one. But it will wait for you."

### 13.4 Continue

MenuScene shows CONTINUE if a save exists. Loading a save resumes exactly where the player left off, including timer state. The weather system recalculates visual state from the timer value on load.

---

## 14. PERFORMANCE TARGETS

| Metric | Desktop | Mobile |
|--------|---------|--------|
| Frame rate | 60 fps constant | 30 fps minimum, 60 target |
| Active particles | 800 max | 400 max |
| Loaded tilemap | 1-2 zones | 1 zone |
| Active Matter bodies | 200 max | 100 max |
| Texture memory | 128 MB max | 64 MB max |
| Shader passes | 3 max (fog + vignette + water) | 1 max (vignette only) |
| Zone transition | < 300ms | < 500ms |
| Save/load cycle | < 50ms | < 100ms |
| Input-to-feedback latency | < 16ms (1 frame) | < 33ms (1 frame at 30fps) |

### 14.1 Performance Optimization Strategies

- **Particle pooling:** ParticleManager pre-allocates all emitters. No runtime creation/destruction.
- **Shader LOD:** Mobile disables fog and water ripple. Chromatic aberration disabled below 45fps.
- **Tilemap culling:** `cullPaddingX/Y` set to 1 tile beyond camera bounds.
- **Entity sleep:** NPCs and hazards outside camera bounds + 2-tile buffer have update loops disabled.
- **Audio streaming:** Music streamed, SFX preloaded as buffers.
- **Texture atlas:** All sprites packed into atlas sheets. One atlas per zone + one shared atlas.
- **Feedback batching:** Multiple simultaneous XP popups are batched into a single "+75 XP" if they would overlap visually.
- **Screen shake governor:** No more than 2 active shakes simultaneously. New shakes queue or merge with existing.

---

## 15. TESTING REQUIREMENTS

### 15.1 Unit Tests

| System | Test Coverage |
|--------|---------------|
| InventorySystem | Add/remove items, 8-slot limit, auto-pickup logic, category filtering |
| CraftingSystem | 2-ingredient recipe resolution, missing ingredient rejection, instant craft |
| StormClock | Real-time countdown accuracy, phase transitions at correct thresholds |
| WeatherSystem | Intensity scaling per phase, flood level calculation, wind force values |
| FeedbackSystem | XP calculation per action, combo multiplier math, combo timeout |
| ScoreSystem | Total score aggregation, time bonus calculation, leaderboard data format |
| ProgressTracker | System completion state, objective auto-routing, checklist data |
| QuestSystem | Quest state transitions (inactive/active/complete), reward delivery |
| SaveSystem | Serialization/deserialization of all game state, data integrity on load |

### 15.2 Integration Tests

| Feature | Test Scenario |
|---------|---------------|
| Scavenging flow | Player enters location, searches, item spawns from loot table, XP popup appears, item in inventory |
| Combo system | Player picks up 5 items within 3s each, combo multiplier reaches 5x, FRENZY text displays, bonus XP awarded |
| Crafting flow | Player has 2 ingredients at workbench, crafts component, ingredients consumed, component in inventory, +100 XP |
| Installation flow | Player brings component to rocket, installation cutscene plays (5s), rocket visually updates, progress ring fills, +500 XP |
| Zone transition | Player crosses zone boundary, 0.5s fade, new zone loads, player positioned correctly, state preserved |
| Phase transition | Timer crosses threshold, phase alert banner shows, weather intensifies, music crossfades |
| Near-miss | Player passes through hazard outer sensor without hitting inner, slow-mo triggers, +15 XP, green pulse |
| NPC quest | Player talks to NPC, quest accepted, objective updates, complete task, reward delivered |
| Death | Player loses 3rd heart, GameOverScene triggers, death message correct for cause, stats displayed |
| Save/load | Player saves (auto), quits, reloads, all state preserved including timer, weather, inventory, zone state |
| Victory | All 5 systems installed, launch initiated, cutscene plays, stats screen shows, share card generates |

### 15.3 Performance Tests

- Maintain 60fps with max rain particles + 3 NPCs + 15 searchable objects + combo FX active
- Zone transition under 300ms (desktop) / 500ms (mobile)
- Save/load under 50ms (desktop) / 100ms (mobile)
- No memory leaks after 20 consecutive zone transitions (heap snapshot comparison)
- XP popup rendering: 10 simultaneous popups without frame drop
- Phase 4 stress test: max rain + lightning every 5s + wind force + chromatic aberration shader at 60fps

### 15.4 UX Tests (Playtest Criteria)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first item pickup | < 30 seconds | Stopwatch from gameplay start |
| Time to understand objective | < 60 seconds | Player can verbalize "I need to find parts for a rocket" |
| First system installed | < 15 minutes | Timer reading when first install happens |
| Completion rate (4/5 systems) | > 60% of first-time players | Playtest tracking |
| "One more run" rate | > 70% of players who complete/fail attempt a second run | Post-session survey |
| Share rate | > 20% of players use the SHARE button | Analytics |

---

## 16. DEVELOPMENT PHASES

### Phase 1 -- Foundation (Weeks 1-2)
- Project restructure from dungeon template to Swampfire architecture
- BootScene, MenuScene, GameScene, HUDScene scaffolding
- Player movement (top-down Matter.js, no gravity, sprint-only)
- Single zone prototype (Zone 1: Land O' Lakes Blvd) with placeholder tiles
- StormClock with real-time 60-minute countdown
- Basic FeedbackSystem: XP popups on item pickup

### Phase 2 -- Core Loop (Weeks 3-4)
- All 5 zone tilemaps (placeholder art acceptable)
- Zone transition system (0.5s fade, no loading screen)
- Searchable objects with loot tables
- Inventory system (8 slots, color-coded)
- Crafting system (2-ingredient, instant)
- Rocket progress tracker + installation cutscenes
- Combo system
- Save system

### Phase 3 -- World Life (Weeks 5-6)
- NPC system with quick dialogue (5 NPCs, 5 quests)
- Hazard system (snakes, boar, looters, environmental)
- Near-miss detection and feedback
- Phase transitions (4 phases, world state changes)
- Road flooding system
- Road events (debris pickups, random encounters)

### Phase 4 -- Polish (Weeks 7-9)
- Weather system (rain, wind, lightning particles + shaders)
- Dynamic lighting (phase-based ambient, flashlight, lightning flash)
- Fog shader for preserve zones
- Audio implementation (all music tracks, ambient layers, SFX)
- IntroScene 10-second micro-intro
- Achievement system
- Screen effects (shake table, zoom bumps, edge glow, chromatic aberration)
- Ending cutscenes (win/partial/lose)

### Phase 5 -- Art and Tuning (Weeks 10-11)
- Final pixel art for all zones, characters, items
- Tilemap polish
- Balance pass: loot table probabilities, component locations, NPC quest timing
- Mobile controls
- Playtest sessions targeting UX metrics (Section 15.4)
- Score/leaderboard system
- Share card generation

### Phase 6 -- Ship (Week 12)
- Bug fixes from playtesting
- Final performance profiling
- Build optimization (Vite production, asset compression)
- Deployment
- Community leaderboard backend (if applicable)

---

## 17. SOCIAL AND VIRAL DESIGN

### 17.1 Screenshot-Worthy Moments

The game is designed to produce moments players naturally want to capture and share:

1. **Fire Tower Panoramic:** Climbing the tower triggers a zoom-out showing the hurricane approaching. The contrast between the small player and the massive storm wall is dramatic.
2. **FRENZY Combo:** The visual explosion of a 5x combo with particle burst and distorted SFX is clip-worthy.
3. **Under-the-Wire Launch:** Launching with less than 2 minutes on the clock, with Phase 4 storm raging, is a peak clutch moment.
4. **Death Messages:** Every death is a unique, funny, location-specific Florida Man headline.
5. **Launch Cutscene:** The rocket rising above the storm, silence in space, Earth below. Cathartic and beautiful.
6. **Phase 4 Chaos:** The screen during the final 5 minutes is visually intense -- near-darkness, constant lightning, torrential rain, wind debris, chromatic aberration. It looks incredible in a clip.

### 17.2 Share Mechanics

- **End-of-run share card** with styled stats (always available, win or lose)
- **Death headline share** with the specific death message as a card
- **Personal best notifications** when a previous record is broken
- **Achievement cards** for notable achievements

### 17.3 Community Features (Post-Launch)

- Online leaderboard (fastest time, highest score)
- Weekly challenges ("Complete the game without using any NPC shortcuts")
- Community death message voting (funniest death of the week)
- Speedrun category support (in-game timer for precise measurement)

---

## 18. OPEN QUESTIONS

1. **Difficulty toggle:** Should there be a "Tourist Mode" with 90-minute timer for accessibility? Current spec is 60 minutes only. Playtesting will determine if this is needed.
2. **Procedural vs. fixed loot:** Key rocket components have fixed primary locations with randomized backup locations. Consumables (food, medkits) are fully randomized. This balance ensures reliability for speedrunning while maintaining variety.
3. **Online leaderboard scope:** Local-only leaderboard for v1. Online requires backend infrastructure. Deferred to post-launch.
4. **Mobile portrait mode:** The spec targets landscape 1280x720 (16:9). Portrait mode (one-handed play) is a stretch goal that requires significant UI reorganization.
5. **Accessibility:** Colorblind mode for the progress ring and item borders. Screen reader support for death messages. Remappable controls. These should be prioritized before launch.
6. **Monetization:** Not in scope for v1. The game is free. If monetization is needed: cosmetic skins for Juan (Florida Man costume, NASA jumpsuit, gator hunter outfit) or alternate death message packs.
