# Corvus Protocol: The Omen Wars — Technical Handoff

**Project Owner:** Joshua Turner / Old Crows Wireless Solutions  
**Publisher:** Mad Apps (Houston George)  
**Status:** MVP, 60-day build to Android soft launch  
**Contact:** joshua@oldcrowswireless.com, 850-861-7582

---

## Executive Summary

**Corvus Protocol** is a mythologically-themed idle tower defense hybrid game. Players defend a summoning circle against spectral invaders (The Pale Chorus) by placing towers and managing idle Resonance currency. The game ships with a single campaign (15 waves, 1 boss), all 4 playable Murder members, basic cosmetics, and rewarded ad monetization.

**Ship date:** 60 days from start  
**Platform:** Android (soft launch), iOS (week 8)  
**Revenue model:** F2P + ads + cosmetics + subscription pass  
**Tech stack:** React Native/Expo (mobile), Node.js (backend), Upstash Redis (state), Firebase (analytics)

---

## Part 1: Project Scope

### MVP Deliverables (Ship This)

**Gameplay:**
- Single 15-wave campaign with 1 boss (Whisper)
- 4 tower types (Corvus, Sage, Pip, Mira) with base stats only
- Enemy waves with scaling difficulty
- Idle income loop (Resonance ticking passively)
- Prestige mechanic (reset with 1.5x multiplier)
- 3 campaign difficulty tiers (Easy, Normal, Hard)

**Monetization:**
- Rewarded video ads (3 per session max)
- Convenience Pass subscription ($9.99/mo, removes ads + offline bonus)
- One cosmetic: Krragh familiar (free unlock at Murder level 5)
- One consumable: Basic Ritual (+50% Resonance, 500 RP cost, 1-use)
- One battle pass cosmetic (Corvus plague skin)

**Characters & Voice:**
- Corvus (chaos/crowd control, 1.5x ElevenLabs voice ID: Oq6YjhFgak69fZQyDSCd)
- Sage (support/warding, calm ElevenLabs voice)
- Pip (theft/crit, hyperactive ElevenLabs voice)
- Mira (amplification/execution, rare deep ElevenLabs voice)
- Voiceovers on tower placement, wave clear, boss phases, 1 prestige line per character

**UI:**
- Campaign screen (isometric board + tower palette)
- Prestige screen (multiplier display, confirmation)
- Shop (ads, pass, consumables)
- Settings (mute, resolution, debug metrics)
- Idle screen (Corvus portrait, offline Resonance earned, resume/prestige buttons)

**NOT in MVP (post-launch updates):**
- Multiple campaigns / Acts 2-3
- Character progression trees
- Rune system
- Mounts
- Leaderboards
- Seasonal events
- Multiple bosses
- Story cutscenes

---

## Part 2: Technical Architecture

### Tech Stack

**Frontend:**
- React Native / Expo (Android app deployment via Google Play)
- TypeScript (strongly typed, prevent runtime errors)
- Redux or Zustand (state management, persist locally)
- React Native Canvas or custom WebGL (isometric rendering)
- React Native SVG (UI, icons, simple animations)

**Backend:**
- Node.js + Express (lightweight API, stateless)
- Upstash Redis (ephemeral state: active sessions, campaign progress)
- PostgreSQL or Firebase Firestore (permanent: user accounts, progression, cosmetics)

**3rd Party:**
- Google Mobile Ads SDK (Android rewarded video)
- Firebase Analytics + Crashlytics
- ElevenLabs API (voiceover generation on-demand or pre-recorded)
- Stripe (optional, for future web checkout; not MVP)

**Deployment:**
- EAS Build (Expo cloud build, Android APK)
- Google Play Console (Android publishing)
- App Store Connect (iOS, week 8+)
- Vercel or AWS (backend API)

### Architecture Diagram

```
┌─────────────────┐
│  React Native   │ (Mobile app, Expo)
│  (TypeScript)   │
└────────┬────────┘
         │
         ├─→ Local Storage (Redux persist)
         │   - Campaign state
         │   - Character levels
         │   - Cosmetic unlocks
         │   - Settings
         │
         ├─→ Firebase Analytics
         │   - Events: tower_placed, campaign_won, ad_watched
         │
         └─→ Backend API (Node.js/Express)
             │
             ├─→ Upstash Redis
             │   - Active sessions
             │   - Campaign progress (ephemeral)
             │   - Ad impression tracking (ephemeral)
             │
             └─→ Firestore / PostgreSQL
                 - User accounts (UID, email, created_at)
                 - Account progression (prestige level, character XP)
                 - Cosmetics owned
                 - Subscription status
                 - Offline Resonance earned (timestamp-based)
```

### State Management Strategy

**Local-first, backend-validated.**

**Campaign state (local only):**
```json
{
  "campaignId": "uuid",
  "difficulty": "normal",
  "wave": 3,
  "bossPhase": false,
  "towers": [
    {
      "id": "tower_1",
      "type": "corvus",
      "x": 150,
      "y": 200,
      "level": 1,
      "runes": [],
      "health": 100,
      "kills": 5
    }
  ],
  "resonance": 2500,
  "resonancePerSecond": 50,
  "enemies": [
    {
      "id": "ghost_1",
      "type": "pale_whisper",
      "x": 300,
      "y": 100,
      "health": 50,
      "maxHealth": 100,
      "targetTower": "tower_1"
    }
  ],
  "buffs": [
    {
      "id": "corvus_luck",
      "type": "crit_chance",
      "value": 0.05,
      "duration": 300 // seconds
    }
  ],
  "elapsedTime": 125 // seconds into campaign
}
```

**Account progression (backend + local cache):**
```json
{
  "uid": "user_abc123",
  "epoch": 3,
  "prestigeMultiplier": 3.375,
  "characters": {
    "corvus": { "level": 45, "xp": 3500, "xpMax": 5000 },
    "sage": { "level": 38, "xp": 2100, "xpMax": 5000 },
    "pip": { "level": 52, "xp": 4200, "xpMax": 5000 },
    "mira": { "level": 31, "xp": 1800, "xpMax": 5000 }
  },
  "cosmetics": {
    "familiars": ["krragh"],
    "skins": ["corvus_base", "corvus_plague"],
    "boards": ["threshold_realm"],
    "reliquaries": ["trickster_mantle"]
  },
  "consumables": {
    "ritual_resonance_boost": 3
  },
  "subscription": {
    "conveniencePass": {
      "active": false,
      "expiresAt": null
    }
  },
  "adMetrics": {
    "totalWatched": 47,
    "lastWatchedAt": 1720329600,
    "todayWatched": 2
  },
  "offlineResonance": {
    "lastClaimAt": 1720329200,
    "resonancePerHour": 50
  }
}
```

---

## Part 3: Gameplay Mechanics

### Campaign Loop

**Campaign structure:**
- 15 waves of enemies
- Waves 1-14: Regular spawns (difficulty increases per wave)
- Wave 15: Boss fight (Whisper) with 2 phases

**Wave spawning:**
```
Wave N spawns:
  - Delay: 5 seconds before first enemy
  - Enemy count: 3 + N (wave 1 = 4 enemies, wave 15 = 18 enemies)
  - Spawn interval: 2 + (difficulty_modifier) seconds
  - Health per enemy: 50 * (1 + (wave / 10))
  - Difficulty modifier: Easy = 0.7x, Normal = 1.0x, Hard = 1.3x
  - If >3 enemies alive, slow spawn rate by 50%
```

**Boss (Whisper):**
- Wave 15 only
- Health: 1000 (Normal) × difficulty_multiplier (0.7/1.0/1.3)
- Behavior: Moves unpredictably (random waypoint every 3 seconds)
- Phase 1 (Health > 50%): Normal damage taken
- Phase 2 (Health ≤ 50%): Takes 50% less damage, moves faster
- Voice line on spawn (Corvus trash-talks, Sage warns)
- Reward on defeat: 10,000 Resonance + 1 random rare rune

### Tower Mechanics

**Base towers:**

| Tower | Cost | DPS | Range | Special | Character |
|-------|------|-----|-------|---------|-----------|
| Corvus Spike | 200 RP | 15 | 200px | 15% crit chance, taunt aura (enemies prioritize) | Corvus |
| Sage Bastion | 300 RP | 10 | 180px | +15% damage to nearby towers | Sage |
| Pip Needle | 250 RP | 12 | 220px | Every 3rd hit chains to 2 nearby enemies | Pip |
| Mira Amplifier | 500 RP | 0 | 250px | No damage, multiplies nearby tower damage by 1.5x | Mira |

**Tower mechanics:**
- Towers auto-attack nearest enemy in range
- Towers have 100 health each, destroyed at 0 HP (enemy gets through)
- Destroying all towers = campaign loss
- Towers can be placed anywhere in the inner sanctum (constrained zone)
- Max 8 towers per campaign
- Towers cost Resonance upfront; if you don't have enough, placement fails with UI feedback

**Damage calculation:**
```
baseDamage = tower.dps
crit = random() < tower.critChance ? 2.0 : 1.0
proximity_buff = 1.0 + (count of buff-aura towers nearby × 0.15)
final_damage = baseDamage × crit × proximity_buff
```

### Idle / Resonance Loop

**Resonance (currency):**
- Ticks passively at `resonancePerSecond` rate
- Earned from enemy kills (enemy_health × 0.5)
- Earned from tower leveling (prestige upgrade)
- Can be spent on towers, consumables, prophecies

**Passive income (idle):**
- Base: 10 Resonance per second (when app is closed)
- Multiplied by prestige: 10 × prestigeMultiplier
- Multiplied by Sage prophecy: +10% if active
- Multiplied by Convenience Pass: +50% while subscribed
- Offline earned cap: 8 hours (prevents infinite accumulation)

```
offlineResonanceEarned = (
  10 // base
  × prestigeMultiplier
  × (sageProphecyActive ? 1.1 : 1.0)
  × (conveniencePassActive ? 1.5 : 1.0)
  × (secondsSinceLastCheck / 3600) // hours
) max 8 hours
```

### Character Leveling (MVP: Basic Only)

Characters level by **behavioral play** (not customizable yet; that's 1.1):

**XP gain per action:**
- Corvus: Kill with crit (+10 XP), cursed tower damage (+5 XP)
- Sage: Tower near Sage gains buff (+5 XP), campaign won (+20 XP)
- Pip: Steal enemy buff (+15 XP), critical kill (+10 XP)
- Mira: Enemy execution <30% health (+20 XP), nearby towers deal damage (+2 XP)

**Level cap:** 10 in MVP (no progression tree yet)

**Level benefits (MVP):**
- Corvus: Crit chance +1% per level, max +10%
- Sage: Nearby tower durability +2% per level, max +20%
- Pip: Theft rate +3% per level, max +30%
- Mira: Amplification range +5px per level, max +50px

### Prestige Mechanic

**Prestige screen (end of campaign or manual trigger):**
- Display: Current Resonance, Current multiplier, New multiplier
- Calculation: (currentEpoch + 1) × 1.5^(currentEpoch)
- Button: "Ascend to Epoch N" with confirmation
- On prestige:
  - All campaign progress reset
  - All character levels → 0
  - All towers reset
  - Resonance → 0
  - Character multiplier increases
  - New cosmetic unlock (1 per epoch)
  - New voiceover line from prestige character

---

## Part 4: Monetization Systems

### Ad System (Google Mobile Ads)

**Rewarded Video Ads:**
- Placement 1: Idle screen ("3x your offline Resonance" button)
- Placement 2: Campaign loss ("Free retry" button)
- Placement 3: Main campaign ("Watch for +50% Resonance this wave" button, appears every 3 waves)
- Max: 3 ads per session (hard cap to prevent annoyance)
- CPM target: $2.50-3.50 Android, $6-8 iOS

**Implementation:**
```typescript
// AdManager.ts
async showRewardedAd(placement: 'offline' | 'retry' | 'campaign'): Promise<boolean> {
  try {
    const adLoaded = await rewardedAd.load();
    if (!adLoaded) return false;
    
    const earned = await rewardedAd.show();
    
    if (earned) {
      switch (placement) {
        case 'offline':
          applyReward(offlineResonance × 3);
          break;
        case 'retry':
          applyCampaignRetry();
          break;
        case 'campaign':
          applyWaveBuff(1.5, 30); // 50% damage for 30 sec
          break;
      }
      // Track ad event
      Analytics.logEvent('ad_watched', { placement });
    }
    return earned;
  } catch (e) {
    console.error('Ad failed:', e);
    return false;
  }
}
```

**Banner ads:** NOT in MVP (only if needed for revenue)

### Convenience Pass Subscription

**In-app purchase (IAP) via Google Play Billing:**
- Product ID: `com.madapps.corvusprotocol.convenience_pass`
- Price: $9.99/month
- Billing period: Monthly, auto-renew
- Benefits:
  - All rewarded ads hidden (no ad buttons)
  - Offline Resonance +50%
  - 1 free retry per campaign
  - Exclusive cosmetic: Convenience Pass border (UI element)

**Implementation:**
```typescript
// SubscriptionManager.ts
async purchaseConveniencePass() {
  try {
    const result = await requestPurchase('com.madapps.corvusprotocol.convenience_pass');
    if (result.transactionId) {
      saveSubscriptionStatus({
        active: true,
        expiresAt: result.expirationDate,
        transactionId: result.transactionId
      });
      Analytics.logEvent('subscription_purchased');
    }
  } catch (e) {
    console.error('Purchase failed:', e);
  }
}

// Check subscription status on app open
async checkSubscriptionStatus() {
  const status = await queryPurchaseHistory('com.madapps.corvusprotocol.convenience_pass');
  if (status.isActive) {
    enableConveniencePassBenefits();
  }
}
```

### Consumables Shop

**Ritual (one-time use item):**
- Product: Basic Ritual
- Cost: 500 Resonance
- Effect: +50% Resonance earned this campaign
- Stack limit: 10 per account
- Implementation: Add to inventory, apply on campaign start

**Shop UI:**
- Grid layout, show price + icon + description
- Tap to purchase (if player has enough Resonance, auto-confirm)
- Show inventory count next to each item

### Battle Pass

**Seasonal cosmetic pass (future, not MVP but structure for later):**
- Cost: $7 (or 800 premium currency)
- Duration: 6 weeks
- Tiers: 20 rewards
- Reward types: Skins, familiars, cosmetic runes, XP boosters
- For MVP: Placeholder skin unlock (Corvus plague) granted free to all

---

## Part 5: User Interface & UX

### Screen Flow

```
Splash Screen
    ↓
Login / Guest Login (Firebase Auth or device ID)
    ↓
Main Menu
    ├─→ [PLAY] → Campaign Difficulty Select → Campaign Screen
    ├─→ [PRESTIGE] → Prestige Confirmation
    ├─→ [SHOP] → Cosmetics / Consumables / Pass
    ├─→ [SETTINGS] → Mute, Graphics, Debug
    └─→ [IDLE SCREEN] (when app closes)
```

### Campaign Screen (Main Gameplay)

**Layout (mobile vertical, 1080x1920):**

```
TOP ROW (Status):
┌─────────────────────────────────────────┐
│ [⚔ CORVUS]  [🛡 SAGE]  [🗝 PIP]  [🦅 MIRA] │
│  L45 ████░░  L38 ███░░░  L52 █████░░  L31 ██░░░ │
└─────────────────────────────────────────┘

CENTER (Isometric Board):
┌─────────────────────────────────────────┐
│                                         │
│         [SUMMONING CIRCLE]              │
│      (Animated, isometric view)         │
│   Towers placed by player               │
│   Enemies spawning & moving             │
│   Boss health bar (if phase 2)          │
│                                         │
│   Wave: 12/15  Boss HP: ████░░░░░░     │
│                                         │
└─────────────────────────────────────────┘

BOTTOM ROW (Tower Palette & Controls):
┌─────────────────────────────────────────┐
│ [CORVUS] [SAGE] [PIP] [MIRA] [ITEM]    │ (Carousel, swipe)
│ 200 RP   300 RP  250 RP 500 RP  Ritual  │
│ CHAOS   SUPPORT  THEFT  EXEC   +50% RP  │
│                                         │
│ Resonance: 45,320 ⚡ (+50/sec)          │
│ [════ PAUSE ════] [⚙ SETTINGS]         │
└─────────────────────────────────────────┘
```

**Tower Placement:**
- Tap tower card → cursor changes to crosshair
- Tap board location → tower placed (if valid zone + enough Resonance)
- Tap placed tower → shows tower stats (DPS, range circle drawn, equipped runes)
- Swipe tower left → sell tower (refund 50% Resonance)

**Wave notifications:**
- Toast at bottom: "Wave 5 incoming"
- Boss phase: "Whisper Phase 2: Accelerated!"
- Voiceover trigger: Corvus cackles on wave clear

### Prestige Screen

```
┌──────────────────────────────────────────┐
│         ASCEND TO EPOCH 4                │
│                                          │
│  Current Multiplier: 2.25x               │
│  New Multiplier: 3.375x                  │
│                                          │
│  Current Resonance: 45,320 RP            │
│  (Will reset to 0)                       │
│                                          │
│  Character Progress: RESET               │
│  (Levels: Corvus 45→0, Sage 38→0, ...)  │
│                                          │
│  Unlock: Corvus "Plague-Bearer" Skin     │
│                                          │
│  [✓ CONFIRM] [✗ CANCEL]                 │
│                                          │
│  Voice: Corvus laughs "Here we go again."|
└──────────────────────────────────────────┘
```

### Idle Screen (App Closed)

```
┌──────────────────────────────────────────┐
│                                          │
│    CORVUS PROTOCOL: OMEN WARS            │
│                                          │
│     [CORVUS PORTRAIT, ANIMATED]          │
│     "The Pale Chorus always waits."      │
│                                          │
│  Offline Resonance Earned: 24,000 RP ✓  │
│  (Your Tonal Engine working...)          │
│                                          │
│  Last Campaign: Wave 12/15               │
│                                          │
│  [■ CLAIM & RESUME] [⬆ PRESTIGE]        │
│                                          │
│  ────────────────────────────────────   │
│  [Watch Ad for 2x Offline Reward]        │
│  [Convenience Pass: $9.99/mo]            │
│                                          │
└──────────────────────────────────────────┘
```

### Shop Screen

```
┌──────────────────────────────────────────┐
│             SHOP                         │
│  [Cosmetics] [Consumables] [PASS]       │
├──────────────────────────────────────────┤
│                                          │
│ CONSUMABLES TAB:                         │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Basic Ritual                        │ │
│ │ Cost: 500 RP                        │ │
│ │ Effect: +50% Resonance this run     │ │
│ │ Inventory: 3                        │ │
│ │  [BUY]                              │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ CONVENIENCE PASS:                       │
│ $9.99/month (auto-renew)                │
│  ✓ Remove ads                           │
│  ✓ +50% offline Resonance               │
│  ✓ 1 free retry per campaign            │
│  [SUBSCRIBE]                            │
│                                          │
└──────────────────────────────────────────┘
```

---

## Part 6: Voice & Audio

### Voiceover System

**ElevenLabs API integration:**
- Pre-record key lines during development
- Store as `.mp3` files in app bundle
- Trigger on specific game events

**Corvus voiceovers (1.5x speed):**
- On tower placed: "THIS tower? Bold choice."
- On crit hit: "PERFECT!"
- On enemy death: "One less ghost!"
- On wave clear: "They're scared now. I can smell it."
- On boss spawn: "Oh, HERE we go."
- On prestige: "Eternal recurrence. I love it."

**Sage voiceovers (calm, measured):**
- On tower placed: "Strategic placement."
- On campaign won: "We have bought another cycle."
- On boss phase 2: "Its nature changes. Adapt."
- On prestige: "The pattern repeats."

**Pip voiceovers (fast, overlapping):**
- On crit: "GOT IT!"
- On steal: "MINE! Also that!"
- On enemy death: "NEXT?"
- On wave clear: "Can we do that again??"

**Mira voiceovers (rare, heavy):**
- On boss defeated: "The fallen feed the next war."
- On prestige (once per epoch): Long silence, then "Begin again."

**Technical implementation:**
```typescript
// VoiceManager.ts
const voiceLines = {
  corvus: {
    tower_placed: require('@audio/corvus/tower_placed.mp3'),
    crit_hit: require('@audio/corvus/crit_hit.mp3'),
    // ... etc
  },
  sage: { /* ... */ },
  pip: { /* ... */ },
  mira: { /* ... */ }
};

function playVoiceLine(character: Character, event: string) {
  const audio = new Audio(voiceLines[character][event]);
  audio.play();
}
```

**Music:** Not in MVP (add post-launch if budget allows)

---

## Part 7: Backend API Specification

### Authentication

**Firebase Authentication (Google Sign-In or anonymous):**

```
POST /auth/login
Body: { email, password } or { idToken }
Response: { uid, accessToken, expiresIn }

POST /auth/register
Body: { email, password, displayName }
Response: { uid, accessToken }

POST /auth/guest
Body: {}
Response: { uid, accessToken } (ephemeral session)
```

### Campaign Endpoints

```
POST /campaigns/start
Body: { difficulty: 'easy' | 'normal' | 'hard' }
Response: {
  campaignId: uuid,
  state: { wave: 0, towers: [], enemies: [], resonance: 0 },
  timestamp: ISO8601
}

POST /campaigns/{campaignId}/save
Body: { state: campaignState, timestamp }
Response: { saved: true }

GET /campaigns/{campaignId}
Response: { campaignId, state, createdAt, updatedAt }

POST /campaigns/{campaignId}/complete
Body: { difficulty, waveReached, bossDefeated, timeTaken }
Response: {
  resonanceEarned: 5000,
  xpGained: { corvus: 50, sage: 30, pip: 40, mira: 20 },
  nextMultiplier: 2.25
}
```

### Account Progression Endpoints

```
GET /accounts/{uid}
Response: {
  uid, epoch, prestigeMultiplier,
  characters: { corvus, sage, pip, mira },
  cosmetics: { familiars, skins, boards },
  adMetrics: { totalWatched, lastWatchedAt }
}

POST /accounts/{uid}/prestige
Body: {}
Response: {
  newEpoch, newMultiplier,
  unlockedCosmetic: 'corvus_plague_skin',
  charactersReset: true
}

POST /accounts/{uid}/consumable/use
Body: { consumableType: 'ritual_resonance_boost' }
Response: { consumed: true, inventoryRemaining: 2 }
```

### Analytics Endpoints

```
POST /analytics/event
Body: {
  uid, event: string, properties: object,
  timestamp: ISO8601
}
Response: { recorded: true }

Events to track:
- app_opened
- campaign_started
- campaign_won
- campaign_lost
- tower_placed
- ad_watched
- subscription_purchased
- consumable_purchased
- prestige_triggered
```

### Offline Resonance Endpoint

```
GET /accounts/{uid}/offline-resonance
Response: {
  lastClaimedAt: ISO8601,
  resonancePerHour: 50,
  resonanceEarned: 24000,
  conveniencePassActive: false
}

POST /accounts/{uid}/claim-offline-resonance
Body: {}
Response: { claimed: 24000, newBalance: 45320 }
```

---

## Part 8: Asset List & Specifications

### Art Assets (Outsource to Fiverr ~$1,500)

**Sprites:**
1. Summoning circle board background (1080x1920, isometric 45°)
2. Corvus tower (64x64, idle + attack animation)
3. Sage tower (64x64, idle + aura animation)
4. Pip tower (64x64, idle + attack animation)
5. Mira tower (80x80, idle + amplification animation)
6. Whisper boss (128x128, idle + attack animation, 2 phase variants)
7. Pale Chorus ghosts (4 variants, 48x48 each, translucent)
8. Krragh familiar (48x48, idle + flight animation)

**UI Elements:**
1. Character portrait frames (200x200, Corvus/Sage/Pip/Mira)
2. Tower selection cards (mockups for buttons)
3. Resonance currency icon (64x64)
4. XP bar background (512x20)
5. Button states (idle, pressed, disabled) × 10 styles
6. Rune icons (64x64) × 5 base runes

**Cosmetics (for future):
- Corvus "Plague-Bearer" skin variant (tower recolor)

**Animations:**
- Damage numbers rising/fading (number style: white/gold)
- Crit sparkle effect (star burst, gold)
- Tower placement confirmation (glow, brief fade-in)
- Enemy death dissolve (spectral fade)
- Boss phase transition (screen shake, darkening)

**Color palette (use OCWS branding):**
- Dark navy: #1A2332
- Teal dark: #0D6E7A
- Teal light: #00C2C7
- Gold: #B8922A
- Light gray: #F4F6F8
- Black: #0A0E12
- Purple (Corvus): #6B4FA0
- White (text): #FFFFFF

### Audio Assets (Pre-record with ElevenLabs)

**Corvus voice lines:** 10 lines (1.5x speed)
**Sage voice lines:** 8 lines (normal speed, calm)
**Pip voice lines:** 8 lines (normal speed, fast)
**Mira voice lines:** 4 lines (deep, rare)

**SFX (royalty-free or create):**
- Tower placement (whoosh, 0.5s)
- Damage hit (pop, 0.2s)
- Enemy death (spectral dissolve, 0.3s)
- Wave clear (chime, 0.8s)
- Boss phase transition (deep horn, 1.2s)
- Button press (click, 0.1s)

---

## Part 9: Development Phases

### Phase 1: Core Gameplay (Weeks 1-3, ~40 hours)

**Deliverables:**
- Isometric board rendering (animated, 45° angle)
- Tower placement system (drag/tap to place, validate zones)
- Enemy spawning & pathfinding (follow path to center)
- Damage calculation & tower attacks
- Wave progression (15 waves increasing difficulty)
- Boss fight (Whisper, 2 phases, health bar)
- Campaign win/loss conditions

**Testing:**
- Towers shoot enemies correctly
- Boss takes damage, reaches phase 2
- Campaign ends on wave 15 boss defeat
- No tower overlap (placement validation works)

### Phase 2: Idle & Progression (Weeks 2-3, ~20 hours)

**Deliverables:**
- Resonance idle ticker (offline + online)
- Character XP system (behavioral tracking)
- Level display + stat changes per level
- Prestige mechanic (multiplier calc, cosmetic unlock)
- Campaign results screen (XP gained, Resonance earned)

**Testing:**
- Offline Resonance calc correct (8 hour cap)
- Character XP increases per action
- Prestige multiplier calculated correctly
- Character levels reset on prestige

### Phase 3: Monetization & UI (Weeks 3-4, ~15 hours)

**Deliverables:**
- Google Mobile Ads integration (rewarded video)
- Convenience Pass IAP setup
- Shop UI (consumables, pass, future cosmetics)
- Idle screen (offline Resonance claim)
- Settings screen (mute, graphics, reset account)

**Testing:**
- Rewarded ads load and reward correctly
- Subscription toggle works (ad buttons hide)
- Consumables purchase and apply effects
- Idle Resonance calc accounts for pass

### Phase 4: Polish & Optimization (Week 4, ~20 hours)

**Deliverables:**
- Voice line integration (Corvus on events)
- Animation/VFX (tower placement glow, damage numbers)
- Performance optimization (60 FPS target)
- Bug fixes from internal testing
- Crash logging & error handling

**Testing:**
- App runs 30 min campaign without frame drops
- No memory leaks (check with Xcode profiler)
- All voice lines trigger correctly
- Graceful error handling (ads fail, game continues)

### Phase 5: QA & Build (Week 5, ~10 hours)

**Deliverables:**
- Full game playthrough (all difficulty tiers)
- Device testing (S21, S23, S26 Ultra minimum)
- Google Play Console submission prep
- Release APK signed & ready

**Testing:**
- Play campaign on 3+ Android devices
- Check ads display on real Google Play test account
- Verify analytics events firing
- Test offline progression (close app, reopen)

---

## Part 10: Deployment & DevOps

### Build & Release Pipeline

**Android (Google Play):**

1. **Local build:**
   ```bash
   eas build --platform android --profile preview
   ```

2. **Test APK:**
   - Upload to Expo for review
   - Test on Pixel emulator + real device

3. **Production build:**
   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```

4. **Google Play Console:**
   - Create app entry (name: "Corvus Protocol: Omen Wars")
   - Upload APK
   - Set store listing (description, screenshots, rating)
   - Release to Open Testing (week 4)
   - Promote to Production (week 5)

**iOS (App Store):**

1. **Build:**
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

2. **App Store Connect:**
   - Same process, Apple review (typically 2-5 days)

### Environment Variables

```
.env.dev
FIREBASE_API_KEY=xxx
FIREBASE_PROJECT_ID=corvus-protocol-dev
ADMOB_APP_ID=ca-app-pub-xxx
ELEVENLABS_API_KEY=xxx
BACKEND_URL=http://localhost:3000

.env.prod
FIREBASE_API_KEY=xxx
FIREBASE_PROJECT_ID=corvus-protocol-prod
ADMOB_APP_ID=ca-app-pub-xxx-xxxxxxxxxxxxxxxx
ELEVENLABS_API_KEY=xxx
BACKEND_URL=https://api.corvusprotocol.dev
```

### Server Deployment (Node.js backend)

**Host options:**
- Vercel (serverless, easiest)
- AWS Lambda + API Gateway (cheapest)
- Heroku (deprecated, avoid)

**Recommended: Vercel**

```bash
vercel deploy --prod
```

Deploy on each backend change (typically weekly in MVP phase).

### Database

**Firebase Firestore (easiest for MVP):**
- Collections: `users`, `accounts`, `campaigns` (optional)
- No server-side schema validation needed
- Real-time sync built-in

**PostgreSQL (if scaling heavily):**
- Hosted: Render, Supabase, Railway
- Tables: `users`, `account_progression`, `analytics_events`
- Connection pooling via Prisma

---

## Part 11: Testing Checklist

### Functional Testing

- [ ] Campaign starts, enemies spawn
- [ ] Towers deal damage to enemies
- [ ] Boss spawns at wave 15
- [ ] Boss health decreases, phase 2 triggers at 50%
- [ ] Resonance accumulates + idle ticking
- [ ] Character XP increases per action
- [ ] Prestige resets levels, increases multiplier
- [ ] Cosmetics unlock on prestige
- [ ] Rewarded ads display + reward correctly
- [ ] Convenience Pass hides ads
- [ ] Consumables purchase + apply
- [ ] Offline Resonance accumulates (app closed)
- [ ] Idle screen displays correct earned amount

### Performance Testing

- [ ] Campaign runs at 60 FPS for 30 min
- [ ] Memory usage < 200MB during campaign
- [ ] No frame drops on tower placement
- [ ] Ads don't cause stuttering
- [ ] Background task (idle ticker) doesn't drain battery >10% per hour

### Compatibility Testing

- [ ] Android 10+ (test on emulator + real device)
- [ ] Phone & tablet layouts (test on 5.5" and 10" screens)
- [ ] Offline functionality (disable network, verify idle works)
- [ ] Subscription cross-device (purchase on device A, verify on device B)

### Analytics Testing

- [ ] Events fire (campaign_won, ad_watched, etc.)
- [ ] User session tracking
- [ ] Crash reporting functional

---

## Part 12: Success Metrics & KPIs

**Track these in Firebase Analytics:**

| Metric | Target (Month 1) | Target (Month 3) |
|--------|------------------|------------------|
| Installs | 1,000+ | 1,200+ |
| D1 Retention | 35%+ | 35%+ |
| D7 Retention | 15%+ | 18%+ |
| D30 Retention | 8%+ | 10%+ |
| Avg session length | 8 min | 12 min |
| Ad watch rate | 20% | 25% |
| Subscription rate | 1% | 2% |
| Revenue | $1,200 | $6,700 |

**If D7 retention drops below 10%:** Pause cosmetics work, focus on onboarding/progression clarity.

---

## Part 13: Known Unknowns & Risks

| Risk | Mitigation |
|------|-----------|
| Onboarding too complex | A/B test tutorial, simplify if needed |
| Corvus voice is off-putting | Collect feedback week 1, adjust if needed |
| Ad CPM lower than expected | Reduce reliance on ads, push pass |
| Boss fight unfun | Adjust AI, add phase mechanics, re-test |
| Progression too grindy | Increase XP gain, reduce prestige cooldown |
| Server costs spike | Monitor Redis usage, optimize state size |
| iOS submission rejected | Plan 2-week buffer, review guidelines early |

---

## Part 14: Post-MVP Roadmap (Future Updates)

**Week 9-12 (Update 1.1: Character Progression)**
- Character progression trees (unlock abilities at level 25, 50, 75)
- New consumables (prophecies, blessings)
- 3 new boss variants

**Week 13-16 (Update 1.2: Rune System)**
- Rune drops from boss defeats
- Rune fusion (3 common → 1 rare)
- Rune shop integration

**Week 17-20 (Update 1.3: Act 2)**
- New campaign (25 waves, 2 new bosses)
- Story narrative deepens
- New character skins

---

## Part 15: Code Quality Standards

### TypeScript & Linting

```bash
# tsconfig.json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "esModuleInterop": true
}

# .eslintrc
{
  "extends": ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-any": "error"
  }
}
```

### Git Workflow

```
main (production-ready)
  ↑
staging (tested, ready for release)
  ↑
dev (daily development, feature branches)
```

**Branch naming:**
- `feature/tower-ai` (new feature)
- `bugfix/offline-resonance-calc` (bug fix)
- `hotfix/crash-on-prestige` (urgent production fix)

**Commit messages:**
```
feat: add Mira tower amplification aura
fix: offline resonance miscalculating with pass active
perf: optimize tower rendering for 60 FPS
docs: update API spec for prestige endpoint
```

### Testing Standards

**Unit tests (Jest):**
- Damage calculation
- XP gain logic
- Prestige multiplier calc
- Offline Resonance accumulation

**Integration tests:**
- Campaign start → finish flow
- Ad watch → reward application
- Subscription toggle

**E2E tests (Detox or Appium):**
- Full campaign playthrough (Easy → Normal → Hard)
- Prestige flow
- Shop purchase flow

---

## Contact & Escalation

**Project Owner:** Joshua Turner  
**Email:** joshua@oldcrowswireless.com  
**Phone:** 850-861-7582

**Publisher:** Houston George (Mad Apps)  
**Contact:** (Provided separately)

**Weekly sync:** Tuesdays 10 AM CT (Zoom)  
**Async updates:** Slack #corvus-dev

---

## Appendix A: Example Game States

### Campaign State (In Progress)

```json
{
  "campaignId": "campaign_abc123",
  "userId": "user_xyz789",
  "difficulty": "normal",
  "createdAt": "2024-07-08T14:30:00Z",
  "wave": 7,
  "bossPhase": false,
  "elapsedSeconds": 145,
  "towers": [
    {
      "id": "tower_1",
      "type": "corvus",
      "position": { "x": 150, "y": 200 },
      "level": 1,
      "health": 100,
      "kills": 12,
      "damageDealt": 450
    }
  ],
  "enemies": [
    {
      "id": "ghost_5",
      "type": "pale_whisper",
      "position": { "x": 300, "y": 250 },
      "health": 35,
      "maxHealth": 75,
      "targetTower": "tower_1"
    }
  ],
  "resonance": 2500,
  "resonancePerSecond": 50,
  "buffs": [
    {
      "type": "crit_chance",
      "value": 0.15,
      "source": "corvus_level",
      "duration": 300
    }
  ]
}
```

### Account State (After Prestige)

```json
{
  "uid": "user_xyz789",
  "epoch": 2,
  "prestigeMultiplier": 2.25,
  "createdAt": "2024-06-01T10:00:00Z",
  "lastPrestigeAt": "2024-07-08T15:45:00Z",
  "characters": {
    "corvus": {
      "level": 0,
      "totalXp": 3500,
      "xpThisEpoch": 0
    },
    "sage": {
      "level": 0,
      "totalXp": 2100,
      "xpThisEpoch": 0
    },
    "pip": {
      "level": 0,
      "totalXp": 4200,
      "xpThisEpoch": 0
    },
    "mira": {
      "level": 0,
      "totalXp": 1800,
      "xpThisEpoch": 0
    }
  },
  "cosmetics": {
    "familiars": ["krragh"],
    "unlockedSkins": ["corvus_plague"],
    "equippedSkin": "corvus_plague"
  },
  "consumables": {
    "ritual_resonance_boost": 0
  },
  "subscription": {
    "conveniencePass": {
      "active": true,
      "purchasedAt": "2024-07-01T12:00:00Z",
      "renewsAt": "2024-08-01T12:00:00Z"
    }
  }
}
```

---

## Appendix B: Frequently Asked Questions for Contractor

**Q: Should I build the backend in Node.js or use Firebase?**
A: Use Firebase for MVP. Firestore + Cloud Functions are fast to iterate. Migrate to Node.js + PostgreSQL post-launch if needed.

**Q: How do I handle campaign state persistence if the app crashes mid-game?**
A: Save campaign state to local storage every 10 seconds. On app resume, check if campaign exists; if yes, prompt "Resume or Start Over?"

**Q: Where do I store tower sprites—app bundle or server?**
A: App bundle. Keep assets under 100MB total. Use asset compression (WebP for sprites).

**Q: How do I test ads without submitting to Google Play?**
A: Use Google Mobile Ads test app IDs in dev build. Switch to production IDs in release build.

**Q: Should prestige take you back to the main menu or stay in-game?**
A: Main menu with prestige confirmation screen. Show new epoch + multiplier + unlocked cosmetic before returning to play.

**Q: How do I prevent cheating (modifying Resonance locally)?**
A: Don't. Validate on server-side only for cosmetics purchases. Campaign progression is client-side (no competition/leaderboards yet).

---

**End of Handoff Document**

