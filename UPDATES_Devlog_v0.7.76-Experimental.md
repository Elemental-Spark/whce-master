# WarHeads Classic Enhanced v0.7.76 Experimental

Experimental Branch polish pass.

## Fixed
- Cleaned up visible build labels.
  - Game screen now uses only `v0.7.76 (E)`.
  - Menu screen shows the same short label under the menu.
  - Removed the long/repeated EXPERIMENTAL EXP-style wording from visible UI.
- Fixed Weapon Editor mode highlighting.
  - STAGED highlights when selected.
  - SNIPER highlights when selected.
  - OAT highlights when selected.
- Added OAT as a visible Weapon Editor mode button.
- Reworked Weapon Editor stage selection to be less busy and more like the game/menu UI.
- Added the new elemental/alien/environmental stage actions into the grouped stage dropdowns:
  - fire
  - freeze
  - shock
  - infect
  - summon
  - vortex
  - acid
  - gravity
  - alien
  - plasma
  - meteor
  - radiation
- Updated menu/editor visual styling so custom menu themes recolor the newer neo UI instead of being ignored.
- Fixed mobile multiplayer launch/display hardening:
  - entering a running multiplayer game forces the game screen active
  - lobby/room panels are hidden while the game iframe is active
  - iframe is forced fullscreen on mobile
- Fixed mobile in-game chat dock behavior:
  - chat stays accessible on mobile
  - chat button is placed bottom-left with high z-index over the game iframe
  - room chat dock has mobile-safe layout

## Added
- Local-player turn alert sound.
  - Mechanical ship-control sound.
  - Low volume and short duration.
  - Plays when the local human turn begins.
- Event warning overlay.
  - Shows up to around a minute before the experimental event boss starts.
  - Uses event color/style.
  - Slime Colossus gets green edge warning and slime-leak VFX.
  - Warning blends into the actual event appearance.

## Preserved
- v0.7.75 visual/elemental weapon work.
- v0.7.74 Sprite Editor and Ship Editor fixes.
- v0.7.73 credits economy and event boss scaffold.
- Stable v0.7.70 multiplayer/gameplay baseline.
