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

* Players plant, harvest, and water crops on a 4x4 grid of farm plots
* Three crop types: napa cabbage (base yield 2, watered yield 4), red pepper (base yield 2, watered yield 4), and rice (base yield 3, watered yield 6)
* Planting does not consume inventory — seeds are unlimited
* All crops take 1 real day (24 hours, determined by device time) to grow
* Players start with a starter inventory of 6 cabbage, 4 pepper, 6 rice (starter harvest for day 1 cooking)
* Watering increases crop yield by 2x (limited efficacy: one water per crop per day. Additional watering will yield no further change)
* *Future: Players can re-arrange (dig and replant) their farming plot as aesthetically desired*

In the **menu setting** phase:

* Players set their daily lunch menu, based on the crops they have
* Four example recipes:
  * **Kimchi**: 2 cabbage + 1 pepper
  * **Kimchi Stew**: 3 cabbage + 1 pepper
  * **Kimchi Fried Rice**: 1 cabbage + 1 pepper + 2 rice
  * **Roasted Rice Tea**: 1 rice
* The daily menu determines which food is available for customers to order for that day

In the **serving** phase:

* The player opens the restaurant with 4 tables (1x 2-seat, 3x 4-seat)
* Customers arrive and seat themselves at empty clean tables, trickling in dynamically (a new customer arrives 3-5 seconds after a table becomes available)
* New customers only arrive when the restaurant has enough ingredients to fulfill at least one menu item
* The player takes the customer's order. Customers order from the menu. Customers can only order food that the restaurant has enough ingredients to fulfill. If ingredients run out after a customer is seated but before ordering, the customer leaves
* Only one order can be cooked at a time in the kitchen
* After the player takes a customer's order, they cook the order. All food is made-to-order.
* Each recipe has specific prep steps:
  * Kimchi: Chop cabbage (2s) → Mix with pepper flakes & salt (2s)
  * Kimchi Stew: Chop cabbage (2s) → Boil stew (3s) → Add pepper & season (2s)
  * Kimchi Fried Rice: Chop kimchi (2s) → Fry rice with kimchi (3s)
  * Roasted Rice Tea: Roast & steep rice (3s)
* The "Close Service" button appears after all customers are served
* *Future: Speech bubble/thinking bubble ordering interactions*
* *Future: In advanced levels, players can hire servers and cooks to do this phase idly if desired*

In the **accounting** phase:

* The player closes the restaurant
* A summary screen displays: customers served, total revenue, total earnings, and wallet balance
* The "Next Day" button advances the day: increments day counter, resets menu/customers/dayResults, advances crop growth by 1 day, resets watered flags, and saves the game
* Wallet balance and inventory carry over to the next day

This concludes the day's tasks and can be repeated the following day
* *Future: Cleaning animation (floor swept, mopped, dishes washed, leftovers put away)*
* *Future: Shareable prompt showing e.g. "you served x servings of y dish!" with accompanying art*

**Adding new recipes**  
As players level up, they can obtain additional crop species that enable more recipes

**Art and Aesthetic**  
The look and feel of the game will be relaxed, calm, simple, and nature-inspired. MVP will be pixelated art similar to the original Pokemon gameboy series. Buildings will be made of wood, crop areas will be green, and the sky will be a peaceful blue.

Players will move a 2D avatar on screen and in order to farm and serve food, similar to Pokemon Emerald.

**Platform**
Launch as browser game – no installs, no friction, highest reach
* 400x600px canvas, mobile-optimized (FIT scaling with center alignment)
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

