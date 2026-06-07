# WarHeads Classic Enhanced v0.7.66 — Mobile Menu Launch Rollback / Stable Recovery

Built from the last known working mobile/function baseline: v0.7.59.

## Fixed
- Rolled back the risky v0.7.60-v0.7.65 mobile menu routing/visibility experiments.
- Restored the working multiplayer mobile launch path instead of forcing the game behind/under menu overlays.
- Kept the lobby JSON/state recovery so `rooms.json` can recover from `{}`, blank, missing, or damaged state.
- Kept the terrain crater/napalm cleanup fix without bringing forward the broken mobile menu logic.

## Preserved
- v0.7.59 mobile retention and kicked-player turn recovery.
- v0.7.58 host pack stability and near-local fire behavior.
- v0.7.56/v0.7.53 stable multiplayer sync baseline.
- v0.7.52 turn authority and terrain batch slider.
- v0.7.51 fire-button debounce.

## Important
This build intentionally does not include the mobile routing/forced-visibility changes from v0.7.60-v0.7.65. Mobile keeps the working functional path and only keeps safe style-era improvements already present in the stable base.
