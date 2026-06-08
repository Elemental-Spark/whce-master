# WarHeads Classic Enhanced v0.7.59

Mobile play retention / kicked-player turn recovery hotfix.

- Prevented mobile clients from being dumped back to the WarHeads main menu when the browser pauses, hides, reloads, or briefly loses the PHP room binding during active play.
- Added a recover-room path so a still-running game can reclaim/reconnect the player instead of forcing them out.
- Increased multiplayer idle tolerance for mobile browsers that throttle background tabs.
- Added server-side running-turn normalization so invalid active players cannot lock the match.
- Fixed kicked/banned active players: the turn is released and the match moves to the next valid participant instead of freezing on the removed player.
- Preserved the v0.7.58 host pack and near-local fire fixes, v0.7.56/v0.7.53 stable sync behavior, in-game chat, per-player packs, terrain batch tools, and prior HUD/menu/focus fixes.
