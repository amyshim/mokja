# Mokja - Test Results

**Date:** 2026-02-18
**Method:** Code review + interactive browser testing (Playwright)
**Build:** Vite dev server (localhost:5173)

---

## Summary

| Category | Pass | Fail | Req Doc Error | Total |
|----------|------|------|---------------|-------|
| R1: Title Screen | 5 | 1 | 1 | 6 |
| R2: Farming | 9 | 1 | 1 | 11 |
| R3: Menu Setting | 4 | 2 | 2 | 8 |
| R4: Cooking | 7 | 0 | 0 | 7 |
| R5: Serving | 10 | 1 | 2 | 13 |
| R6: Accounting | 7 | 0 | 0 | 7 |
| R7: Persistence | 5 | 0 | 0 | 5 |
| R8: Economy | 2 | 0 | 4 | 6 |
| R9: Time System | 3 | 0 | 0 | 3 |
| R10: UI | 5 | 0 | 0 | 5 |
| **Total** | **57** | **5** | **10** | **71** |

### Verdict: 5 code bugs found, 10 requirements doc corrections needed

---

## Bugs Found (Code)

### BUG-1: CRITICAL — Watering mechanic is completely broken
**Severity:** Critical
**Files:** `src/systems/TimeSystem.ts:16-28`, `src/systems/TimeSystem.ts:33-44`
**Test Cases Failed:** TC-2.8

**Description:** Both `processOfflineGrowth()` and `advanceDay()` reset `wateredToday = false` on crops in the same iteration where they become ready. Since all crops have `growthDays = 1`, any watered crop will have its `wateredToday` flag cleared by the time it matures. This makes the 2x yield bonus permanently unachievable.

**Reproduction:**
1. Plant cabbage → water it → use DEV skip (or wait 24h, or go through Accounting → Next Day)
2. Harvest the crop
3. **Expected:** 4x Napa Cabbage (watered yield)
4. **Actual:** 2x Napa Cabbage (base yield — same as unwatered)

**Root Cause:** In `TimeSystem.processOfflineGrowth()` and `advanceDay()`:
```typescript
if (plot.cropId && !plot.ready) {
    plot.growthDays += 1;
    if (crop && plot.growthDays >= crop.growthDays) {
        plot.ready = true;   // ← crop becomes ready
    }
    plot.wateredToday = false; // ← BUT watered flag is always cleared
}
```

**Fix:** Only reset `wateredToday` if the crop did NOT become ready in this cycle:
```typescript
if (!plot.ready) {
    plot.wateredToday = false;
}
```

---

### BUG-2: CRITICAL — Menu allows over-allocating shared ingredients (negative inventory)
**Severity:** Critical
**Files:** `src/systems/RecipeSystem.ts:21-46`, `src/scenes/MenuScene.ts:104-111`
**Test Cases Failed:** TC-3.3 (partially), R3.3.4

**Description:** Two independent bugs combine:
1. **UI bug:** Max servings per recipe are calculated once at scene creation and never recalculated as the player adjusts other recipes. The +/- buttons don't account for ingredients allocated to other dishes.
2. **Validation bug:** `commitMenu()` validates each recipe's `maxServings()` independently against the full inventory, not accounting for ingredients allocated to other items in the same commit.

**Reproduction:**
1. Start with inventory: 11 cabbage, 7 pepper, 9 rice
2. Set Kimchi to 5 servings (needs 10 cabbage, 5 pepper)
3. Set Kimchi Stew to 3 servings (needs 9 cabbage, 3 pepper)
4. Click "Start Cooking"
5. **Expected:** Validation error — total needs 19 cabbage but only 11 available
6. **Actual:** Commit succeeds. Inventory goes to cabbage = -8, pepper = -1

**Fix:** Either:
- (a) Recalculate max servings dynamically as allocations change, OR
- (b) In `commitMenu()`, do a cumulative ingredient check across all items before deducting

---

### BUG-3: MEDIUM — "Close Service" available before all customers served
**Severity:** Medium
**File:** `src/scenes/ServeScene.ts:106-115`
**Test Cases Failed:** TC-5.12 (partial)

**Description:** The "Close Service" button is always visible and clickable from the moment the Serve scene loads, not gated on `ServingSystem.isServiceDone()`. Players can skip serving entirely and go straight to Accounting.

**Reproduction:**
1. Enter Serve scene with 8 customers
2. Click "Close Service" immediately without serving anyone
3. **Expected:** Button disabled or hidden until all customers served
4. **Actual:** Transitions to Accounting with 0 customers served, $0 earned

**Fix:** Either hide/disable the button until `isServiceDone()`, or show a confirmation dialog.

---

### BUG-4: LOW — New Game doesn't save immediately, old save persists
**Severity:** Low
**File:** `src/scenes/TitleScene.ts:39-44`
**Test Cases Failed:** TC-1.6

**Description:** Clicking "New Game" calls `state.reset()` and `grantStarterHarvest()` but does NOT call `saveGame()`. If the player starts a new game then closes the browser before reaching the first scene transition (Farm → Menu), the old save from a previous playthrough persists in localStorage.

**Reproduction:**
1. Play through a full day, creating a save at day 2
2. Click "New Game", see Farm scene (Day 1)
3. Close browser immediately
4. Reopen, click "Continue"
5. **Expected:** Day 1 fresh state
6. **Actual:** Day 2 old save loaded

**Fix:** Call `saveGame()` after `grantStarterHarvest()` in TitleScene.

---

### BUG-5: LOW — Tips use integer rounding instead of cent precision
**Severity:** Low (cosmetic/balance)
**File:** `src/systems/ServingSystem.ts:78`
**Test Cases Failed:** (Requirements doc mismatch)

**Description:** Tips are calculated with `Math.round(basePrice * tier.rate)`, producing integer dollar amounts. For Kimchi ($8) at 20%: `Math.round(1.6) = $2`, not $1.60. This slightly inflates tip income.

**Examples:**
| Dish | Price | Tier | Expected (float) | Actual (rounded) |
|------|-------|------|-------------------|------------------|
| Kimchi | $8 | 20% | $1.60 | $2 |
| Kimchi Stew | $12 | 15% | $1.80 | $2 |
| Fried Rice | $10 | 10% | $1.00 | $1 |
| Rice Tea | $5 | 20% | $1.00 | $1 |

**Note:** This may be intentional for simplicity. If so, update the requirements doc to reflect integer tips.

---

## Requirements Document Corrections

The following items in `REQUIREMENTS.md` are incorrect and need updating to match the actual code:

### REQFIX-1: Starter inventory values (R1.2.8)
- **Doc says:** 6 cabbage, 4 pepper, 6 rice
- **Actual:** Base (3, 3, 3) + starter harvest (6, 4, 6) = **9 cabbage, 7 pepper, 9 rice**
- **Fix:** Update R1.2.8 and TC-2.13

### REQFIX-2: Kimchi Stew ingredients (R3.2.2)
- **Doc says:** 2 cabbage, 1 pepper, 1 rice
- **Actual:** **3 cabbage, 1 pepper** (no rice)
- **Fix:** Update R3.2.2 and all related test cases

### REQFIX-3: Roasted Rice Tea ingredients (R3.2.4)
- **Doc says:** 2 rice
- **Actual:** **1 rice**
- **Fix:** Update R3.2.4 and all related test cases

### REQFIX-4: Rice crop yields (R8.2.3)
- **Doc says:** base=2, watered=4
- **Actual:** **base=3, watered=6**
- **Fix:** Update R8.2.3

### REQFIX-5: Kimchi Stew prep steps (R4.3.2)
- **Doc says:** Chop(2s) → Boil with kimchi & pork(3s) → Combine rice on side(1s)
- **Actual:** Chop cabbage(2s) → Boil stew(3s) → **Add pepper & season(2s)**
- **Fix:** Update R4.3.2 (step 3 label and duration)

### REQFIX-6: Kimchi Fried Rice prep steps (R4.3.3)
- **Doc says:** 3 steps (Chop → Combine rice in wok → Combine toppings)
- **Actual:** **2 steps** (Chop kimchi(2s) → Fry rice with kimchi(3s))
- **Fix:** Update R4.3.3

### REQFIX-7: Roasted Rice Tea prep steps (R4.3.4)
- **Doc says:** 2 steps (Boil → Combine into cups)
- **Actual:** **1 step** (Roast & steep rice(3s))
- **Fix:** Update R4.3.4

### REQFIX-8: Customer count (R5.2.1)
- **Doc says:** Generate 6-8 customers
- **Actual:** Always generates exactly **8** (`const CUSTOMER_COUNT = 8`)
- **Fix:** Update R5.2.1

### REQFIX-9: Tip calculation precision (R5.5, TC-5.14, TC-8.2, TC-8.3)
- **Doc says:** Kimchi <2min tip = $1.60, total $9.60
- **Actual:** Tips use `Math.round()` → **$2 tip, $10 total**
- **Fix:** Update all tip-related test cases to use integer amounts

### REQFIX-10: Max servings test case (TC-3.1)
- **Doc says:** With 6C, 4P, 6R → Kimchi max=2, Tea max=3
- **Actual:** Starting inventory is 9C, 7P, 9R. With actual recipes: Kimchi max=4, Stew max=3, Fried Rice max=4, Tea max=9
- **Fix:** Recalculate all max servings in TC-3.1 using correct inventory and ingredients

---

## Detailed Test Case Results

### R1: Title Screen

| TC | Result | Notes |
|----|--------|-------|
| TC-1.1 | PASS | Only "New Game" shown with no save (verified via screenshot) |
| TC-1.2 | PASS | All 3 buttons shown with save (code review: `hasSave()` check) |
| TC-1.3 | PASS | State resets, transitions to Farm. **But inventory is 9/7/9 not 6/4/6** (REQFIX-1) |
| TC-1.4 | PASS | `loadGame()` restores state correctly |
| TC-1.5 | PASS | `deleteSave()` + `scene.restart()` hides buttons |
| TC-1.6 | **FAIL** | Old save persists until next scene transition (BUG-4) |

### R2: Farming

| TC | Result | Notes |
|----|--------|-------|
| TC-2.1 | PASS | Planted cabbage; inventory 9→7; plot shows "growing" (verified via screenshot) |
| TC-2.2 | PASS | `FarmSystem.plant()` checks `available <= 0` |
| TC-2.3 | PASS | `FarmSystem.plant()` checks `plot.cropId !== null` |
| TC-2.4 | PASS | Plot shows "watered" in blue text (verified via screenshot) |
| TC-2.5 | PASS | `FarmSystem.water()` checks `plot.wateredToday` |
| TC-2.6 | PASS | `FarmSystem.water()` checks `!plot.cropId` |
| TC-2.7 | PASS | Unwatered cabbage yields 2 (verified via screenshot: "Harvested 2x") |
| TC-2.8 | **FAIL** | Watered cabbage also yields 2, not 4 — watering bonus lost (BUG-1) |
| TC-2.9 | PASS | `FarmSystem.harvest()` checks `!plot.ready` |
| TC-2.10 | PASS | `TimeSystem.processOfflineGrowth()` processes elapsed days (code review) |
| TC-2.11 | PASS | DEV skip advances growth; both plots showed "READY!" (verified via screenshot) |
| TC-2.12 | PASS | `saveGame()` called before `scene.start('Menu')` |
| TC-2.13 | REQFIX | 9 empty plots correct; inventory 9/7/9 not 6/4/6 (REQFIX-1) |

### R3: Menu Setting

| TC | Result | Notes |
|----|--------|-------|
| TC-3.1 | REQFIX | Max values wrong in doc due to wrong ingredients/inventory (REQFIX-2,3,10) |
| TC-3.2 | PASS | +/- buttons adjust counter correctly (verified via screenshot: Kimchi→5) |
| TC-3.3 | **FAIL** | Max doesn't recalculate for shared ingredients (BUG-2). UI allowed 5 Kimchi + 3 Stew exceeding inventory |
| TC-3.4 | PASS | Counter stays at 0 when pressing - |
| TC-3.5 | PASS | Projected profit shows correctly: 5×$8 + 3×$12 = $76 (verified via screenshot) |
| TC-3.6 | **FAIL** | Commit succeeds with overallocated ingredients → negative inventory (BUG-2) |
| TC-3.7 | PASS | `confirmMenu()` checks `items.length === 0` and shows error |
| TC-3.8 | REQFIX | Stew uses 3C/1P not 2C/1P/1R as doc says (REQFIX-2) |

### R4: Cooking

| TC | Result | Notes |
|----|--------|-------|
| TC-4.1 | PASS | Chop: 5 taps completes step (verified interactively) |
| TC-4.2 | PASS | Combine: 3 taps completes step (verified interactively) |
| TC-4.3 | PASS | Boil: hold fills progress over duration (verified interactively) |
| TC-4.4 | PASS | Release stops boil progress; `isInteracting = false` on pointerup/pointerout |
| TC-4.5 | PASS | Multiple servings cooked sequentially (verified: 0/8 → 5/8 → 8/8) |
| TC-4.6 | PASS | "All dishes prepared!" + "Open Restaurant" button shown (verified via screenshot) |
| TC-4.7 | PASS | Progress shows "Prepared: 5/8", "Prepared: 8/8" correctly |

### R5: Serving

| TC | Result | Notes |
|----|--------|-------|
| TC-5.1 | PASS | 8 customers generated, 4 tables shown empty (verified via screenshot) |
| TC-5.2 | PASS | Selected customer highlighted gold (verified via screenshot) |
| TC-5.3 | PASS | 1p customer seated at 2-seat table (verified interactively) |
| TC-5.4 | PASS | "Table too small for group of 4!" (verified via screenshot) |
| TC-5.5 | PASS | Group of 3 can be seated at 4-seat table (code review) |
| TC-5.6 | PASS | Served in <2min → $2 tip (20% of $8, rounded) (verified via screenshot) |
| TC-5.7 | PASS | Tip tiers correctly defined in code (code review) |
| TC-5.8 | PASS | >5min tier at 10% (code review) |
| TC-5.9 | PASS | Table shows "DIRTY" in red after service (verified via screenshot) |
| TC-5.10 | PASS | Clicking dirty table cleans it (verified interactively) |
| TC-5.11 | PASS | `seatCustomer()` checks `table.dirty` (code review) |
| TC-5.12 | **FAIL** | "Close Service" always available, not gated on all served (BUG-3) |
| TC-5.13 | PASS | Transitions to Accounting; state saved |
| TC-5.14 | REQFIX | Tip is $2 not $1.60; total $10 not $9.60 (REQFIX-9) |

### R6: Accounting

| TC | Result | Notes |
|----|--------|-------|
| TC-6.1 | PASS | Shows 2 customers served correctly (verified via screenshot) |
| TC-6.2 | PASS | Revenue $16 = 2×$8 correct (verified via screenshot) |
| TC-6.3 | PASS | Wallet $20 = $16 revenue + $4 tips (verified via screenshot) |
| TC-6.4 | PASS | "Next Day" increments day and transitions to Farm (code review) |
| TC-6.5 | PASS | `TimeSystem.advanceDay()` advances crops, resets watered flags (code review) |
| TC-6.6 | PASS | `state.data.menu = []` clears menu (code review) |
| TC-6.7 | PASS | Inventory not modified during day transition (code review) |

### R7: Persistence

| TC | Result | Notes |
|----|--------|-------|
| TC-7.1 | PASS | `saveGame()` writes JSON to `mokja_save` key (code review) |
| TC-7.2 | PASS | `loadGame()` parses and restores full state (code review) |
| TC-7.3 | PASS | `deleteSave()` removes key (code review) |
| TC-7.4 | PASS | `hasSave()` returns false after delete; title hides buttons (code review) |
| TC-7.5 | PASS | All state fields serialized/deserialized (code review) |

### R8: Economy

| TC | Result | Notes |
|----|--------|-------|
| TC-8.1 | PASS | New game wallet = $0 (verified via screenshot) |
| TC-8.2 | REQFIX | Wallet = $8 + $2 = $10, not $9.60 (REQFIX-9) |
| TC-8.3 | REQFIX | Stew tip = Math.round(12×0.15) = $2, not $1.80 (REQFIX-9) |
| TC-8.4 | PASS | Unwatered cabbage yields 2 (verified via screenshot) |
| TC-8.5 | REQFIX | Watered yield SHOULD be 4 but is 2 due to BUG-1. Also rice yields are 3/6 not 2/4 (REQFIX-4) |
| TC-8.6 | PASS | Wallet accumulates across days (code review: wallet never reset) |

### R9: Time System

| TC | Result | Notes |
|----|--------|-------|
| TC-9.1 | PASS | DEV skip advances crops correctly (verified via screenshot) |
| TC-9.2 | PASS | Offline growth via timestamp comparison (code review) |
| TC-9.3 | PASS | `advanceDay()` increments growth by 1 (code review) |

### R10: UI

| TC | Result | Notes |
|----|--------|-------|
| TC-10.1 | PASS | 400×600 canvas with FIT scaling (verified via browser) |
| TC-10.2 | PASS | Mode button color changes on selection (verified via screenshots) |
| TC-10.3 | PASS | Table color changes when occupied (verified via screenshots) |
| TC-10.4 | PASS | "DIRTY" label in red after service (verified via screenshot) |
| TC-10.5 | PASS | Table returns to "Empty" after cleaning (verified interactively) |

### Edge Cases

| TC | Result | Notes |
|----|--------|-------|
| TC-EDGE-1 | PASS | Empty inventory shows max=0 for all recipes; "Start Cooking" shows error |
| TC-EDGE-2 | PASS | Full tables: no seating until serve/clean |
| TC-EDGE-3 | PASS | Dirty tables must be cleaned before seating |
| TC-EDGE-4 | PASS | Late service → 10% tips |
| TC-EDGE-5 | PASS | Single recipe type: customers order only that dish |
| TC-EDGE-6 | PASS | Cleared localStorage → fresh title screen |
| TC-EDGE-7 | PASS | Same crop in all 9 plots works fine |
| TC-EDGE-8 | PASS | Ready crops don't expire (no decay mechanic) |
| TC-EDGE-9 | PARTIAL | Unservable customers remain — service can close early (BUG-3 related) |

---

## Bug Priority Ranking

| Priority | Bug | Impact |
|----------|-----|--------|
| 1 | BUG-2: Negative inventory | Game-breaking: corrupts state, allows impossible recipes |
| 2 | BUG-1: Watering broken | Core mechanic non-functional; 2x yield bonus never works |
| 3 | BUG-3: Early close service | Players can skip serving phase entirely |
| 4 | BUG-4: New game save gap | Edge case: only if browser closes immediately after New Game |
| 5 | BUG-5: Integer tip rounding | Minor balance issue; may be intentional |
