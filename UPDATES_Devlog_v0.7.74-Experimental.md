# WarHeads Classic Enhanced v0.7.74 Experimental

Experimental Branch pass focused on Ship Editor fixes and the first Sprite Editor system.

## Ship Editor Fixes
- Fixed ship names not saving correctly from the visible Name field into the JSON/local storage path.
- Saving a ship now respects the current UI name and cells instead of trusting stale JSON text first.
- Ship JSON now updates when the name changes.
- Moved the ship pixel grid into the center of the editor.
- Moved the preview to the right side.
- Improved palette/default color visibility on mobile and browsers with stronger swatches, labels, and outlines.

## New Sprite Editor
- Added a new main menu button: SPRITE EDITOR.
- Sprite Editor can select/edit graphical sprite items including:
  - player ship
  - bot ship
  - shell/missile
  - sniper shot
  - napalm shot
  - terrain builder
  - orbiter
  - splitter
  - fire/freeze/shock/infect/vortex effect placeholders
  - credit pickup
  - alien boss/UFO placeholders
- Sprite packs are graphics-only and do not affect gameplay rules.
- Added save-as-default-for-item support for local sprite packs.
- Added reset current item and reset all sprite overrides.
- Added individual sprite export and selected sprite pack export.
- Added JSON import support for sprite packs or single sprites.

## Files
- Added SPRITES/ folder.
- Added SPRITES/README.txt.
- Added a starter sprite pack example.

## Preserved
- v0.7.73 Experimental economy/events scaffold.
- v0.7.72 Experimental UIX.
- v0.7.70 stable gameplay/multiplayer baseline.
