# Handoff: Corvus Protocol — UI System

## Overview
Full mobile UI system for **Corvus Protocol: The Omen Wars**, a mythological idle tower-defense hybrid
(React Native/Expo, per `ORIGINAL_GAME_SPEC.md`). Covers every MVP screen plus three retention systems
added after design research into idle/TD/gacha addiction mechanics: a variable-reward "Bone-Cast" roll,
a Daily Rituals quest hub, and a premium currency ("Feathers") economy.

## About the Design Files
`Corvus Protocol UI.dc.html` is a **design reference**, not production code. It's an HTML/CSS mockup
(inline styles only) meant to communicate exact layout, color, type, and copy — open it in a browser
(with `support.js` alongside it) to view all screens on one pannable canvas. **Do not port this HTML
directly into the app.** Recreate each screen natively in React Native using the project's actual
component library and navigation — this file is the spec you build against, not the code you ship.

## Fidelity
**High-fidelity.** Colors are exact hex values, type is a real Google Fonts pairing (Cinzel / Space
Grotesk / Space Mono), and spacing/sizing in the mockup is legible at 1:1 (phone frames are 320×660,
scale up proportionally to real device widths). The **isometric board environment** (arch, roots,
fungus) is a *directional composition only*, built from flat CSS shapes — it is not final art. Treat
it as an art-direction reference for whoever builds the real 3D scene, not a pixel spec.

## Screens / Views
All screens live in one file, each in its own labeled phone frame (`data-screen-label` attributes make
them searchable). In build order:

1. **Splash** — logo lockup, animated sigil placeholder, loading bar. First-launch only.
2. **Main Menu** — Resonance + Epoch/multiplier readout top bar, PLAY (resumes saved wave)/PRESTIGE/
   SHOP/SETTINGS stack.
3. **Difficulty Select** — Easy/Normal/Hard cards, reward multiplier and enemy-health modifier per tier,
   selected state has teal glow border.
4. **Campaign HUD** (core gameplay) — 4 character chips w/ level bars (top), wave/boss banner incl. a
   **wave-affix chip** (e.g. "SWARM +30% spawn rate" — see Interactions below), isometric board, tower
   palette carousel, Resonance + Feathers pills, pause.
5. **Prestige** — current→new multiplier, reset warnings, epoch cosmetic unlock, confirm/cancel.
6. **Shop** — tabs: Cosmetics / Consumables / Pass / Feathers (4th tab added post-research).
7. **Idle/Offline** — Corvus portrait, offline Resonance earned with 8h-cap progress bar, claim/prestige,
   watch-ad-for-2x, pass upsell.
8. **Settings** — audio toggles, graphics quality, debug metrics, account/sign-in, reset account.
9. **The Rookery** — roster hub: all 5 Murder members perched together (real character renders), tap
   any to see a detail card (DPS/range/crit, ability blurb, equip button). Rosa is flagged "NEW" — she's
   not in the original 4-character MVP scope, included because reference art exists; confirm with
   product whether she ships at launch or as a post-launch unlock.
10. **The Board** — hero close-up of the isometric grid: path/buildable/altar tile legend, towers and
    Pale Chorus enemies placed on it, 2× speed toggle. Environment is "The Hollow Roots" concept (see
    Assets below) — needs real art/3D.
11. **The Pale Chorus** — enemy bestiary/codex: Wisp, Wailer, Shrieker, Husk (all new — not in original
    spec, invented to fill "the rest is up to you"), and boss Whisper (both phases). Stats shown are
    placeholder balance numbers for engineering to replace.
12. **Bone-Cast** (a/b) — the variable-reward ritual roll. (a) pre-roll: tumbling bone tiles + a
    **disclosed odds ledger** with a stated pity rule (guaranteed Rune+ every 10 casts — keep this,
    it's an ethical/App-Store-compliance safeguard, not just flavor). (b) reveal: payoff card.
13. **Daily Rituals** — 7-day login streak calendar, 2 daily quests + 1 ad-watch quest, 1 weekly quest.
    This is where Feathers are primarily earned.
14. **Store — Feather Packs** — 4-tier IAP ladder (Handful/Pouch/Hoard/Murder's Ransom) with standard
    anchor pricing (a "Popular" mid-tier, a "Best Value" top-tier), explicit no-pay-to-win disclosure.

## Interactions & Behavior
- **Wave randomization**: enemy composition/spawn order should vary within difficulty bounds per run
  (not identical wave-8 every time). The HUD's "AFFIX" chip surfaces the run's active modifier to the
  player — this is a real mechanic, not just UI dressing.
- **Bone-Cast anticipation**: the reveal (screen 12b) should have a short suspense beat (bones flip
  face-up in sequence, ~150ms stagger) before the result card appears — the psychology here is that
  dopamine peaks on anticipation, not payout, so don't cut straight to the result.
- **Prestige**: confirm → full reset (Resonance, character levels, towers) → epoch+1, multiplier =
  `(epoch+1) × 1.5^epoch`, one cosmetic unlock. Feathers are NOT reset by prestige (Resonance is).
- Standard nav: Splash → Main Menu is one-way. Main Menu ⇄ Difficulty/Shop/Settings/Rookery/Daily
  Rituals. Difficulty Select → Campaign HUD (→ Board is a detail/zoom view of the same session, not a
  separate screen in the nav stack — implement as a mode/zoom toggle, not a push).

## State Management
Reuse the JSON shapes already defined in `ORIGINAL_GAME_SPEC.md` (Part 2) for campaign/account state.
Net-new state introduced by this design pass:
- `feathers: number` on the account object — premium currency, persists through prestige.
- `dailyRituals: { streakDay: number, quests: [{id, progress, target, reward, claimed}], weekly: {...} }`
- `boneCast: { freeCastsRemaining, castsSincePity, lastResult }`
- `waveAffix: string` per campaign — rolled at wave start, drawn from a small enum (Swarm, Fog, etc.)

## Design Tokens
**Palette** — background/neutrals: `#0A0E12` `#1A2332` `#F4F6F8`. Accents: teal `#00C2C7` / `#0D6E7A`
(Corvus, primary CTA), gold `#B8922A` / `#E4C15A` (Resonance/Mira), purple `#6B4FA0` (Sage/prestige),
green `#3ecf6e` (Pip), rust `#c05a3f` (Rosa). Feathers currency uses a teal→gold gradient diamond icon
(not a flat color) to read as distinct from both soft currencies.

**Type** — Cinzel 500–800 (display/titles), Space Grotesk 400–700 (UI/body), Space Mono 400/700
(stats/numbers/labels). Google Fonts, already linked in the file's `<helmet>`.

**Radii/shadows** — cards: 12–20px radius. Glows are `box-shadow` with the element's own accent color
at 30–50% opacity, not a generic drop shadow — reuse that pattern for new UI (e.g. `box-shadow: 0 0
24px rgba(0,194,199,.4)` for a teal-glowing primary button).

## Assets
- `assets/cast/*.png` — 5 characters (Corvus, Sage, Pip, Mira, Rosa) × 4 angles (front/back/side_l/
  threeq_l). **These are turntable renders of 3D models generated in Meshy**, not 2D illustrations —
  keep using Meshy for new assets so everything stays in one pipeline.
- `ART_BRIEF_PALE_CHORUS.md` — ready-to-run Meshy/art prompts for the 5 Pale Chorus enemies (Wisp,
  Wailer, Shrieker, Husk, Whisper boss ×2 phases) and 3 "Hollow Roots" environment concept shots,
  written to match the existing character render style so everything drops into one visual family.
- **Recommendation for the board**: since character/enemy assets are real 3D models, consider building
  the isometric board as an actual WebGL scene (`@react-three/fiber` + `expo-gl` in Expo) importing the
  GLBs directly, rather than baking them to flat sprites — the environment brief (gothic arches, roots,
  parallax fog) will read much better with real depth than as flat images. Flat-sprite Canvas rendering
  remains a valid fallback if 3D-in-Expo proves too heavy for target devices.

## Files
- `Corvus Protocol UI.dc.html` + `support.js` — open the .dc.html in a browser to view all 14 screens.
- `ART_BRIEF_PALE_CHORUS.md` — art generation prompts for enemies + environment.
- `ORIGINAL_GAME_SPEC.md` — the original technical/gameplay handoff doc (economy formulas, API spec,
  wave/tower math, dev phase plan) this design was built against.
- `assets/cast/` — the 20 character reference renders.
