# Mokja — MVP Build Plan

## 1. MVP Feature Scope

### Included in MVP

| Feature | Phase | Notes |
|---------|-------|-------|
| Plant, water, harvest crops | Farming | 3 starter crops: napa cabbage, red pepper, rice |
| Crop growth over real time | Farming | 1-day growth cycle using device time |
| Watering mechanic (2x yield) | Farming | One water per crop per day |
| Set daily lunch menu from inventory | Menu Setting | Select dishes, see servings possible |
| Recipe system (ingredients → dishes) | Menu Setting | 4 starter recipes: kimchi, kimchi stew, kimchi fried rice, roasted rice tea |
| Profit margins per dish displayed | Menu Setting | Static values, simple puzzle element |
| Chop/boil/combine mini-interactions | Cooking | Simple tap/click interactions — not full simulation |
| Customers arrive, seat them | Serving | Solo diners + small groups (2-4) |
| Take orders, assemble plates, serve | Serving | Overcooked-lite: drag prepared dishes to plates |
| Tip tiers based on serve time | Serving | 3 tiers: <2min (20%), 2-5min (15%), >5min (10%) |
| Wipe tables between customers | Serving | Quick interaction to reset table |
| End-of-day earnings summary | Accounting | Revenue + tips breakdown |
| Day cycle (open → close → next day) | Core Loop | Full loop completable in one session |

### Deferred (post-MVP)

| Feature | Reason for Deferral |
|---------|---------------------|
| Rearranging farm plot aesthetically | Nice-to-have, doesn't affect core loop |
| Hiring cooks/servers (idle mechanics) | Advanced feature, requires progression system |
| Leveling up / unlocking new crops & recipes | Requires content pipeline and balancing — MVP tests the loop, not the progression |
| Cleaning animation (accounting phase) | Polish, not functional |
| Shareable "you served X" prompt | Social feature, needs design for sharing targets |
| Speech/thinking bubbles on diners | Flavor detail — MVP can use simple order indicators |
| Desktop "full version" | Explicitly post-browser-launch per GDD |

### MVP Definition

A player can: plant crops → wait for growth (or skip for testing) → harvest → set a menu → cook dishes → serve a lunch rush of customers → see earnings. This is **one full day**. The MVP supports repeating this loop across multiple days with persistent state.

---

## 2. Tech Stack Recommendation

| Layer | Choice | Why |
|-------|--------|-----|
| **Game engine** | [Phaser 3](https://phaser.io/) | Purpose-built for 2D browser games. Sprite system, scene management, input handling, tween animations. Large community. No install for players. |
| **Language** | TypeScript | Type safety for game state, good Phaser support, catches bugs early |
| **Build tool** | Vite | Fast HMR for dev, simple config, great TS support |
| **State management** | Plain TypeScript classes + JSON serialization | Game state is local-only. A `GameState` object serialized to `localStorage`. No need for Redux/Zustand complexity. |
| **Asset pipeline** | Sprite sheets (PNG) loaded via Phaser's asset loader | Art is defined in a manifest file (`assets.json`). Swap art by replacing PNGs — zero code changes. |
| **Audio** | Phaser built-in audio | Ambient background + simple SFX. Deferred if time-constrained. |
| **Deployment** | Static hosting (Netlify, Vercel, or GitHub Pages) | No backend. Just HTML/JS/CSS + assets. |

**Why not other options:**

| Alternative | Rejection reason |
|-------------|-----------------|
| Unity WebGL | Heavy build size, overkill for pixel art 2D |
| PixiJS | Lower-level than Phaser — would need to build scene management, input, etc. from scratch |
| Canvas/vanilla JS | Too low-level, reinventing the wheel |
| Kaboom.js | Simpler but less mature ecosystem, fewer resources |

---

## 3. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────┐
│                  SceneManager                    │
│  (Phaser scenes — one per game phase)            │
├──────┬──────┬──────┬──────┬──────┬──────────────┤
│ Farm │ Menu │ Cook │Serve │Acct. │  Title/HUD   │
│Scene │Scene │Scene │Scene │Scene │  Scenes      │
└──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──────────────┘
   │      │      │      │      │
   └──────┴──────┴──────┴──────┘
                  │
          ┌───────▼────────┐
          │   GameState    │
          │  (singleton)   │
          ├────────────────┤
          │ farm: FarmData │
          │ inventory: {}  │
          │ menu: []       │
          │ kitchen: {}    │
          │ restaurant: {} │
          │ wallet: number │
          │ day: number    │
          └───────┬────────┘
                  │
          ┌───────▼────────┐
          │  Persistence   │
          │ (localStorage) │
          └────────────────┘
```

### Core Data Model

```typescript
interface GameState {
  day: number;
  wallet: number;
  farm: FarmData;
  inventory: Inventory;
  menu: MenuItem[];
  restaurant: RestaurantData;
}

interface FarmData {
  plots: PlotData[];  // grid of plantable spots
}

interface PlotData {
  cropId: string | null;    // null = empty
  plantedAt: number;        // timestamp
  wateredToday: boolean;
  growthDays: number;       // days since planted
  ready: boolean;           // harvestable?
}

interface Inventory {
  [cropId: string]: number; // crop name → quantity
}

interface Recipe {
  id: string;
  name: string;
  ingredients: { cropId: string; quantity: number }[];
  profitPerServing: number;
  prepSteps: PrepStep[];    // for cooking mini-game
}

interface MenuItem {
  recipeId: string;
  servingsPlanned: number;
  servingsPrepared: number; // after cooking phase
}

interface RestaurantData {
  tables: TableData[];
  customers: CustomerData[];
}

interface TableData {
  id: number;
  seats: number;
  occupied: boolean;
}

interface CustomerData {
  id: string;
  groupSize: number;
  tableId: number | null;
  seatedAt: number | null;  // timestamp
  orderedRecipeId: string | null;
  served: boolean;
}
```

### Key Systems

1. **TimeSystem** — Tracks real device time for crop growth. Calculates elapsed days since last session.
2. **FarmSystem** — Manages planting, watering, growth calculation, harvesting. Updates inventory on harvest.
3. **RecipeSystem** — Static recipe definitions. Calculates available servings from inventory. Validates menu selections.
4. **CookingSystem** — Manages the cooking mini-game per dish. Tracks prep completion.
5. **ServingSystem** — Spawns customers, manages seating/ordering/serving flow, calculates tips based on elapsed time.
6. **EconomySystem** — Tallies revenue (base price + tips), updates wallet.
7. **PersistenceSystem** — Saves/loads `GameState` to `localStorage` as JSON.

---

## 4. File / Folder Structure

```
mokja/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── assets/
│   ├── assets.json              # Asset manifest (swap art here)
│   ├── sprites/
│   │   ├── crops/               # Individual crop sprites
│   │   │   ├── cabbage.png
│   │   │   ├── pepper.png
│   │   │   └── rice.png
│   │   ├── dishes/              # Dish sprites
│   │   ├── characters/          # Sam, customers
│   │   ├── ui/                  # Buttons, panels, icons
│   │   └── environment/         # Farm tiles, restaurant interior
│   └── audio/                   # BGM + SFX (optional for MVP)
├── src/
│   ├── main.ts                  # Phaser game config, boot
│   ├── config/
│   │   ├── crops.ts             # Crop definitions (growth time, yield)
│   │   └── recipes.ts           # Recipe definitions (ingredients, profit)
│   ├── state/
│   │   ├── GameState.ts         # Central state object
│   │   └── persistence.ts       # Save/load to localStorage
│   ├── systems/
│   │   ├── TimeSystem.ts
│   │   ├── FarmSystem.ts
│   │   ├── RecipeSystem.ts
│   │   ├── CookingSystem.ts
│   │   ├── ServingSystem.ts
│   │   └── EconomySystem.ts
│   ├── scenes/
│   │   ├── BootScene.ts         # Load assets
│   │   ├── TitleScene.ts        # Start screen
│   │   ├── FarmScene.ts         # Farming phase
│   │   ├── MenuScene.ts         # Menu setting phase
│   │   ├── CookScene.ts         # Cooking mini-game
│   │   ├── ServeScene.ts        # Restaurant serving phase
│   │   └── AccountingScene.ts   # End-of-day summary
│   ├── objects/                  # Phaser game objects
│   │   ├── CropSprite.ts
│   │   ├── CustomerSprite.ts
│   │   ├── TableObject.ts
│   │   └── DishSprite.ts
│   └── ui/
│       ├── HUD.ts               # Persistent UI (wallet, day counter)
│       ├── InventoryPanel.ts
│       └── MenuBuilder.ts       # UI for setting the daily menu
└── public/
    └── favicon.ico
```

### Art Swappability

All art is loaded via `assets/assets.json` manifest:

```json
{
  "crops": {
    "cabbage": "sprites/crops/cabbage.png",
    "pepper": "sprites/crops/pepper.png",
    "rice": "sprites/crops/rice.png"
  },
  "dishes": { ... },
  "characters": { ... }
}
```

To swap art: replace PNGs in `assets/sprites/`, keeping filenames. No code changes needed. For different dimensions, update the manifest with new frame sizes.

---

## 5. Implementation Order

Build in this order — each step is playable/testable before moving on.

| # | Task | Depends On | Deliverable |
|---|------|------------|-------------|
| 1 | **Project scaffold** | — | Vite + Phaser + TS boilerplate, boots to empty scene |
| 2 | **Asset pipeline** | 1 | Asset manifest, loader, placeholder pixel art for 3 crops |
| 3 | **Game state + persistence** | 1 | `GameState` object, save/load from localStorage, dev reset button |
| 4 | **Farm scene — planting & grid** | 2, 3 | Clickable grid, plant crops, see sprites appear |
| 5 | **Farm scene — watering & growth** | 4 | Water animation, time-based growth, harvestable state |
| 6 | **Farm scene — harvesting** | 5 | Click to harvest, crops added to inventory |
| 7 | **Menu scene** | 3, 6 | View inventory, select recipes, set servings, see profit projections |
| 8 | **Recipe data** | — | Static recipe definitions for 4 starter recipes |
| 9 | **Cooking scene** | 7, 8 | Simple interaction per dish (chop/boil/combine), marks servings as prepared |
| 10 | **Restaurant layout** | 2 | Static restaurant scene with 4 tables, rendered |
| 11 | **Serve scene — customer flow** | 9, 10 | Customers enter, seat them, take orders |
| 12 | **Serve scene — plate assembly & serving** | 11 | Drag dishes to plates, serve customers, tip calculation |
| 13 | **Serve scene — table cleanup** | 12 | Wipe tables, cycle new customers |
| 14 | **Accounting scene** | 12 | End-of-day earnings screen, wallet update |
| 15 | **Day cycle** | 14 | Transition back to farm, increment day, full loop works |
| 16 | **HUD** | 3 | Persistent display: day count, wallet, phase indicator |
| 17 | **Title screen** | 1 | Start new game / continue, basic branding |
| 18 | **Dev tools** | 3 | Time skip, add inventory, reset state (for playtesting) |

**Recommended milestones:**
- **Milestone 1 (Farmable):** Steps 1–6. Player can plant, water, grow, and harvest.
- **Milestone 2 (Cookable):** Steps 7–9. Player can plan a menu and cook.
- **Milestone 3 (Playable MVP):** Steps 10–15. Full core loop.
- **Milestone 4 (Playtestable):** Steps 16–18. Polish for external testers.

---

## 6. Open Questions

These need design decisions before or during building:

| # | Question | GDD Reference | Impact |
|---|----------|---------------|--------|
| 1 | **How does cooking work mechanically?** GDD says "simulated — TBD how." | Cooking phase: "These actions are simulated in the game – TBD how" | Determines entire CookScene design. Proposal: simple timed sequences (tap to chop 5 times, hold to boil for 3 sec, drag to combine). |
| 2 | **Farm grid size?** How many plots does the player start with? Can they expand? | Not specified | **Decided:** 4x4 grid (16 plots) for MVP. |
| 3 | **How many tables in the restaurant?** | "Players will never receive more customers than they have table space for" | Determines max customers per day, revenue ceiling. Proposal: 4 tables (1×2-seat, 2×4-seat, 1×6-seat) for MVP. |
| 4 | **Customer arrival rate and total per day?** | Not specified | **Decided:** Customer count equals total prepared servings. Customers only order dishes with remaining servings — players can always fulfill all orders. ~30% solo / ~70% groups of 2-4. |
| 5 | **What do customers order?** Random from menu? Preferences? | "Speech bubble icons appear... Players can talk to diners and take their order" | Proposal: Random selection from today's menu for MVP. |
| 6 | **Crop growth time — how many real-world days?** | "Everyday, once per day... observe crop growth" | Affects retention loop. Proposal: 1 real day for basic crops (with dev skip for testing). |
| 7 | **Starting resources?** Does the player start with seeds, money, or both? | Not specified | **Decided:** Seeds are unlimited (planting is free). Starter inventory is 6 cabbage, 4 pepper, 6 rice (starter harvest for day 1 cooking). Wallet starts at $0. |
| 8 | **Can the player run out / fail?** | Not specified | Partially addressed: seeds are unlimited, so players can always plant. If inventory is 0, they must wait for crops to grow before cooking. No fail state in MVP. |
| 9 | **Restaurant operating hours — real-time or game-time?** | "The player opens the restaurant" | Serving phase duration. Proposal: Game-time (fixed ~5 min session), not real-time. |
| 10 | **How does "day" work for first-time players?** | "Once per day (determined by device time)" | If growth requires 24 real hours, first session ends at farming. Proposal: First day auto-provides a starter harvest so players experience the full loop immediately. |
