# SOLMARINA — Streets of the Sun

[![Make GTA 6](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![Rank](https://make.fun/badge/gta6-01/zakkysp/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![Reward](https://make.fun/badge/gta6-01/zakkysp/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

An original open-world crime game in the spirit of GTA 6, built for the
[Make GTA 6](https://make.fun/bounty/gta6-01) bounty on make.fun. Play as Dario Vega,
a getaway driver back home in Solmarina — a sun-soaked coastal city of your own, with
its own streets, people, cars and story. Nothing here comes from Rockstar's GTA or any
other commercial game.

## The story

Five years away, and Solmarina smells the same: salt, gasoline and trouble. Mama Luz's
garage is in debt to Viktor Kroll, the developer buying up the Old Port. Five jobs pay
the debt off — a stolen Comet GT, a timed drop across town, a bank vault, and a final
reckoning on Kroll's yacht at Marina Bay.

## What is in the game

- **A city to explore** — Old Port, Downtown, The Palms, Barrio Verde, the Docks and
  Marina Bay, with a beach, parks, palms and a full street grid.
- **On foot and by car** — walk, sprint, steal any car on the street (E), drive with
  real steering, drift and a handbrake (Space).
- **Traffic and pedestrians** — cars that drive the grid and stop for each other,
  residents who stroll the sidewalks and run when trouble starts.
- **A wanted level** — 0 to 5 stars. Steal a car in front of the law, hit a
  pedestrian or fire a shot and the Solmarina PD answers: cruisers that ram, foot
  cops that shoot. Lay low to cool off, or pay $150 at Lucky's Respray.
- **Missions and a story** — five jobs with objectives, timers, guards to clear and
  payouts, plus cash bundles and gold bars hidden around the city.
- **Combat** — aim with the mouse, shoot with a click, ammo to manage.
- **HUD with a minimap** — money, health, ammo, wanted stars, the mission objective
  and a live minimap with the mission blip, police and traffic.
- **Start screen and save** — New Game or Continue from localStorage, pause menu,
  wasted/busted endings, and a final screen when the coast is yours.
- **Sound** — everything synthesized in WebAudio: engine hum, sirens, gunshots,
  pickups and a quiet synthwave loop. M mutes.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Walk / drive |
| Shift | Sprint |
| Mouse | Aim |
| Click | Shoot |
| E | Get in / out of a car |
| Space | Handbrake |
| Esc / P | Pause |
| M | Mute |

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network: `game/index.html` and its modules play from any static
server. Screenshots are staged renders of the game itself (`?shot=start|drive|chase|mission`).

## Play it on make.fun

Enter the bounty and play the games: https://make.fun/r/5twwhvj5
