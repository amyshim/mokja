# Mokja - Requirements & Test Cases

## Overview

Mokja is a browser-based farming and restaurant management game with Korean cuisine themes. Players run a farm-to-table restaurant in Southern California, cycling through four daily phases: Farm, Menu, Serve, and Accounting.

**Target:** Women ages 25-45 seeking comfort gaming
**Platform:** Browser (768x1024px, mobile-optimized)
**Engine:** Phaser 3 + TypeScript + Vite

---

## R1: Game Initialization & Title Screen

### R1.1 Boot Scene
The game loads and generates all placeholder assets before displaying the title screen.

| ID | Requirement |
|----|-------------|
| R1.1.1 | Boot scene generates colored rectangle sprites for the barley crop (seed, growing, ready) |
| R1.1.2 | Boot scene generates detailed 48x48px tile textures (checkerboard floor, brick walls, wood grain tables, stone paths, station tiles) |
| R1.1.3 | Boot scene generates 42x48px player sprites with hair, face, shirt, and pants detail (4 directions) |
| R1.1.4 | Boot scene displays a loading progress bar during asset generation |
| R1.1.5 | Boot scene auto-transitions to Title scene when loading completes |

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
| R1.2.7 | New game initializes: day=1, wallet=$0, empty farm (24 plots), starter inventory |
| R1.2.8 | Starter inventory grants 5 barley |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-1.1 | Launch game with no localStorage save | Title shows "New Game" only; no "Continue" or "Delete Save" |
| TC-1.2 | Launch game with existing save | Title shows "New Game", "Continue", and "Delete Save" |
| TC-1.3 | Click "New Game" | State resets to day 1, wallet $0, 5 barley; transitions to Farm |
| TC-1.4 | Click "Continue" with valid save | Game state restored from save; transitions to Farm |
| TC-1.5 | Click "Delete Save" | Save removed from localStorage; "Continue" and "Delete Save" disappear |
| TC-1.6 | Click "New Game" when a save already exists | Previous save overwritten with fresh state |

---

## R2: Farming Phase

### R2.1 Farm Grid
A 4x6 grid of interactive farm plots (24 total), navigated by grid-based player movement.

| ID | Requirement |
|----|-------------|
| R2.1.1 | Display 24 plots in a 4x6 grid (4 rows of 6 plots with grass aisles) |
| R2.1.2 | Each plot visually indicates its state: empty, growing, watered, ready |
| R2.1.3 | Display current barley inventory count |
| R2.1.4 | Display current day number |
| R2.1.5 | Player navigates via arrow keys / WASD on a 16x16 tile grid |
| R2.1.6 | Player can only interact with the plot they are facing (Space/Enter) |

### R2.2 Interaction Modes
Player selects a mode (Plant, Water, Harvest) via 1/2/3 keys.

| ID | Requirement |
|----|-------------|
| R2.2.1 | Three modes: Plant (1), Water (2), Harvest (3) |
| R2.2.2 | Active mode is visually highlighted in the HUD |
| R2.2.3 | Only one mode active at a time |

### R2.3 Planting
Player plants barley into empty plots. Only one crop type (barley).

| ID | Requirement |
|----|-------------|
| R2.3.1 | In Plant mode, pressing Space on a faced empty plot plants barley |
| R2.3.2 | Planting does not consume inventory; seeds are unlimited |
| R2.3.3 | Cannot plant on an occupied plot |
| R2.3.4 | Planted crop starts with growthDays=0, wateredToday=false, ready=false |
| R2.3.5 | No crop selector UI — barley is always planted |

### R2.4 Watering
Player waters growing crops for a yield bonus.

| ID | Requirement |
|----|-------------|
| R2.4.1 | In Water mode, pressing Space on a growing (non-ready) plot marks it as watered |
| R2.4.2 | Each crop can only be watered once per day |
| R2.4.3 | Watering an already-watered crop has no effect |
| R2.4.4 | Cannot water an empty plot |
| R2.4.5 | Cannot water a ready-to-harvest crop |
| R2.4.6 | Watered plots show distinct visual indicator (darker soil) |

### R2.5 Harvesting
Player collects mature crops.

| ID | Requirement |
|----|-------------|
| R2.5.1 | In Harvest mode, pressing Space on a ready crop harvests it |
| R2.5.2 | Unwatered harvest yields baseYield (2 barley) |
| R2.5.3 | Watered harvest yields wateredYield (4 barley) |
| R2.5.4 | Harvested crop is added to inventory |
| R2.5.5 | Plot becomes empty after harvest |
| R2.5.6 | Cannot harvest a plot that is not ready |

### R2.6 Crop Growth
Crops grow over real time using device clock.

| ID | Requirement |
|----|-------------|
| R2.6.1 | Barley has a growth time of 1 real day (24 hours) |
| R2.6.2 | Growth is calculated from plantedAt timestamp |
| R2.6.3 | When growth time elapses, plot.ready becomes true |
| R2.6.4 | Offline growth: returning after absence processes elapsed real days |
| R2.6.5 | Dev skip button (0 key) advances crop growth by 1 day instantly |

### R2.7 Scene Transition
Player walks to EXIT tile to proceed to Menu phase.

| ID | Requirement |
|----|-------------|
| R2.7.1 | Walking onto the EXIT tile transitions to Menu scene |
| R2.7.2 | Game state is saved to localStorage on transition |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-2.1 | Select Plant mode, face empty plot, press Space | Barley planted; inventory unchanged (seeds are free); plot shows growing state |
| TC-2.2 | Try to plant on an occupied plot | Nothing happens; existing crop unchanged |
| TC-2.3 | Select Water mode, face a growing crop, press Space | Plot marked as watered; visual changes |
| TC-2.4 | Water an already-watered crop | No change; still shows watered once |
| TC-2.5 | Try to water an empty plot | Nothing happens |
| TC-2.6 | Harvest a ready, unwatered barley | Yields 2 barley; plot clears to empty |
| TC-2.7 | Harvest a ready, watered barley | Yields 4 barley; plot clears to empty |
| TC-2.8 | Try to harvest a growing (not ready) crop | Nothing happens |
| TC-2.9 | Plant a crop, close browser, return after 24+ hours | Crop shows as ready on return |
| TC-2.10 | Press 0 key with growing crop | Crop advances 1 growth day; becomes ready if growth met |
| TC-2.11 | Walk onto EXIT tile | Transitions to Menu scene; save written to localStorage |
| TC-2.12 | Start new game, check farm | 24 empty plots; starter inventory: 5 barley |

---

## R3: Menu Setting Phase

### R3.1 Recipe Display
Show available recipes as toggleable cards.

| ID | Requirement |
|----|-------------|
| R3.1.1 | Display unlocked recipes only (Barley Tea at start; Barley Rice after milestone) |
| R3.1.2 | Recipe card shows: name, ingredient list with quantities, price per serving |
| R3.1.3 | Recipe card shows prep steps summary |
| R3.1.4 | Display current inventory at top of screen |

### R3.2 Recipe Ingredients

| ID | Recipe | Ingredients per Serving | Price |
|----|--------|------------------------|-------|
| R3.2.1 | Barley Tea | 1 barley | $2 |
| R3.2.2 | Barley Rice (after unlock) | 1 barley + 1 rice | $3 |

### R3.3 Dish Selection
Player toggles which dishes are on today's menu.

| ID | Requirement |
|----|-------------|
| R3.3.1 | Recipe card is toggleable (on/off) |
| R3.3.2 | Selected recipe is visually highlighted (green checkbox, highlighted border) |
| R3.3.3 | Toggling a recipe on/off does not deduct or check ingredients |
| R3.3.4 | Menu determines which dishes customers can order during service |

### R3.4 Menu Commitment
Player confirms menu and proceeds to serving.

| ID | Requirement |
|----|-------------|
| R3.4.1 | "Open Restaurant" button saves the selected dishes as today's menu |
| R3.4.2 | Cannot confirm if no dishes are selected |
| R3.4.3 | No ingredients are deducted at menu confirmation |
| R3.4.4 | Transitions to Serve scene after commit |
| R3.4.5 | Game state saved on transition |
| R3.4.6 | "<< Farm" button returns to Farm scene |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-3.1 | View Menu scene with 5 barley | Barley Tea recipe shown with ingredients and price ($2) |
| TC-3.2 | Tap Barley Tea card | Card highlighted with green checkbox; border turns green |
| TC-3.3 | Tap Barley Tea card again | Deselected; checkbox and border return to default |
| TC-3.4 | Select Barley Tea, check inventory | Inventory unchanged (no deduction at menu time) |
| TC-3.5 | Click "Open Restaurant" with Barley Tea selected | Transitions to Serve scene; menu saved |
| TC-3.6 | Click "Open Restaurant" with 0 dishes selected | Error message: "Select at least 1 dish!" |
| TC-3.7 | Click "<< Farm" back button | Returns to Farm scene without saving menu |

---

## R4: Serving Phase

### R4.1 Restaurant Layout
Display 3 tables and an Overcooked-style kitchen with stations.

| ID | Requirement |
|----|-------------|
| R4.1.1 | Display 3 tables, each with 2 seats |
| R4.1.2 | Tables positioned in row 1 of the 16x16 grid, evenly spaced |
| R4.1.3 | Floating order indicators centered above each table show status: large "!" when seated, distinctive food icons when ordered (cup shape for tea, bowl shape for rice — 12px, matching menu card colors), dirty indicators on table surface when dirty |
| R4.1.4 | Kitchen area in rows 8-13 with stations: barley station, rice station, recipe book, oven, 1 tea kettle, 1 rice cooker, cup storage, bowl storage, sink, trash bin, 4 kitchen tables. Recipe book at bottom-left (col 0, row 13) near exit. Rice station, rice cooker, bowl station, and sink appear after rice unlock. Kitchen layout row 9: BARLEY, RICE, floor, OVEN, floor, KETTLE, floor, COOKER, floor, floor, CUPS, BOWL, floor, SINK, floor, TRASH. Before rice unlock, locked station tiles (rice bin, rice cooker, bowl station, sink) are walkable floor — no invisible walls. |
| R4.1.5 | Counter separates dining area (rows 0-6) from kitchen (rows 8-14) with walkable gap |
| R4.1.6 | Display earnings tracker (revenue running total) |
| R4.1.7 | HUD shows: held item, kitchen status (oven/kettle/cooker state), inventory counts, context prompts |
| R4.1.8 | Station labels displayed on map tiles (BARLEY, RECIPE, OVEN, KETTLE, CUPS, TRASH from start; RICE, COOKER, BOWL, SINK after rice unlock) |

### R4.2 Customer Generation
Customers arrive dynamically, gated by ingredient availability.

| ID | Requirement |
|----|-------------|
| R4.2.1 | New customers only spawn when the restaurant has enough barley to fulfill at least one menu item |
| R4.2.2 | Customers arrive dynamically: first after player closes the initial recipe book, subsequent 3-5s after a table becomes available |
| R4.2.3 | Each customer has a unique ID and a random group size (40% solo, 60% pair — max 2 for 2-seat tables) |

### R4.3 Customer Avatars
Each customer group member is represented as a distinct on-screen sprite.

| ID | Requirement |
|----|-------------|
| R4.3.1 | Each group member is rendered as an individual avatar sprite |
| R4.3.2 | Avatars (36x42px) have randomized appearances: skin tone (5 variants), hair color (6 variants — all contrasting with floor tile color), shirt color (10 variants), with pants |
| R4.3.3 | Avatars have 4 directional textures (up/down/left/right) with visible eyes, hair, shirt, and pants |
| R4.3.4 | Avatar textures are generated programmatically at spawn time |
| R4.3.5 | Avatar textures are cleaned up when the customer leaves and on scene shutdown |

### R4.4 Customer Arrival
Customers walk in from the entrance and seat themselves.

| ID | Requirement |
|----|-------------|
| R4.4.1 | A new customer auto-seats at an empty clean table 3-5 seconds after one becomes available |
| R4.4.2 | First customer arrives after ~500ms at service start |
| R4.4.3 | Customers seat themselves at the first available table (no player action required for seating) |
| R4.4.4 | Customer status is 'walking' during walk-in; transitions to 'seated' only after all group members arrive |
| R4.4.4a | Table marked as occupied when customer is assigned |
| R4.4.4b | No indicators or interactions possible while customer status is 'walking' |
| R4.4.5 | No more customers arrive when no menu item can be fulfilled with remaining ingredients |
| R4.4.6 | Customer avatars appear at the restaurant entrance (exit tile) and walk along a BFS-computed path to their assigned seat |
| R4.4.7 | Group members walk in with staggered timing (300ms between each) |
| R4.4.8 | Avatars face their movement direction while walking |
| R4.4.9 | Each table has 2 predefined seat positions on walkable tiles below the table |
| R4.4.10 | When seated, avatars face toward the table (up) |

### R4.5 Order & Serve Flow
Player takes orders and serves prepared food. Cooking is decoupled from ordering.

| ID | Requirement |
|----|-------------|
| R4.5.1 | **Take order:** Press Space at a seated customer's table to take the entire group's order in one interaction |
| R4.5.2 | All group members order the same dish (Barley Tea). servingsNeeded = groupSize (1 or 2) |
| R4.5.3 | Taking an order does NOT deduct ingredients (ingredients deducted at barley station) |
| R4.5.4 | If no ingredients are available when taking order, the customer leaves (no revenue) and avatars walk out |
| R4.5.5 | Customer status changes from "seated" to "ordered"; floating indicator shows food icons (one per serving needed) |
| R4.5.6 | **Serve:** Press Space at an ordered customer's table while holding the correct item (barley_tea single or on tray; barley_rice single or on bowl stack) to deliver one serving |
| R4.5.7 | Revenue ($2) added to wallet and dayResults per serving delivered |
| R4.5.8 | Each serve increments servingsDelivered. When servingsDelivered >= servingsNeeded, status becomes "served"; avatars walk out; table marked dirty |
| R4.5.9 | If player interacts with ordered table without holding barley_tea, message says "Need Barley Tea to serve!" |
| R4.5.10 | Multiple orders can be in progress simultaneously (no one-at-a-time constraint) |
| R4.5.11 | Floating indicator updates to show remaining servings as food icons decrease with each delivery |

### R4.6 Overcooked Kitchen — Player Carrying & Tray
Player carries items through the kitchen, with optional tray for multiple cups.

| ID | Requirement |
|----|-------------|
| R4.6.1 | Player can hold one item at a time: barley, washed_barley, roasted_barley, empty_cup, barley_tea, rice, washed_rice, bowl, barley_rice, or a stack (bowl_stack) |
| R4.6.2 | **Tray mechanic:** Picking up a second cup from cup storage while holding empty_cup or barley_tea upgrades to a tray |
| R4.6.3 | Tray holds up to 4 slots — any mix of empty cups and filled barley tea |
| R4.6.4 | Tray cups are filled one at a time at the hot kettle (no need to set tray down) |
| R4.6.5 | Serving one customer removes one filled cup from the tray |
| R4.6.6 | When tray is emptied (0 empty + 0 filled), hands become free |
| R4.6.7 | HUD displays what the player is holding, including tray contents (e.g., "Tray (3 tea, 1 empty)") and bowl stack contents (e.g., "Stack (2 rice, 1 empty)") |
| R4.6.8 | **Bowl stack mechanic:** Picking up a second bowl from bowl station while holding bowl or barley_rice upgrades to a bowl_stack |
| R4.6.9 | Bowl stack holds up to 4 slots — any mix of empty bowls and filled barley rice |
| R4.6.10 | Bowl stack bowls are filled one at a time at the rice cooker with barley rice (no need to set stack down) |
| R4.6.11 | Serving one customer removes one filled bowl from the stack |
| R4.6.12 | When bowl stack is emptied (0 empty + 0 filled), hands become free |
| R4.6.13 | Discard held items at the trash bin station (hold Space for 1 second) |
| R4.6.14 | Player cannot pick up non-cup/non-bowl items while hands are full (shows "Hands full!" message) |
| R4.6.15 | A held-item indicator is rendered above the player sprite (depth 12), following movement each frame |
| R4.6.16 | Single items display as a 6px colored circle (tan=barley, brown=roasted, white=cup, gold=tea) |
| R4.6.17 | Tray displays as a row of 6x6px squares — gold for filled cups, white for empty cups |
| R4.6.18 | Bowl stack displays as a row of 6x6px squares — brown for filled barley rice, gray for empty bowls |

### R4.7 Kitchen Stations — Barley Station

| ID | Requirement |
|----|-------------|
| R4.7.1 | Press Space at barley station with empty hands to pick up 1 barley |
| R4.7.2 | Picking up barley deducts 1 from inventory |
| R4.7.3 | Cannot pick up barley if inventory is 0 |

### R4.8 Kitchen Stations — Oven

| ID | Requirement |
|----|-------------|
| R4.8.1 | Press Space at empty oven while holding raw barley to place it — oven starts roasting (accepts barley, not washed_barley) |
| R4.8.2 | Oven roasts for 5 seconds. Player is free to walk away. |
| R4.8.3 | Visual indicator on oven shows roasting progress (progress bar) |
| R4.8.4 | After 5 seconds, oven shows "DONE" (green). Press Space with empty hands to pick up roasted_barley. |
| R4.8.5 | If not picked up within 10 seconds, barley burns — oven shows "BURN" (red) |
| R4.8.6 | Press Space on burned oven to discard and clear (oven returns to empty) |

### R4.9 Kitchen Stations — Tea Kettle

The kitchen has 1 tea kettle dedicated to making barley tea.

| ID | Requirement |
|----|-------------|
| R4.9.1 | 1 kettle tile in the kitchen with its own state |
| R4.9.2 | Kettle states: empty → has_ingredient → boiling → hot_with_tea |
| R4.9.3 | Press Space at empty kettle while holding roasted_barley to add barley (sets cups to 5) |
| R4.9.4 | Press Space at kettle with ingredient to start boiling |
| R4.9.5 | Hold Space while facing boiling kettle for 3 seconds to complete cooking |
| R4.9.6 | Boil progress persists if player releases Space (can resume) |
| R4.9.7 | Kettle indicator shows: "BOIL?" when has ingredient, percentage when boiling, "x5" (cups remaining) when hot with tea |
| R4.9.8 | Press Space at hot kettle while holding empty_cup → player receives barley_tea. If holding tray with empty cups → one empty becomes filled. Cups remaining decrements. |
| R4.9.9 | When cups remaining reaches 0, kettle returns to empty state |
| R4.9.10 | 1 roasted barley = 5 cups of barley tea |

### R4.9x Kitchen Stations — Rice Cooker (unlocked with rice)

The kitchen has 1 rice cooker dedicated to making barley rice.

| ID | Requirement |
|----|-------------|
| R4.9x.1 | 1 rice cooker tile in the kitchen, appears after rice milestone unlock |
| R4.9x.2 | Cooker states: empty → has_one_ingredient → has_both_ingredients → cooking → hot_with_rice |
| R4.9x.3 | Press Space at empty or has_one_ingredient cooker while holding washed_rice or washed_barley to add ingredient. Accepts ingredients in either order. |
| R4.9x.4 | Once both washed_rice and washed_barley are added, press Space to start cooking |
| R4.9x.5 | Hold Space while facing cooking cooker for 3 seconds to complete cooking |
| R4.9x.6 | Cook progress persists if player releases Space (can resume) |
| R4.9x.7 | Cooker indicator shows: ingredient status when partially loaded, "COOK?" when both ingredients added, percentage when cooking, "x5" (servings remaining) when hot with rice |
| R4.9x.8 | Player must hold a bowl (single or on stack) to pick up barley rice from the cooker (one serving per bowl) |
| R4.9x.8a | Press Space at cooker with barley rice while holding bowl_stack with empty bowls → one empty becomes filled. Servings remaining decrements. |
| R4.9x.9 | When all rice servings are dispensed, cooker returns to empty state |
| R4.9x.10 | 1 washed rice + 1 washed barley = 5 servings of barley rice |

### R4.9a Kitchen Stations — Sink (unlocked with rice)

| ID | Requirement |
|----|-------------|
| R4.9a.1 | Sink appears in the kitchen after rice milestone unlock (not available from start) |
| R4.9a.2 | Press Space at sink while holding raw barley to begin washing → produces washed_barley |
| R4.9a.2a | Press Space at sink while holding raw rice to begin washing → produces washed_rice |
| R4.9a.3 | Hold Space for 3 seconds to wash the ingredient |
| R4.9a.4 | Wash progress persists if player releases Space (can resume) |
| R4.9a.5 | Sink indicator shows wash progress percentage |
| R4.9a.6 | Both rice and barley must be washed before cooking barley rice. Washing is not required for barley tea. |

### R4.9b Kitchen Stations — Rice Bin (unlocked with rice)

| ID | Requirement |
|----|-------------|
| R4.9b.1 | Rice bin appears in kitchen after rice milestone unlock |
| R4.9b.2 | Press Space at rice bin with empty hands to pick up 1 rice |
| R4.9b.3 | Picking up rice deducts 1 from rice inventory |
| R4.9b.4 | Cannot pick up rice if rice inventory is 0 |

### R4.9c Kitchen Stations — Bowl Station (unlocked with rice)

| ID | Requirement |
|----|-------------|
| R4.9c.1 | Bowl station appears in kitchen after rice milestone unlock |
| R4.9c.2 | Press Space at bowl station with empty hands to pick up a single bowl |
| R4.9c.3 | Press Space while holding bowl or barley_rice → upgrades to bowl_stack and adds 1 empty bowl |
| R4.9c.4 | Press Space while holding bowl_stack with total < 4 → adds 1 empty bowl to stack |
| R4.9c.5 | Press Space while holding bowl_stack with total = 4 → "Stack full!" message |
| R4.9c.6 | Bowls are unlimited |
| R4.9c.7 | Bowls are required to plate barley rice from the rice cooker |

### R4.9d Kitchen Stations — Trash Bin

| ID | Requirement |
|----|-------------|
| R4.9d.1 | Trash bin is always visible in the kitchen |
| R4.9d.2 | Hold Space for 1 second while facing the trash bin to discard the currently held item |
| R4.9d.3 | Trash bin shows a progress indicator (percentage) while holding Space |
| R4.9d.4 | If player releases Space before 1 second, discard is cancelled and progress resets |
| R4.9d.5 | Cannot discard if hands are empty |

### R4.9e Kitchen Stations — Recipe Book

| ID | Requirement |
|----|-------------|
| R4.9e.1 | Recipe book station is at bottom-left of kitchen (col 0, row 13), available from the start |
| R4.9e.2 | Press Space at the recipe book station to open a modal showing step-by-step recipe instructions |
| R4.9e.3 | Modal can be closed by pressing Space or Escape |
| R4.9e.4 | Modal displays recipe flows for all unlocked recipes |
| R4.9e.5 | Each recipe title is accompanied by the same food icon shown in customer speech bubbles (tea cup for barley tea, bowl for barley rice) |
| R4.9e.6 | Recipe book opens automatically when ServeScene starts; customers do not arrive until player closes it |
| R4.9e.7 | Modal includes hint text: "To view this screen again, come back to the RECIPE station and press SPACE" |
| R4.9e.8 | Player spawns at (1, 13) next to the recipe book station when ServeScene starts |

### R4.10 Kitchen Stations — Cup Storage

| ID | Requirement |
|----|-------------|
| R4.10.1 | Press Space at cup storage with empty hands to pick up a single empty_cup |
| R4.10.2 | Press Space while holding empty_cup or barley_tea → upgrades to tray and adds 1 empty cup |
| R4.10.3 | Press Space while holding tray with total < 4 → adds 1 empty cup to tray |
| R4.10.4 | Press Space while holding tray with total = 4 → "Tray full!" message |
| R4.10.5 | Cups are unlimited |

### R4.11 Kitchen Stations — Kitchen Tables

| ID | Requirement |
|----|-------------|
| R4.11.1 | 4 kitchen table surfaces for staging items |
| R4.11.2 | Press Space at empty kitchen table while holding an item to place it (tray and bowl stack state preserved) |
| R4.11.3 | Press Space at kitchen table with an item while hands are empty to pick it up (tray and bowl stack state restored) |
| R4.11.4 | Kitchen tables show a colored overlay and short label for the placed item (trays show filled/empty count, bowl stacks show "3R+1B" format) |
| R4.11.5 | Cannot place on an occupied table or pick up from an empty table |

### R4.12 Customer Departure & Table Turnover

| ID | Requirement |
|----|-------------|
| R4.12.1 | After being served, customer avatars walk from their seats back to the entrance and are destroyed |
| R4.12.2 | Walk-out uses staggered timing (200ms between group members) |
| R4.12.3 | If walk-out triggered while avatars are walking in, in-progress tweens are killed and walk-out starts from current position |
| R4.12.4 | After customer leaves, table becomes dirty |
| R4.12.5 | Press Space at a dirty table to clean it |
| R4.12.6 | Cleaned table becomes available; triggers next customer arrival (3-5s delay) |
| R4.12.7 | Cannot take orders at or seat customers at a dirty table |

### R4.13 Depth & Render Order

| ID | Requirement |
|----|-------------|
| R4.13.1 | Customer avatar sprites render above floor tiles (depth 5) |
| R4.13.2 | Player sprite renders above customer avatars (depth 11) |
| R4.13.3 | Held-item indicator renders above player sprite (depth 12) |
| R4.13.4 | Facing highlight renders below the player (depth 10) |
| R4.13.5 | Table indicators render above all sprites (depth 20+) |
| R4.13.6 | Station overlays (oven progress, kettle/cooker label, kitchen table items) at depth 15-16 |

### R4.14 Service Completion

| ID | Requirement |
|----|-------------|
| R4.14.1 | EXIT tile is always accessible — walking onto it closes service |
| R4.14.2 | When all customers are served, tables clean, and no ingredients left, prompt says "All done! Walk to EXIT to close." |
| R4.14.3 | Transitions to Accounting scene |
| R4.14.4 | Game state saved on transition |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-4.1 | Enter Serve scene with Barley Tea on menu, 5 barley | Recipe book opens automatically; player at (1, 13) near recipe station; customers arrive after closing recipe book |
| TC-4.2 | Observe first customer group spawn | Individual avatars appear at entrance and walk to table seats |
| TC-4.3 | Walk to a seated customer's table, press Space | Group order taken; floating indicator shows food icons (1 or 2 per group size); inventory unchanged |
| TC-4.4 | Walk to barley station, press Space | Pick up barley; inventory decreases by 1 |
| TC-4.5 | Walk to oven, press Space (holding barley) | Barley placed in oven; progress bar starts |
| TC-4.6 | Wait 5s, walk to oven, press Space (empty hands) | Pick up roasted barley; oven clears |
| TC-4.7 | Wait >10s at oven without picking up | Oven shows "BURN"; press Space to discard |
| TC-4.8 | Walk to kettle, press Space (holding roasted barley) | Barley added to kettle; kettle shows "BOIL?" |
| TC-4.9 | Press Space at kettle (empty hands), hold Space for 3s | Kettle boils; shows "x5" |
| TC-4.10 | Walk to cup storage, press Space | Pick up empty cup |
| TC-4.11 | Walk to hot kettle, press Space (holding empty cup) | Receive barley tea; kettle shows "x4" |
| TC-4.12 | Walk to ordered table (group of 1), press Space (holding barley tea) | Served; +$2 revenue; customer leaves; table becomes dirty |
| TC-4.12a | Walk to ordered table (group of 2), press Space once (holding tea) | 1 serving delivered (+$2); indicator shows 1 remaining; customer stays |
| TC-4.12b | Press Space again at same table (holding tea) | 2nd serving delivered (+$2); customer leaves; table dirty |
| TC-4.13 | Press Space at dirty table | Table cleaned; dirty indicator removed; new customer arrives after 3-5s |
| TC-4.14 | Place barley tea on kitchen table, then pick it up | Item placed and retrieved correctly |
| TC-4.15 | Fill all 5 cups from one batch | After 5th cup, kettle returns to empty |
| TC-4.16 | Try to serve without holding barley tea | "Need Barley Tea to serve!" message |
| TC-4.17 | Face trash bin, hold Space for 1s while holding an item | Item discarded; hands empty |
| TC-4.22 | Pick up cup, then press Space at cup storage again | Upgrades to tray with 2 empty cups |
| TC-4.23 | Pick up 4 cups (press Space at cups 4 times) | Tray shows 4 empty cups; "Tray full!" on 5th press |
| TC-4.24 | Hold tray with 3 empty cups, press Space at hot kettle 3 times | 3 cups filled; tray shows 3 tea, 0 empty |
| TC-4.25 | Hold tray with 2 tea, serve 2 customers | Each serve removes 1 tea; tray empties after 2nd serve; hands free |
| TC-4.26 | Place tray (2 tea, 1 empty) on kitchen table, pick it up later | Tray state preserved and restored correctly |
| TC-4.27 | Hold single barley tea, press Space at cups | Upgrades to tray (1 tea, 1 empty) |
| TC-4.28 | Observe held-item indicator while holding barley | Colored circle appears above player |
| TC-4.29 | Observe held-item indicator while holding tray (2 tea, 1 empty) | Row of 3 squares above player: 2 gold, 1 white |
| TC-4.30 | Pick up bowl, then press Space at bowl station again | Upgrades to bowl stack with 2 empty bowls |
| TC-4.31 | Pick up 4 bowls (press Space at bowls 4 times) | Stack shows 4 empty bowls; "Stack full!" on 5th press |
| TC-4.32 | Hold stack with 3 empty bowls, press Space at rice cooker with barley rice 3 times | 3 bowls filled; stack shows 3 rice, 0 empty |
| TC-4.33 | Hold stack with 2 rice, serve 2 customers who ordered barley rice | Each serve removes 1 rice; stack empties after 2nd serve; hands free |
| TC-4.34 | Place bowl stack (2 rice, 1 empty) on kitchen table, pick it up later | Stack state preserved and restored correctly |
| TC-4.35 | Hold single barley rice, press Space at bowl station | Upgrades to stack (1 rice, 1 empty) |
| TC-4.36 | Observe held-item indicator while holding bowl stack (2 rice, 1 empty) | Row of 3 squares above player: 2 brown, 1 gray |
| TC-4.18 | Serve all customers, clean all tables | "All done! Walk to EXIT to close." |
| TC-4.19 | Walk to EXIT tile | Transitions to Accounting; state saved |
| TC-4.20 | Ingredients run out before next customer spawns | No more customers arrive |
| TC-4.21 | Customer seated but no ingredients when taking order | Customer leaves; table marked dirty |

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
| TC-5.1 | Complete a day serving 3 customers | Accounting shows: 3 customers, $6 revenue |
| TC-5.2 | Verify wallet | Wallet = previous balance + today's total earnings |
| TC-5.3 | Click "Next Day" | Day increments; transitions to Farm scene |
| TC-5.4 | Check farm after "Next Day" with growing crops | Crops advanced 1 growth day; watered flags reset |
| TC-5.5 | Check menu after "Next Day" | Menu is empty; no dishes selected |
| TC-5.6 | Check inventory after "Next Day" | Same as end of previous day (unchanged) |

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
| R6.1.8 | State migration handles old save formats |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-6.1 | Play through Farm→Menu transition, check localStorage | `mokja_save` key exists with valid JSON |
| TC-6.2 | Save game, refresh browser, click Continue | Game restored to exact state (day, wallet, inventory, farm) |
| TC-6.3 | Delete save, check localStorage | `mokja_save` key removed |
| TC-6.4 | Delete save, refresh, check title screen | No "Continue" or "Delete Save" buttons shown |
| TC-6.5 | Play for 2 days, save, load | Day counter, wallet, and all state restored correctly |

---

## R7: Economy & Balance

### R7.1 Wallet

| ID | Requirement |
|----|-------------|
| R7.1.1 | Wallet starts at $0 for new game |
| R7.1.2 | Wallet increases by recipe price per serving (Barley Tea $2, Barley Rice $3) |
| R7.1.3 | Wallet persists across days |
| R7.1.4 | Wallet is never deducted (no expenses in MVP) |

### R7.2 Recipe Ingredients

| ID | Recipe | Ingredients | Prep Steps |
|----|--------|-------------|------------|
| R7.2.1 | Barley Tea | 1 barley | Roast barley in oven (5s) → Boil at kettle (hold 3s) → Fill cup |
| R7.2.2 | Barley Rice | 1 rice + 1 barley | Wash rice at sink (hold 3s) + Wash barley at sink (hold 3s) → Add washed rice + washed barley to rice cooker (either order) → Cook (hold 3s) → Pick up with bowl (5 servings) |

### R7.3 Recipe Prices

| ID | Recipe | Price/Serving |
|----|--------|---------------|
| R7.3.1 | Barley Tea | $2 |
| R7.3.2 | Barley Rice (after unlock) | $3 |

### R7.4 Kitchen Ratios

| ID | Ratio | Value |
|----|-------|-------|
| R7.4.1 | Barley per pick-up from barley station | 1 (deducted from inventory) |
| R7.4.2 | Roasted barley per oven batch | 1 barley in → 1 roasted barley out |
| R7.4.3 | Cups of tea per roasted barley | 5 |
| R7.4.4 | Oven roast time | 5 seconds |
| R7.4.5 | Oven burn time | 10 seconds |
| R7.4.6 | Kettle boil time | 3 seconds (hold Space) |
| R7.4.7 | Rice per pick-up from rice bin | 1 (deducted from inventory) |
| R7.4.8 | Sink wash time | 3 seconds (hold Space) |
| R7.4.9 | Barley Rice per cook | 1 washed rice + 1 washed barley → 5 servings (requires bowl per serving) |
| R7.4.10 | Trash bin discard time | 1 second (hold Space) |
| R7.4.11 | Number of tea kettles | 1 |
| R7.4.11a | Number of rice cookers | 1 |
| R7.4.12 | Number of kitchen tables | 4 |

### R7.5 Milestones

| ID | Milestone | Trigger | Reward |
|----|-----------|---------|--------|
| R7.5.1 | Rice Unlock | Serve 10 barley teas (cumulative across days) | Congratulatory message, rice crop unlocked, +10 rice & +10 barley inventory, barley rice recipe unlocked, rice bin + rice cooker + bowl station + sink added to kitchen |

| ID | Requirement |
|----|-------------|
| R7.5.2 | Track total barley teas served in persistent game state (totalTeasServed) |
| R7.5.3 | Milestone check runs at end of each service day (accounting phase) |
| R7.5.4 | Congratulatory popup displayed when milestone first reached |
| R7.5.5 | Milestone rewards applied immediately (rice inventory added, crop/recipe/stations unlocked) |
| R7.5.6 | Milestones are one-time; once triggered they are not triggered again |

### R7.6 Crop Yields

| ID | Crop | Base Yield | Watered Yield |
|----|------|-----------|---------------|
| R7.6.1 | Barley | 2 | 4 |
| R7.6.2 | Rice | 2 | 4 |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-7.1 | New game, check wallet | Wallet = $0 |
| TC-7.2 | Serve 1 Barley Tea | Wallet += $2 |
| TC-7.3 | Harvest unwatered barley | Inventory += 2 barley |
| TC-7.4 | Harvest watered barley | Inventory += 4 barley |
| TC-7.5 | Pick up barley from barley station | Inventory -= 1 barley |
| TC-7.6 | Fill 5 cups from one kettle batch | 5 cups dispensed, kettle empties |
| TC-7.7 | Play 3 full days, check wallet | Wallet = cumulative sum of all days' earnings |
| TC-7.8 | Serve 10th barley tea, go to accounting | Congratulatory message shown; rice unlocked; +10 rice & +10 barley in inventory |
| TC-7.9 | Next day after rice unlock, check farm | Can plant rice on plots |
| TC-7.10 | Next day after rice unlock, check kitchen | Rice bin, rice cooker, bowl station, and sink visible; kettle available |
| TC-7.11 | Next day after rice unlock, check menu | Barley Rice recipe available |

---

## R8: Time System

### R8.1 Real-Time Growth

| ID | Requirement |
|----|-------------|
| R8.1.1 | Growth uses device system clock (Date.now()) |
| R8.1.2 | 1 growth day = 24 real hours (86,400,000 ms) |
| R8.1.3 | Offline growth calculated as: floor((now - lastPlayedTimestamp) / MS_PER_DAY) |
| R8.1.4 | Offline growth applied to all planted crops on Farm scene load |
| R8.1.5 | Day advancement via Accounting also advances crop growth by 1 |

### R8.2 Dev Tools

| ID | Requirement |
|----|-------------|
| R8.2.1 | 0 key in Farm scene advances all crops by 1 growth day |
| R8.2.2 | Crops meeting growth threshold become ready immediately |

#### Test Cases

| TC | Steps | Expected Result |
|----|-------|-----------------|
| TC-8.1 | Plant barley, press 0 | Crop gains 1 growth day; becomes ready |
| TC-8.2 | Plant barley, set device clock forward 24h, reload | Crop shows as ready on Farm scene load |
| TC-8.3 | Plant barley, play through full day cycle (Accounting→Next Day) | Crop gains 1 growth day from day advancement |

---

## R9: UI & Visual Design

### R9.1 Layout

| ID | Requirement |
|----|-------------|
| R9.1.1 | Game canvas is 768x1024 pixels |
| R9.1.2 | Scale mode: FIT with CENTER_BOTH |
| R9.1.3 | Renderer: AUTO (WebGL with Canvas fallback) |
| R9.1.4 | All scenes use 16x16 tile grid (48px tiles) for game area (768x768), HUD below (768x256) |

### R9.2 Scene Themes

| ID | Scene | Background |
|----|-------|------------|
| R9.2.1 | Farm | Dark navy (#1a1a2e) with green grass tiles |
| R9.2.2 | Menu | Warm cream (#F5E6D0) |
| R9.2.3 | Serve | Dark navy (#1a1a2e) with floor/wall tiles |
| R9.2.4 | Accounting | Warm cream (#F5E6D0) |
| R9.2.5 | Title | Dark navy (#1a1a2e) |

### R9.3 Visual Feedback

| ID | Requirement |
|----|-------------|
| R9.3.1 | Active mode highlighted in HUD text |
| R9.3.2 | Selected menu dish highlighted with green checkbox and border |
| R9.3.3 | Farm plots change color based on crop state (barley gold/tan) |
| R9.3.4 | Oven progress bar fills during roasting; green when done, red when burned |
| R9.3.5 | Kettle label shows state (BOIL?, percentage, cups remaining). Cooker label shows state (ingredient status, COOK?, percentage, servings remaining). |
| R9.3.6 | Kitchen table overlays show placed items with color and short label |
| R9.3.7 | Floating order indicators centered above tables: large "!" when seated, distinctive food icons (12px — cup shape for tea, bowl shape for rice, matching menu colors) when ordered, dirty indicators on table when dirty |
| R9.3.8 | Yellow facing highlight on interactable tiles |
| R9.3.9 | Boil/wash/cook/trash progress bar in HUD during active hold-space mechanics; fill is clamped to container width (never exceeds background) |
| R9.3.10 | Held-item indicator above player: colored circle for single items, row of squares for tray or bowl stack |
| R9.3.11 | Player sprite is 42x48px with hair, face, shirt, and pants detail |
| R9.3.12 | Table tiles use full-bleed fill (no border) so adjacent tiles merge seamlessly |
| R9.3.13 | Order indicators render at depth 30 above all other game objects |

---

## Appendix A: Full Day Walkthrough Test

**TC-E2E-1: Complete day 1 from new game**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click "New Game" | Day 1, wallet $0, inventory: 5 barley |
| 2 | Farm: Plant barley in 5 plots | Inventory unchanged (seeds free); 5 plots occupied |
| 3 | Farm: Press 0 (DEV skip) | All 5 crops become ready |
| 4 | Farm: Harvest all 5 (unwatered) | +10 barley; inventory: 15 barley |
| 5 | Farm: Walk to EXIT | Transition to Menu; save written |
| 6 | Menu: Toggle on Barley Tea | Card highlighted; inventory unchanged |
| 7 | Menu: Click "Open Restaurant" | Menu saved; transitions to Serve scene |
| 8 | Serve: Recipe book opens; close it with Space/Esc | Customers begin arriving after recipe book is closed |
| 9 | Serve: Walk to table, press Space → take group order | Floating indicator shows food icons (1 per group member) |
| 10 | Serve: Walk to BARLEY, press Space | Pick up barley (inventory -1) |
| 11 | Serve: Walk to OVEN, press Space | Barley placed; roasting starts |
| 13 | Serve: Wait 5s, walk to OVEN, press Space | Pick up roasted barley |
| 14 | Serve: Walk to KETTLE, press Space | Add roasted barley to kettle |
| 15 | Serve: Press Space at KETTLE, hold Space for 3s | Kettle boils; shows "x5" |
| 16 | Serve: Walk to CUPS, press Space 3 times | Pick up 3 empty cups on tray |
| 17 | Serve: Walk to KETTLE, press Space 3 times | Fill 3 cups → tray: 3 tea, 0 empty |
| 18 | Serve: Walk to ordered table, press Space | 1 tea served from tray; +$2; if group fully served → table dirty; else indicator shows remaining |
| 19 | Serve: Press Space at dirty table | Table cleaned; dirty cups removed; next customer arrives |
| 20 | Serve: Repeat until all customers served | All served; "All done!" prompt |
| 21 | Serve: Walk to EXIT | Transition to Accounting |
| 22 | Accounting: Verify totals | Revenue displayed; wallet updated |
| 23 | Accounting: Click "Next Day" | Day 2; menu/customers reset; crops advanced |

---

## Appendix B: Edge Cases

| TC | Scenario | Expected |
|----|----------|----------|
| TC-EDGE-1 | Player has 0 inventory, enters Menu | Recipe shown but no ingredients to fulfill orders during service |
| TC-EDGE-2 | All tables occupied, more customers waiting | New customers wait; arrive when a table becomes clean |
| TC-EDGE-3 | All 3 tables dirty at once | Must clean at least 1 before next customer can arrive |
| TC-EDGE-4 | Try to serve customer without barley tea | "Need Barley Tea to serve!" message |
| TC-EDGE-5 | Try to pick up barley from barley station with 0 inventory | "No barley!" message |
| TC-EDGE-6 | Leave barley in oven for >10 seconds | Barley burns; must discard and retry |
| TC-EDGE-7 | Fill all 5 cups from one kettle batch | Kettle empties; must add more roasted barley |
| TC-EDGE-8 | Place item on kitchen table, pick it up later | Item persists on table until retrieved |
| TC-EDGE-9 | Try to pick up barley while holding a cup | "Hands full!" message |
| TC-EDGE-9d | Face trash bin with nothing held, hold Space | "Nothing to discard!" message |
| TC-EDGE-9e | Face trash bin while holding item, hold Space 0.5s then release | Discard cancelled; item kept |
| TC-EDGE-9f | Face trash bin while holding item, hold Space 1s | Item discarded; hands empty |
| TC-EDGE-9a | Pick up 5th cup onto full tray (4 cups) | "Tray full!" message |
| TC-EDGE-9b | Hold tray with 0 empty, 0 filled (all served) | Hands become free automatically |
| TC-EDGE-9c | Place tray on kitchen table, place another item on 2nd table | Both tables show correct items; pick up restores states |
| TC-EDGE-9g | Pick up 5th bowl onto full stack (4 bowls) | "Stack full!" message |
| TC-EDGE-9h | Hold bowl stack with 0 empty, 0 filled (all served) | Hands become free automatically |
| TC-EDGE-9i | Place bowl stack on kitchen table, place another item on 2nd table | Both tables show correct items; pick up restores stack states |
| TC-EDGE-10 | Player clears localStorage during gameplay | Next load shows no save; must start new game |
| TC-EDGE-11 | Multiple days without harvesting | Crops stay ready indefinitely; do not expire |
| TC-EDGE-12 | Ingredients run out mid-service (no seated customers) | No more customers spawn; player serves remaining orders and closes service |
| TC-EDGE-13 | Ingredients run out after customer seated but before ordering | Customer leaves; table becomes dirty |
| TC-EDGE-14 | Player closes service before serving any customers | Accounting shows 0 customers, $0 revenue |
| TC-EDGE-15 | Release Space during kettle boil, then resume | Boil progress persists; resumes on next hold |
| TC-EDGE-16 | Exit scene while customers are mid-walk | Scene shuts down cleanly; all avatar textures cleaned up |
