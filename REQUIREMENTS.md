# Mokja - Requirements & Test Cases

## Overview

Mokja is a browser-based farming and restaurant management game with Korean cuisine themes. Players run a farm-to-table restaurant in Southern California, cycling through four daily phases: Farm, Menu, Serve, and Accounting.

**Target:** Women ages 25-45 seeking comfort gaming
**Platform:** Browser (400x600px, mobile-optimized)
**Engine:** Phaser 3 + TypeScript + Vite

---

## R1: Game Initialization & Title Screen

### R1.1 Boot Scene
The game loads and generates all placeholder assets before displaying the title screen.

| ID | Requirement |
|----|-------------|
| R1.1.1 | Boot scene generates colored rectangle sprites for all 3 crop types (cabbage, pepper, rice) |
| R1.1.2 | Boot scene generates sprites for all growth states (seed, growing, ready) |
| R1.1.3 | Boot scene displays a loading progress bar during asset generation |
| R1.1.4 | Boot scene auto-transitions to Title scene when loading completes |

### R1.2 Title Scene
The title screen offers New Game, Continue, and Delete Save options.

| ID | Requirement |
|----|-------------|
| R1.2.1 | Display game title "Mokja" |
| R1.2.2 | Display "New Game" button that starts a fresh game |
| R1.2.3 | Display "Continue" button only when a save exists in localStorage |
| R1.2.4 | "Continue" loads saved game state and transitions to Farm scene |
| R1.2.5 | "Delete Save" button appears only when a save exists |
| R1.2.6 | "Delete Save" removes the `mokja_save` key from localStorage |
| R1.2.7 | New game initializes: day=1, wallet=$0, empty farm (16 plots), starter inventory |
| R1.2.8 | Starter inventory grants 6 cabbage, 4 pepper, 6 rice (starter harvest for day 1) |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-1.1 | Launch game with no localStorage save | Title shows "New Game" only; no "Continue" or "Delete Save" |
| TC-1.2 | Launch game with existing save | Title shows "New Game", "Continue", and "Delete Save" |
| TC-1.3 | Click "New Game" | State resets to day 1, wallet $0, starter inventory; transitions to Farm |
| TC-1.4 | Click "Continue" with valid save | Game state restored from save; transitions to Farm |
| TC-1.5 | Click "Delete Save" | Save removed from localStorage; "Continue" and "Delete Save" disappear |
| TC-1.6 | Click "New Game" when a save already exists | Previous save overwritten with fresh state |

---

## R2: Farming Phase

### R2.1 Farm Grid
A 4x4 grid of interactive farm plots.

| ID | Requirement |
|----|-------------|
| R2.1.1 | Display 16 plots in a 4x4 grid |
| R2.1.2 | Each plot visually indicates its state: empty, growing, watered, ready |
| R2.1.3 | Display current inventory counts for all crop types |
| R2.1.4 | Display current day number |

### R2.2 Interaction Modes
Player selects a mode (Plant, Water, Harvest) before interacting with plots.

| ID | Requirement |
|----|-------------|
| R2.2.1 | Three mode buttons: Plant, Water, Harvest |
| R2.2.2 | Active mode is visually highlighted |
| R2.2.3 | Only one mode active at a time |

### R2.3 Planting
Player plants crops from inventory into empty plots.

| ID | Requirement |
|----|-------------|
| R2.3.1 | In Plant mode, crop selector shows cabbage, pepper, rice |
| R2.3.2 | Clicking an empty plot in Plant mode plants the selected crop |
| R2.3.3 | Planting does not consume inventory; seeds are unlimited |
| R2.3.4 | Cannot plant on an occupied plot |
| R2.3.5 | Planted crop starts with growthDays=0, wateredToday=false, ready=false |

### R2.4 Watering
Player waters growing crops for a yield bonus.

| ID | Requirement |
|----|-------------|
| R2.4.1 | In Water mode, clicking a growing (non-ready) plot marks it as watered |
| R2.4.2 | Each crop can only be watered once per day |
| R2.4.3 | Watering an already-watered crop has no effect |
| R2.4.4 | Cannot water an empty plot |
| R2.4.5 | Cannot water a ready-to-harvest crop |
| R2.4.6 | Watered plots show distinct visual indicator |

### R2.5 Harvesting
Player collects mature crops.

| ID | Requirement |
|----|-------------|
| R2.5.1 | In Harvest mode, clicking a ready crop harvests it |
| R2.5.2 | Unwatered harvest yields baseYield (2 units) |
| R2.5.3 | Watered harvest yields wateredYield (4 units, 2x base) |
| R2.5.4 | Harvested crop is added to inventory |
| R2.5.5 | Plot becomes empty after harvest |
| R2.5.6 | Cannot harvest a plot that is not ready |

### R2.6 Crop Growth
Crops grow over real time using device clock.

| ID | Requirement |
|----|-------------|
| R2.6.1 | All crops have a growth time of 1 real day (24 hours) |
| R2.6.2 | Growth is calculated from plantedAt timestamp |
| R2.6.3 | When growth time elapses, plot.ready becomes true |
| R2.6.4 | Offline growth: returning after absence processes elapsed real days |
| R2.6.5 | Dev skip button advances crop growth by 1 day instantly |

### R2.7 Scene Transition
Player moves to Menu phase when ready.

| ID | Requirement |
|----|-------------|
| R2.7.1 | "Set Menu" button transitions to Menu scene |
| R2.7.2 | Game state is saved to localStorage on transition |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-2.1 | Select Plant mode, select cabbage, click empty plot | Cabbage planted; inventory unchanged (seeds are free); plot shows growing state |
| TC-2.2 | Try to plant on an occupied plot | Nothing happens; existing crop unchanged |
| TC-2.4 | Select Water mode, click a growing crop | Plot marked as watered; visual changes |
| TC-2.5 | Water an already-watered crop | No change; still shows watered once |
| TC-2.6 | Try to water an empty plot | Nothing happens |
| TC-2.7 | Harvest a ready, unwatered crop (e.g., cabbage) | Yields 2 cabbage; plot clears to empty |
| TC-2.8 | Harvest a ready, watered crop (e.g., cabbage) | Yields 4 cabbage; plot clears to empty |
| TC-2.9 | Try to harvest a growing (not ready) crop | Nothing happens |
| TC-2.10 | Plant a crop, close browser, return after 24+ hours | Crop shows as ready on return |
| TC-2.11 | Click DEV skip button with growing crop | Crop advances 1 growth day; becomes ready if growth met |
| TC-2.12 | Click "Set Menu" | Transitions to Menu scene; save written to localStorage |
| TC-2.13 | Start new game, check farm | 16 empty plots; starter inventory: 6 cabbage, 4 pepper, 6 rice |

---

## R3: Menu Setting Phase

### R3.1 Recipe Display
Show available recipes as toggleable rows.

| ID | Requirement |
|----|-------------|
| R3.1.1 | Display all 4 recipes: Kimchi, Kimchi Stew, Kimchi Fried Rice, Roasted Rice Tea |
| R3.1.2 | Each recipe row shows: name, ingredient list with quantities, price per serving |
| R3.1.3 | Each recipe row shows prep steps summary |
| R3.1.4 | Display current inventory at top of screen |

### R3.2 Recipe Ingredients

| ID | Recipe | Ingredients per Serving | Price |
|----|--------|------------------------|-------|
| R3.2.1 | Kimchi | 2 cabbage, 1 pepper | $8 |
| R3.2.2 | Kimchi Stew | 3 cabbage, 1 pepper | $12 |
| R3.2.3 | Kimchi Fried Rice | 1 cabbage, 1 pepper, 2 rice | $10 |
| R3.2.4 | Roasted Rice Tea | 1 rice | $5 |

### R3.3 Dish Selection
Player toggles which dishes are on today's menu.

| ID | Requirement |
|----|-------------|
| R3.3.1 | Each recipe row is toggleable (on/off) |
| R3.3.2 | Selected recipes are visually highlighted (green checkbox, highlighted border) |
| R3.3.3 | Toggling a recipe on/off does not deduct or check ingredients |
| R3.3.4 | Menu determines which dishes customers can order during service |

### R3.4 Menu Commitment
Player confirms menu and proceeds to serving.

| ID | Requirement |
|----|-------------|
| R3.4.1 | "Open Restaurant" button saves the selected dishes as today's menu |
| R3.4.2 | Cannot confirm if no dishes are selected |
| R3.4.3 | No ingredients are deducted at menu confirmation (deduction happens per-order during service) |
| R3.4.4 | Transitions to Serve scene after commit |
| R3.4.5 | Game state saved on transition |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-3.1 | View Menu scene with 6 cabbage, 4 pepper, 6 rice | All 4 recipes shown with ingredients and prices |
| TC-3.2 | Tap Kimchi row | Kimchi highlighted with green checkbox; border turns green |
| TC-3.3 | Tap Kimchi row again | Kimchi deselected; checkbox and border return to default |
| TC-3.4 | Select Kimchi and Rice Tea, check inventory | Inventory unchanged (no deduction at menu time) |
| TC-3.5 | Click "Open Restaurant" with Kimchi selected | Transitions to Serve scene; menu saved with Kimchi |
| TC-3.6 | Click "Open Restaurant" with 0 dishes selected | Error message: "Select at least 1 dish!" |
| TC-3.7 | Click "<< Farm" back button | Returns to Farm scene without saving menu |

---

## R4: Serving Phase

### R4.1 Restaurant Layout
Display 4 tables and a kitchen cooking station.

| ID | Requirement |
|----|-------------|
| R4.1.1 | Display 4 tables: 1x 2-seat, 3x 4-seat |
| R4.1.2 | Tables positioned in upper 60% of screen (2 rows of 2) |
| R4.1.3 | Table color indicates state: empty (light wood), seated/ordered (warm tan), cooking (muted), ready (green), dirty (dark brown) |
| R4.1.4 | Kitchen cooking station displayed in bottom 25% of screen |
| R4.1.5 | Display earnings tracker (revenue running total) |
| R4.1.6 | Info text bar between tables and kitchen shows contextual instructions |

### R4.2 Customer Generation
Customers arrive dynamically, gated by ingredient availability.

| ID | Requirement |
|----|-------------|
| R4.2.1 | New customers only spawn when the restaurant has enough ingredients to fulfill at least one menu item |
| R4.2.2 | Customers are not all generated at once; they arrive dynamically over the course of service |
| R4.2.3 | Each customer has a unique ID and a random group size |

### R4.3 Customer Arrival
Customers trickle in and seat themselves.

| ID | Requirement |
|----|-------------|
| R4.3.1 | A new customer auto-seats at an empty clean table 3-5 seconds after one becomes available |
| R4.3.2 | First customer arrives after a short delay (~500ms) at service start |
| R4.3.3 | Customers seat themselves at the first available table (no player action required for seating) |
| R4.3.4 | Table marked as occupied when customer sits |
| R4.3.5 | No more customers arrive when no menu item can be fulfilled with remaining ingredients |

### R4.4 Order Flow (3-Tap Interaction)
Player serves each customer through a 3-tap sequence.

| ID | Requirement |
|----|-------------|
| R4.4.1 | **Tap 1 — Take order:** Tap a seated customer's table to take their order |
| R4.4.2 | Customer orders a random dish from today's menu, filtered to only dishes with enough ingredients |
| R4.4.3 | Ingredients for the ordered dish are deducted immediately when the order is taken |
| R4.4.4 | If ingredients run out after a customer is seated but before ordering, the customer leaves (no revenue) |
| R4.4.5 | Customer status changes from "seated" to "ordered"; table shows dish name |
| R4.4.6 | **Tap 2 — Start cooking:** Tap the table again to send the order to the kitchen |
| R4.4.7 | Only one order can cook at a time; tapping another ordered table while kitchen is busy shows "Kitchen is busy" message |
| R4.4.8 | Customer status changes to "cooking"; table shows "Cooking..." |
| R4.4.9 | Kitchen station activates: shows dish name, current step, progress bar, and interaction zone |
| R4.4.10 | **Tap 3 — Serve:** After cooking completes, tap the table to serve the dish |
| R4.4.11 | Revenue added to wallet and dayResults on serve |
| R4.4.12 | Customer status changes to "served"; table is vacated and marked dirty |

### R4.5 Cooking Mini-Game (Kitchen Station)
Interactive cooking steps for each order, performed inline during service.

| ID | Requirement |
|----|-------------|
| R4.5.1 | Kitchen station shows current recipe name, step label, and progress bar |
| R4.5.2 | Kitchen station shows interaction zone with step-specific instructions |
| R4.5.3 | When no order is cooking, kitchen shows "No orders to cook" idle state |

### R4.6 Cooking Interaction Types

| ID | Type | Interaction | Completion |
|----|------|-------------|------------|
| R4.6.1 | Chop | Tap/click the interaction zone | 5 taps to complete |
| R4.6.2 | Boil | Hold/press the interaction zone | Hold for step duration |
| R4.6.3 | Combine | Tap/click the interaction zone | 3 taps to complete |

### R4.7 Cooking Recipes (Prep Steps)

| ID | Recipe | Steps |
|----|--------|-------|
| R4.7.1 | Kimchi | Chop cabbage (2s) → Combine with pepper flakes & salt (2s) |
| R4.7.2 | Kimchi Stew | Chop cabbage (2s) → Boil stew (3s) → Add pepper & season (2s) |
| R4.7.3 | Kimchi Fried Rice | Chop kimchi (2s) → Fry rice with kimchi (3s) |
| R4.7.4 | Roasted Rice Tea | Roast & steep rice (3s) |

### R4.8 Table Turnover
Tables need cleaning between customers.

| ID | Requirement |
|----|-------------|
| R4.8.1 | After customer is served and leaves, table becomes dirty |
| R4.8.2 | Tap a dirty table to clean it |
| R4.8.3 | Cleaned table becomes available; triggers next customer arrival (3-5s delay) |
| R4.8.4 | Cannot take orders at or seat customers at a dirty table |

### R4.9 Service Completion
End the service day.

| ID | Requirement |
|----|-------------|
| R4.9.1 | "Close Service" button is always visible and interactive |
| R4.9.2 | When all customers are served and all tables are clean, info text prompts to close service |
| R4.9.3 | Transitions to Accounting scene |
| R4.9.4 | Game state saved on transition |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-4.1 | Enter Serve scene with Kimchi and Rice Tea on menu | 4 tables shown; customers begin arriving and auto-seating after ~500ms |
| TC-4.2 | Wait for customer to seat, tap their table | Order taken; table shows dish name; ingredients deducted from inventory |
| TC-4.3 | Tap ordered table | Cooking starts in kitchen station; table shows "Cooking..." |
| TC-4.4 | Tap another ordered table while kitchen is busy | "Kitchen is busy" message shown; no cooking starts |
| TC-4.5 | Complete cooking (chop: 5 taps), tap table | Customer served; revenue added; table becomes dirty |
| TC-4.6 | Complete a Boil step (hold interaction zone for 3s) | Progress bar fills during hold; step completes when full |
| TC-4.7 | Release during Boil step before complete | Progress pauses; resumes on next hold |
| TC-4.8 | Tap dirty table | Table cleaned; new customer arrives after 3-5s |
| TC-4.9 | Serve all customers, clean all tables | Info text: "All customers served! Close service to see results." |
| TC-4.10 | Click "Close Service" mid-service | Transitions to Accounting with partial results |
| TC-4.11 | Click "Close Service" after all served | Transitions to Accounting; state saved |
| TC-4.12 | Ingredients run out before next customer spawns | No more customers arrive; service can be closed |
| TC-4.13 | Customer seated, then tap table when no ingredients can fulfill any order | Customer leaves; table marked dirty; info text shows "No ingredients left!" |
| TC-4.14 | Check wallet after serving Kimchi ($8) | Wallet += $8 |

---

## R5: Accounting Phase

### R5.1 Earnings Summary
Display end-of-day financial breakdown.

| ID | Requirement |
|----|-------------|
| R5.1.1 | Display number of customers served |
| R5.1.2 | Display total revenue (sum of dish prices) |
| R5.1.3 | Display total earnings (equals revenue) |
| R5.1.4 | Display current wallet balance |

### R5.2 Day Advancement
Proceed to next day.

| ID | Requirement |
|----|-------------|
| R5.2.1 | "Next Day" button increments day counter by 1 |
| R5.2.2 | Day advancement resets: menu, customers, dayResults |
| R5.2.3 | Day advancement advances all planted crop growth by 1 day |
| R5.2.4 | Day advancement resets wateredToday on all plots |
| R5.2.5 | Wallet balance carries over to next day |
| R5.2.6 | Inventory carries over to next day |
| R5.2.7 | Farm plot state carries over (crops remain planted) |
| R5.2.8 | Transitions to Farm scene |
| R5.2.9 | Game state saved on transition |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-5.1 | Complete a day serving 5 customers | Accounting shows: 5 customers, correct revenue sum |
| TC-5.2 | Verify total earnings | Total earnings = revenue |
| TC-5.3 | Verify wallet | Wallet = previous balance + today's total earnings |
| TC-5.4 | Click "Next Day" | Day increments; transitions to Farm scene |
| TC-5.5 | Check farm after "Next Day" with growing crops | Crops advanced 1 growth day; watered flags reset |
| TC-5.6 | Check menu after "Next Day" | Menu is empty; no dishes selected |
| TC-5.7 | Check inventory after "Next Day" | Same as end of previous day (unchanged) |

---

## R6: Persistence

### R6.1 Save System
Game state persists via localStorage.

| ID | Requirement |
|----|-------------|
| R6.1.1 | Save key is `mokja_save` |
| R6.1.2 | Save format is JSON serialization of GameStateData |
| R6.1.3 | Auto-save on every scene transition (Farm→Menu, Menu→Serve, Serve→Accounting) |
| R6.1.4 | Load restores full game state including day, wallet, farm, inventory |
| R6.1.5 | `hasSave()` correctly detects presence of save data |
| R6.1.6 | `deleteSave()` removes save and invalidates `hasSave()` |
| R6.1.7 | lastPlayedTimestamp updated on each save for offline growth calculation |
| R6.1.8 | State migration handles old save formats (removes tips, simplifies menu items, resets customers) |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-6.1 | Play through Farm→Menu transition, check localStorage | `mokja_save` key exists with valid JSON |
| TC-6.2 | Save game, refresh browser, click Continue | Game restored to exact state (day, wallet, inventory, farm) |
| TC-6.3 | Delete save, check localStorage | `mokja_save` key removed |
| TC-6.4 | Delete save, refresh, check title screen | No "Continue" or "Delete Save" buttons shown |
| TC-6.5 | Play for 2 days, save, load | Day counter, wallet, and all state restored correctly |
| TC-6.6 | Load a save from old format (with tips/servingsPlanned) | State migrated cleanly; game loads without errors |

---

## R7: Economy & Balance

### R7.1 Wallet
Financial tracking across the game.

| ID | Requirement |
|----|-------------|
| R7.1.1 | Wallet starts at $0 for new game |
| R7.1.2 | Wallet increases by dish revenue on each customer served |
| R7.1.3 | Wallet persists across days |
| R7.1.4 | Wallet is never deducted (no expenses in MVP) |

### R7.2 Crop Yields

| ID | Crop | Base Yield | Watered Yield |
|----|------|-----------|---------------|
| R7.2.1 | Napa Cabbage | 2 | 4 |
| R7.2.2 | Pepper | 2 | 4 |
| R7.2.3 | Rice | 3 | 6 |

### R7.3 Recipe Prices

| ID | Recipe | Price/Serving |
|----|--------|---------------|
| R7.3.1 | Kimchi | $8 |
| R7.3.2 | Kimchi Stew | $12 |
| R7.3.3 | Kimchi Fried Rice | $10 |
| R7.3.4 | Roasted Rice Tea | $5 |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-7.1 | New game, check wallet | Wallet = $0 |
| TC-7.2 | Serve 1 Kimchi | Wallet += $8 |
| TC-7.3 | Serve 1 Kimchi Stew | Wallet += $12 |
| TC-7.4 | Harvest unwatered cabbage | Inventory += 2 cabbage |
| TC-7.5 | Harvest watered cabbage | Inventory += 4 cabbage |
| TC-7.6 | Play 3 full days, check wallet | Wallet = cumulative sum of all days' earnings |

---

## R8: Time System

### R8.1 Real-Time Growth
Crops grow based on device clock.

| ID | Requirement |
|----|-------------|
| R8.1.1 | Growth uses device system clock (Date.now()) |
| R8.1.2 | 1 growth day = 24 real hours (86,400,000 ms) |
| R8.1.3 | Offline growth calculated as: floor((now - lastPlayedTimestamp) / MS_PER_DAY) |
| R8.1.4 | Offline growth applied to all planted crops on Farm scene load |
| R8.1.5 | Day advancement via Accounting also advances crop growth by 1 |

### R8.2 Dev Tools
Development shortcuts for testing.

| ID | Requirement |
|----|-------------|
| R8.2.1 | DEV button visible in Farm scene (bottom-right) |
| R8.2.2 | DEV button advances all crops by 1 growth day |
| R8.2.3 | Crops meeting growth threshold become ready immediately |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-8.1 | Plant crop, use DEV skip | Crop gains 1 growth day; becomes ready (growthDays=1, threshold=1) |
| TC-8.2 | Plant crop, set device clock forward 24h, reload | Crop shows as ready on Farm scene load |
| TC-8.3 | Plant crop, play through full day cycle (Accounting→Next Day) | Crop gains 1 growth day from day advancement |

---

## R9: UI & Visual Design

### R9.1 Layout
Game canvas and scaling.

| ID | Requirement |
|----|-------------|
| R9.1.1 | Game canvas is 400x600 pixels |
| R9.1.2 | Scale mode: FIT with CENTER_BOTH |
| R9.1.3 | Default background color: #F5E6D0 (warm cream) |
| R9.1.4 | Renderer: AUTO (WebGL with Canvas fallback) |

### R9.2 Scene Themes
Nature-inspired color palette: warm browns, soft greens, cream/parchment.

| ID | Scene | Background Color |
|----|-------|-----------------|
| R9.2.1 | Farm | #2d5a27 (dark green) |
| R9.2.2 | Menu | #F5E6D0 (warm cream) |
| R9.2.3 | Serve | #3D2E1F (dark wood) |
| R9.2.4 | Accounting | #F5E6D0 (warm cream) |
| R9.2.5 | Title | #1a1a2e (dark navy) |

### R9.3 Visual Feedback

| ID | Requirement |
|----|-------------|
| R9.3.1 | Active mode button highlighted with distinct color |
| R9.3.2 | Selected menu dish highlighted with green checkbox and border |
| R9.3.3 | Farm plots change color based on crop state |
| R9.3.4 | Progress bars fill during cooking interactions in kitchen station |
| R9.3.5 | Table color changes for empty/seated/ordered/cooking/ready/dirty states |
| R9.3.6 | Kitchen station transitions between idle and active states |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-9.1 | Load game on mobile browser | Canvas scales to fit screen, centered |
| TC-9.2 | Switch between farm modes | Active mode button color changes; previous deactivates |
| TC-9.3 | Toggle a dish on the menu | Dish row highlights with green checkbox and border |
| TC-9.4 | Take order at a table | Table color changes from seated to ordered, showing dish name |
| TC-9.5 | Start cooking an order | Kitchen station activates; table shows "Cooking..." |
| TC-9.6 | Serve and vacate a table | Table color changes to dirty |
| TC-9.7 | Clean a dirty table | Table color returns to empty state |

---

## Appendix A: Full Day Walkthrough Test

**TC-E2E-1: Complete day 1 from new game**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "New Game" | Day 1, wallet $0, inventory: 6C 4P 6R |
| 2 | Farm: Plant 3 cabbage, 2 pepper in plots | Inventory unchanged (6C 4P 6R); 5 plots occupied |
| 3 | Farm: Click DEV skip | All 5 crops become ready |
| 4 | Farm: Harvest all 5 (unwatered) | +6C +4P; inventory: 12C 8P 6R |
| 5 | Farm: Click "Set Menu" | Transition to Menu; save written |
| 6 | Menu: Toggle on Kimchi and Roasted Rice Tea | Both rows highlighted; inventory unchanged |
| 7 | Menu: Click "Open Restaurant" | Menu saved; transitions to Serve scene |
| 8 | Serve: Customers arrive and auto-seat at tables | Tables show "Order?" for seated customers |
| 9 | Serve: Tap a table → take order | Order taken; dish name shown; ingredients deducted |
| 10 | Serve: Tap table again → cooking starts | Kitchen station activates with prep steps |
| 11 | Serve: Complete cooking (tap/hold per step type) | Cooking finishes; table shows "Serve!" |
| 12 | Serve: Tap table → serve dish | Revenue added; table becomes dirty |
| 13 | Serve: Tap dirty table → clean | Table cleaned; next customer arrives |
| 14 | Serve: Repeat until all customers served | All served; "Close Service" prompt shown |
| 15 | Serve: Click "Close Service" | Transition to Accounting |
| 16 | Accounting: Verify totals | Revenue displayed; wallet updated |
| 17 | Accounting: Click "Next Day" | Day 2; menu/customers reset; crops advanced |

---

## Appendix B: Edge Cases

| TC | Scenario | Expected |
|----|----------|----------|
| TC-EDGE-1 | Player has 0 inventory, enters Menu | All recipes shown but no ingredients to fulfill any orders during service |
| TC-EDGE-2 | All tables occupied, more customers waiting | New customers wait; arrive when a table becomes clean |
| TC-EDGE-3 | All 4 tables dirty at once | Must clean at least 1 before next customer can arrive |
| TC-EDGE-4 | Kitchen busy, player taps another ordered table | "Kitchen is busy" message; must finish current dish first |
| TC-EDGE-5 | Player only selects 1 recipe on menu | All customers order that single dish |
| TC-EDGE-6 | Player clears localStorage during gameplay | Next load shows no save; must start new game |
| TC-EDGE-7 | Player plants all 16 plots with same crop | All 16 harvest same crop type; potential recipe limitation |
| TC-EDGE-8 | Multiple days without harvesting | Crops stay ready indefinitely; do not expire |
| TC-EDGE-9 | Ingredients run out mid-service (no seated customers) | No more customers spawn; player serves remaining orders and closes service |
| TC-EDGE-9a | Ingredients run out after customer is seated but before ordering | Customer leaves disappointed (no revenue); table becomes dirty; no more customers spawn |
| TC-EDGE-10 | Player closes service before serving any customers | Accounting shows 0 customers, $0 revenue |
| TC-EDGE-11 | Old save format loaded (with tips/servingsPlanned) | State migration runs; game loads without errors |
