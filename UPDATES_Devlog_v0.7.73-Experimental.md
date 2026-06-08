# WarHeads Classic Enhanced v0.7.73 Experimental

Experimental Branch pass focused on configurable credits economy and arcade-style event boss scaffolding.

## Economy
- Added host/server economy defaults:
  - Credits On / Off
  - Starting/default credits
  - Weapon minimum cost
  - Weapon maximum cost
  - Defense minimum cost
  - Defense maximum cost
- New default weapon cost range:
  - small/basic weapons start around 1,000 credits
  - large/stacked weapons cap around 10,000 credits by default
- Defense defaults remain 5,000 credits.
- Credits are awarded for damage:
  - default 1,000 credits per 10 HP damage
  - rounded cleanly to 10 / 100 / 1,000 style values
- Self-damage now deducts credits:
  - default 100 credits per 10 HP self damage
- Multiple targets hit in one turn can add bonus payout with a cap.

## Event Boss Scaffold
- Added a one-at-a-time experimental event system.
- Default event timing targets 3-10 minutes when no event is already active.
- Added four arcade-style boss/event types:
  - Planet Warden
  - Void Manta
  - Rust Comet
  - Slime Colossus
- Event bosses roll a 2x-5x credit bonus when they appear.
- Bosses are drawn as 80s arcade-style 2D side-scroller silhouettes.
- Bosses attack only every few turns instead of spamming constantly.
- Bosses have a 5-minute default lifetime.

## Preserved
- v0.7.72 Experimental UIX.
- v0.7.70 stable multiplayer/pack baseline.
- Existing pre-game menu flow.
