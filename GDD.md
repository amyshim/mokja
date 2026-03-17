**Mokja: Game Design Document**  
*A cozy, browser game. Players run their own farm-to-table restaurant with Korean recipes\!*

**Vision & game description**

* In fertile agricultural land of Southern California, a burnt out Korean-American office worker Sam quits her job and opens a farm-to-table restaurant  
* Players farm ingredients, set a daily menu, and cook increasingly complex recipes in order to fulfill Sam’s dream of earning a Michelin star

**Target audience**

* Women, ages 25 to 45

**Reasons to play**

* **Comfort in predictability**: In a world with political turmoil, social fracturing, and news fatigue, players desire escape in a world where clear actions result in observable change  
* **Entering flow state**: In a world with an abundance of distractions, players seek a place where they can immerse and have fun for 10 minutes to an hour at a time

**Core Loop Mechanics**
The core loop involves five phases: **farming**, **setting a daily menu**, **serving**, and **accounting**

In the **farming** phase:

* Players plant, harvest, and water crops on a 4x6 grid of farm plots (24 total)
* Crop types unlock through milestones:
  * **Barley** — available from start
  * **Rice** — unlocked after serving 10 barley teas (cumulative across days)
* Planting does not consume inventory — seeds are unlimited (once unlocked)
* All crops take 1 real day (24 hours, determined by device time) to grow
* Players start with a starter inventory of 5 barley (already grown)
* Watering increases crop yield by 2x (limited efficacy: one water per crop per day. Additional watering will yield no further change)
* *Future: Players can re-arrange (dig and replant) their farming plot as aesthetically desired*

In the **menu setting** phase:

* Players set their daily lunch menu, based on the crops they have
* Recipes unlock through milestones:
  * **Barley Tea** ($2): 1 barley — available from start
  * **Barley Rice** ($3): 1 barley + 1 rice — unlocked after serving 10 barley teas

* The daily menu determines which food is available for customers to order for that day

In the **serving** phase:

* The player opens the restaurant with 3 tables with 2 seats each.
* Customers are represented as individual avatar sprites with randomized appearances (skin tone, hair color, shirt color). Each group member is a distinct avatar
* Customers walk in from the restaurant entrance to their assigned seats using grid-based pathfinding, with staggered timing so group members follow each other single-file
* Customers have a 'walking' status while en route to their seats. They transition to 'seated' only after all group members finish walking. No indicators or interactions are possible while customers are walking.
* Customers arrive and seat themselves at empty clean tables, trickling in dynamically (first customer arrives after player closes the recipe book; subsequent customers 3-5 seconds after a table becomes available)
* New customers only arrive when the restaurant has enough ingredients to fulfill at least one menu item
* The player takes the customer's order by walking to the table and pressing Space. The entire group orders at once (one dish per person). For a group of 2, this means 2 servings are needed. Customers can only order food that the restaurant has enough ingredients to fulfill. If ingredients run out after a customer is seated but before ordering, the customer leaves
* Serving is done one portion at a time. For a group of 2, the player must deliver 2 barley teas. The group only leaves after all servings are delivered.
* After being fully served (or leaving), customer avatars walk back to the entrance and exit the restaurant
* **Order indicators**: A floating speech bubble appears centered above each occupied table. When customers are seated and ready to order, a large "!" icon appears. After ordering, distinctive food icons appear showing remaining servings needed — cups with steam for barley tea, bowls with rice dots for barley rice. Icons are sized (12px) to be clearly recognizable and use the same colors as the menu cards. When the table is dirty after customers leave, dirty indicators appear on the table surface.

* Players cook and prepare food in the kitchen area. Food can be made any time, even if a customer has not yet ordered.
* The kitchen area functions like the game Overcooked.
* Each recipe has specific prep steps:
  * **Barley Tea**: Bring 1 barley to the oven → roast (5s) → bring roasted barley to the tea kettle → hold Space to boil (3s) → bring cup to kettle to fill.
  * **Barley Rice**: Bring 1 rice to the sink → hold Space to wash (3s) + Bring 1 barley to the sink → hold Space to wash (3s) → bring washed rice + washed barley to the rice cooker (either order) → hold Space to cook (3s) → pick up bowl from bowl station → pick up barley rice from cooker (5 servings per batch, 1 per bowl).

* In the kitchen area:
  * There is a **barley station** (crop storage, labeled "BARLEY"). Players retrieve barley from the station (deducts 1 from inventory).
  * There is a **rice bin** (crop storage, unlocked with rice). Players retrieve rice from the bin (deducts 1 from inventory).
  * There is an **oven**. Players place raw barley in the oven to roast. The oven takes 5 seconds to roast. Players are free to do other things while the oven roasts. If the player doesn't pick up the roasted barley within 10 seconds, it burns and must be discarded.
  * There is a **tea kettle**. The kettle handles barley tea only: add roasted barley, then hold Space for 3 seconds to boil. One roasted barley produces 5 cups of barley tea. Once all 5 cups are dispensed, the kettle empties. The kettle has an indicator that shows its state.
  * There is a **rice cooker** (unlocked with rice). The rice cooker handles barley rice only: add washed rice + washed barley (in either order), then hold Space for 3 seconds to cook. Produces 5 servings of barley rice. Player picks up one serving at a time using a bowl.
  * There is a **sink** (unlocked with rice). Players wash barley or rice by holding Space for 3 seconds. Required prep step for barley rice (wash both rice and barley before cooking). Not needed for barley tea.
  * There is a **recipe book station** at the bottom-left of the kitchen (col 0, row 13). The recipe book opens automatically when the serving phase starts so the player can review recipes before customers arrive. Customers only begin arriving after the player closes the recipe book. The modal shows step-by-step recipe instructions with food icons matching those in customer speech bubbles (tea cup for barley tea, bowl for barley rice), and includes a hint about reopening. Close with Space or Escape.
  * There is a **bowl station** (unlocked with rice). Players pick up bowls here. Bowls are required for plating barley rice from the rice cooker.
  * There is **cup storage**. Players retrieve empty cups from this area.
  * There is a **trash bin**. Players hold Space for 1 second while facing the trash bin to discard the currently held item.
  * There are **kitchen tables** (4 surfaces). These can be used to place and stage prepared items. For example, a player can pre-make barley tea and store cups on kitchen tables before customers order.
* Before rice is unlocked, tiles for locked stations (rice bin, rice cooker, bowl station, sink) are walkable floor — no invisible walls.
* The player carries one item at a time: barley, washed barley, roasted barley, empty cup, barley tea, rice, washed rice, bowl, or barley rice.
* **Tray mechanic**: Players can optionally carry multiple cups on a tray. Picking up a second cup from cup storage while already holding a cup or tea upgrades to a tray (max 4 slots). The tray holds a mix of empty cups and filled barley tea. Players fill tray cups one at a time at the hot kettle without needing to set the tray down. Serving one customer removes one filled cup from the tray. When the tray is emptied completely, hands become free.
* **Bowl stack mechanic**: Players can optionally carry multiple bowls in a stack. Picking up a second bowl from the bowl station while already holding a bowl or barley rice upgrades to a stack (max 4 slots). The stack holds a mix of empty bowls and filled barley rice. Players fill stack bowls one at a time at the rice cooker without needing to set the stack down. Serving one customer removes one filled bowl from the stack. When the stack is emptied completely, hands become free.
* The player sprite displays a small visual indicator above the character showing the currently held item. Single items show as a colored circle (6px). Trays show a row of small squares — gold for filled tea, white for empty cups. Bowl stacks show a row of small squares — brown for filled barley rice, gray for empty bowls.
* Players bring prepared barley tea (single or from tray) to an ordered customer's table to serve them.

* The "Close Service" button appears after all customers are served
* *Future: In advanced levels, players can hire servers and cooks to do this phase idly if desired*

In the **accounting** phase:

* The player closes the restaurant
* A summary screen displays: customers served, total revenue, total earnings, and wallet balance
* The "Next Day" button advances the day: increments day counter, resets menu/customers/dayResults, advances crop growth by 1 day, resets watered flags, and saves the game
* Wallet balance and inventory carry over to the next day

This concludes the day's tasks and can be repeated the following day
* *Future: Cleaning animation (floor swept, mopped, dishes washed, leftovers put away)*
* *Future: Shareable prompt showing e.g. "you served x servings of y dish!" with accompanying art*

**Milestone Unlocks**

| Milestone | Trigger | Reward |
|-----------|---------|--------|
| First Milestone | Serve 10 barley teas (cumulative) | Congratulatory message. Unlocks rice crop, rice bin, rice cooker, bowl station, sink. Awards 10 rice + 10 barley inventory. Unlocks Barley Rice recipe. |

When a milestone is reached, the game displays a congratulatory popup at the end of the service day (during accounting). New crops, stations, and recipes become available starting the next day.

**Adding new recipes**
As players hit milestones, they unlock additional crop species that enable more recipes

**Art and Aesthetic**
The look and feel of the game will be relaxed, calm, simple, and nature-inspired. MVP will be pixelated art similar to the original Pokemon gameboy series. Buildings will be made of wood, crop areas will be green, and the sky will be a peaceful blue.

Players will move a 2D avatar on screen and in order to farm and serve food, similar to Pokemon Emerald. All art is generated programmatically — no external sprite sheets or image files. Tile textures (48x48px) feature detail like brick patterns on walls, checkerboard floors, wood grain on tables, and stone paths. Table tiles use full-bleed fills so adjacent tiles merge seamlessly into one continuous surface.

The player sprite is 42x48px with distinct hair, face/skin, shirt, and pants. A held-item indicator is rendered above the character (a colored circle for single items, or a row of squares for tray cups — gold for filled, white for empty).

Customer avatars (36x42px) are procedurally generated with randomized features drawn from pools of 5 skin tones, 6 hair colors (all chosen to contrast with the floor tile color), and 10 shirt colors. Each avatar has 4 directional sprites (up/down/left/right) with visible eyes, hair, shirt, and pants.

**Platform**
Launch as browser game – no installs, no friction, highest reach
* 768x1024px canvas, mobile-optimized (FIT scaling with center alignment)
* Engine: Phaser 3 + TypeScript + Vite
* Persistence via localStorage
* Desktop "full version" later, if enough interest in browser version

**Reference Titles**

* Animal Crossing New Horizons  
* Stardew Valley  
* Farmville  
* Diner Dash  
* Cooking Mama  
* Puff Puff Island Game  
* Overcooked  
* Idle titles e.g. Fish to Dish: Idle Sushi, Neko Atsume  
* Dave the diver

