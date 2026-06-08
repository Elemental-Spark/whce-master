# WarHeads Classic Enhanced v0.7.85 GOLD

End-of-day editor / HUD recovery build from v0.7.84 GOLD.

## Fixed Ship Editor / Sprite Editor
- Restored palette visibility so swatches show the actual colors again.
- Removed color-code text from palette buttons.
- Ship Editor now paints one pixel at a time like Sprite Editor.
- Added/refreshes a Saved Ships dropdown inside Ship Editor.
- Saving a ship now immediately:
  - updates the saved ships list
  - keeps the saved ship selected
  - assigns it to the player
  - updates the in-game player ship when in a match
- Added recovery/merge logic for player-made ships from legacy/local saved ship keys and sprite packs where possible.
- This does not intentionally delete any saved ships.

## Fixed Weapon Editor
- Elemental/alien/environmental actions now survive normalization and saving:
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
  - sequence/OAT
- Save Weapon now saves permanent custom updates, keeps the weapon selected, and refreshes price/credits immediately.
- Weapon Editor layout is cleaned up into a simpler left settings / right stages flow while preserving controls.

## Restored Active HUD Info
- Top-left player card shows the active turn player again.
- Top-left player card shows:
  - current player name
  - current player HP
  - current credits
- Duplicate left credits card is hidden.

## Preserved
- v0.7.84 GOLD chat restoration and permanent weapon save direction.
- v0.7.83 editor rollback baseline.
- Static GOLD version label.
