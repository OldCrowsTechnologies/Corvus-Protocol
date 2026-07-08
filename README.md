# Corvus Protocol: The Omen Wars

Mythological **idle tower-defense** — the Murder (Corvus · Sage · Pip · Mira) defend a
summoning circle against the Pale Chorus. React Native / Expo · TypeScript.

**Owner:** Joshua Turner / Old Crows Wireless Solutions · **Publisher:** Mad Apps (Houston George)
**Status:** MVP scaffold, 60-day Android soft launch target.

---

## Run it

```bash
npm install
npm run web        # fastest way to see it in a browser
npm run android    # device / emulator
npm start          # Expo dev server (scan QR)
npm run typecheck  # tsc --noEmit
```

## What's built

A running app with all 14 designed screens, native React Native (not a port of the HTML mockup):

- **Splash → Main Menu → Difficulty → Campaign** core flow, plus Prestige, Shop (4 tabs),
  Idle/Offline, Settings, Rookery, Pale Chorus bestiary, Bone-Cast, Daily Rituals.
- **Playable campaign loop** — real-time engine (`src/game/engine.ts`): path-to-altar enemies,
  tower auto-attack + damage calc, wave progression, Whisper boss (2 phases), win/loss,
  circle-integrity lives, wave affixes, 1×/2× speed, pause.
- **Economy** — Resonance bank (soft, resets on prestige), Feathers (premium, persists),
  prestige multiplier `(epoch+1) × 1.5^epoch`, 8h-capped offline income, disclosed-odds
  Bone-Cast with a pity guarantee, daily rituals + streak.
- **Persistence** — Zustand + AsyncStorage (`src/state/store.ts`).

## Art

Character cast are the painterly plague-doctor crows sliced from `docs/design/GAME_BIBLE.png`
(`assets/cast/<id>_portrait.png` + `_full.png`). The bible is the visual North Star:
violet-forward gothic, luminescent, ornate. Rosa uses her Meshy render until bible art exists.

Enemy sprites (7 + boss Whisper) also exist in the bible and are a good next art wiring pass —
the board currently renders enemies as stylized flat shapes.

## Layout

```
src/
  theme/       design tokens (colors/type/radii/glows) + font loading
  cast.ts      character portrait/full asset map
  game/        types, constants (towers/enemies/difficulties/affixes),
               formulas, board geometry, boneCast odds+pity, engine (sim)
  state/       zustand store (+ persist)
  components/  Screen, T, GlowButton, Sigil, CurrencyPill, CharacterAvatar, ui atoms
  navigation/  native-stack root navigator
  screens/     the 14 screens (+ CampaignBoard)
docs/design/   GAME_BIBLE.png, UI reference mockup, original + art-brief specs
```

See `docs/design/ORIGINAL_GAME_SPEC.md` for the full economy/mechanics handoff and
`docs/design/README.md` for the UI-system design notes.
