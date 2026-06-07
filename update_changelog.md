# WarHeads Classic Enhanced Update Changelog
## Multiplayer Stability + Mobile Recovery Series
### v0.7.40 through v0.7.67

Discord-ready summary for the current public test branch.

---

## Current Build
**WarHeads Classic Enhanced v0.7.67**

This update line focused on keeping the working multiplayer game intact while improving server setup, weapon packs, mobile usability, terrain cleanup, turn sync, host tools, and in-game quality of life.

The most important preserved foundation:
- Main entry remains `index.html`.
- Multiplayer remains isolated under `warheads/multiplayer/`.
- v0.7.33 GOLD shared multiplayer launch flow is preserved.
- Hosted rooms still use the PHP lobby / room system.
- Players can create, join, leave, rejoin, spectate, and late-join hosted games.
- Weapons, planets, bots, turns, host tools, and multiplayer game launch are still built around the existing WarHeads Classic Enhanced gameplay loop.

---

# Major Features Kept And Improved

## Multiplayer Stability
- Preserved the working hosted multiplayer room flow.
- Improved create / join / rejoin behavior.
- Fixed several cases where players could get stuck after leaving, rejoining, tabbing out, or losing focus.
- Added session reset behavior when a player intentionally clicks Leave.
- Kept auto-rejoin behavior for accidental disconnects or refreshes.
- Added better room JSON recovery so damaged or empty multiplayer state files do not break the lobby.
- Cleaned packaged multiplayer server state for safer uploads.

## Turn Sync And Shot Flow
- Improved multiplayer turn authority so clients are less likely to drift apart.
- Added server-side protection against stale or duplicate turn-finish events.
- Added better catch-up behavior so slow clients can resync without making everyone wait forever.
- Reduced post-shot waiting and catch-up lag.
- Restored the smoother shot flow from the stable sync baseline.
- Fixed cases where kicked or invalid players could lock the turn.
- If a kicked player owns the turn, the server now moves on instead of freezing the game.
- Fixed focus/tab-out cases where the player could not shoot after returning.
- Fire button now locks immediately on first click to prevent spam/double-shot corruption.
- Host firing is closer to local play while still syncing the authoritative shot to the server.

## Weapon Packs And Custom Weapons
- Fixed host weapon pack selection being reset to Experimental.
- Added per-player weapon pack selection for multiplayer.
- Each player can bring their own selected pack into a hosted game.
- Player pack choice is stored per-player instead of globally overwriting the host or room.
- Custom/edited weapons remain visible and available through Default + My Weapons.
- Saving edited weapons no longer silently hides them behind the wrong active pack.
- The Weapon Editor keeps showing player-made or modified weapons regardless of current pack.
- Experimental pack remains available, but no longer hijacks the host’s saved weapons.
- The host’s pack selection is treated as authoritative for that host before launch.

## In-Game Room Chat
- Added room chat slideout support for the running game.
- Room chat carries over from the lobby into active play.
- Added safety warning styling to chat areas.
- Added a local toggle so players can hide/show room chat.
- Kept room chat separate from the core game loop so it does not control turns or shots.

## Server Menu And Host Options
- Reworked server setup to feel more like the main WarHeads menu.
- Added Server Defaults on the Create Game screen.
- Host defaults can carry over from saved multiplayer settings and local advanced options.
- Added a wider Server Editor style instead of a long cramped side form.
- Added pages/tabs for server options:
  - Setup
  - Planets
  - Physics
  - Cleanup / FX
- Server Details continues showing applied settings to players.
- Host Options was cleaned up to keep only core room settings visible.
- Advanced settings moved into a dedicated edit window instead of cluttering the main room screen.

## Host Tools
- Preserved the Host Tools drawer.
- Moved terrain/admin tools out of the top HUD lane.
- Added terrain generation batch control.
- Host can generate terrain in batches from 1 to 20.
- Default terrain batch amount is 8.
- Host terrain generation is safer and less likely to overlap critical UI.

## Mobile And Viewport Handling
- Rolled back risky mobile routing changes that broke game launch.
- Preserved the working menu/game launch path.
- Added mobile viewport fit improvements without changing the core launch function.
- Mobile now uses a centered desktop-style layout at about 75% scale.
- Browser pinch zoom is allowed again.
- Game canvas pinch zoom behavior remains intact.
- Mobile browser desktop-mode / zoom offset behavior was improved.
- The goal is now style/fit only on mobile, not alternate routing or separate mobile game logic.

## HUD And Menu Return
- Moved in-game utility buttons away from top title/status collision zones.
- Added lower HUD safe-zone placement for Menu and Leave Game.
- Added semi-transparent utility controls where needed.
- Added Return To Game behavior when opening the menu from an active match.
- Escape can return to the match from the active menu.
- Menus opened from the running game should always have a path back to the game.

## Terrain, Planets, And Cleanup
- Added recurring cleanup routines for leftover shot/VFX/physics debris.
- Cleaned old particles, beams, debris, shockwaves, walkers, magnet fields, old VFX, and other leftovers.
- Reduced long-match bloat that could slow the server or game after many rounds.
- Fixed ugly persistent crater/impact rings after explosions.
- Planet damage now draws cleaner cutouts instead of dotted ring overlays.
- Napalm now eats into planets over time with burn pulses.
- Napalm burn pulses do not repeatedly apply full ship-damage blasts.
- Explosion sizes were tightened so small, medium, and large hits are more distinct.
- Very large explosions no longer take oversized terrain bites by default.
- Spawned/generated planets are preserved more safely during sync compaction.

## OAT Fly Mode And Experimental Weapons
- Added **OAT** as a third fly mode alongside **STAGED** and **SNIPER**.
- OAT fires each stage one at a time in a single-file sequence.
- Added editable OAT delay and OAT payload stage behavior in the weapon system.
- Fixed No Fly so it detonates directly in front of the player instead of pushing outward.
- Added Experimental weapon pack.
- Experimental pack generates mixed weapon types instead of forcing every weapon to OAT.
- Experimental weapons include mixed STAGED, SNIPER, and OAT behavior.
- Terrain Mass Maker remains part of Experimental.

## UI And Visual Styles
- Added menu readability improvements.
- Fixed yellow-on-yellow text/button contrast.
- Added wider cleaner menu layout direction.
- Added shaped UI style options.
- Added planet style options and refreshed visual style names.
- Preserved the clean v0.7.11-style main menu direction.
- Expanded menus without intentionally changing their core behavior.

---

# Version-By-Version Highlights

## v0.7.40
Leave/menu and lobby details hotfix.
- Leave and Leave Game reset the player’s multiplayer session before exiting.
- Default exit target changed back to the WarHeads game main menu first.
- Website fallback remains `https://elementalspark.com/#warheads`.
- Re-fixed outside-game Server Details button.
- Details panel now stays open through lobby refreshes.

## v0.7.41
Performance, OAT, mobile, and server config expansion.
- Added recurring cleanup for leftover gameplay objects and VFX.
- Added OAT fly mode.
- Added OAT delay and payload stage support.
- Fixed No Fly behavior.
- Added Experimental pack.
- Added Terrain Mass Maker.
- Added planet styles.
- Added Mobile menu style.
- Added Edit Server / expanded host config options.

## v0.7.42
Menu scale, shape styles, and readability.
- Improved menu scaling for non-fullscreen users.
- Improved readability and contrast.
- Fixed yellow-on-yellow UI.
- Added shaped UI styles and planet style names.
- Improved multiplayer lobby/server readability.

## v0.7.43
Shot crash and Experimental pack fix.
- Fixed `recordWeaponChoiceForSlot is not defined`.
- Experimental pack no longer generates all OAT weapons.
- Mixed Experimental behavior restored across STAGED / SNIPER / OAT.

## v0.7.44
Lobby server editor cleanup.
- Removed huge vertical Apply Server Settings button.
- Kept core Host Options visible.
- Moved heavy settings into Advanced Edit.
- OAT settings moved back to Weapon Editor behavior instead of server options.

## v0.7.45
HUD safe-zone and focus resume.
- Moved utility controls out of top HUD/title lanes.
- Added focus-resume guards for tabbing out and back.
- Re-syncs room/turn/control state after focus returns.
- Clears stale shot locks when server says turn is idle.

## v0.7.46
Room layout and Advanced Edit modal.
- Advanced Edit opens as a real modal/window.
- Multiplayer room layout made wider and cleaner.
- Advanced settings moved into a popup.
- Added close/backdrop/Escape behavior.

## v0.7.47
HUD/menu return and late-join queue fix.
- Added Return To Game from in-match menu.
- Escape returns to match.
- Moved lower-HUD utility controls.
- Improved late-join queue processing.

## v0.7.48
Room layout and Advanced modal correction.
- Compact wide room layout.
- Advanced server settings moved out of the visible Host Options column.
- Advanced Edit appended as detached modal.
- Added multiplayer CSS/JS cache busting.

## v0.7.49
Late-join next-turn behavior.
- Late joiners no longer wait for a full cycle.
- Late joiners enter after the current turn finishes.
- Their first turn is skipped, then they enter normal rotation.
- Updated messaging from “next cycle” to “after current turn.”

## v0.7.50
Server menu parity.
- Server setup rebuilt to feel closer to the main menu.
- Added Server Defaults on Create Game.
- Host settings can carry over automatically.
- Added wide Server Editor with pages/tabs.
- Server Details shows applied settings.

## v0.7.51
Fire button and shot timing.
- Fire locks immediately on first click.
- Button mashing cannot send duplicate shot requests.
- Multiplayer running poll improved.
- Stale Fire locks clear more reliably.
- Shot launch delay reduced.

## v0.7.52
Turn sync authority and host terrain batch.
- Multiplayer turn advancement made server-authoritative.
- Added stale/duplicate turn-finish protection.
- Rehydrated player weapon loadout when multiplayer starts and when gaining turn.
- Added Host Tools terrain batch slider from 1 to 20.
- Default terrain batch is 8.

## v0.7.53
Multiplayer turn settle and server stability.
- Kept server-authoritative turns but reduced strict waiting.
- Reduced PHP polling pressure.
- Normal polls no longer rewrite room state constantly.
- Compacted multiplayer state to prevent long-match bloat.
- Added short forced settle window so one slow client cannot stall everyone.
- Preserved host-spawned/generated planets during state compaction.

## v0.7.54
Weapon pack persistence and multiplayer pack choice.
- Custom/edited weapons remain visible.
- New and modified weapons stay in Default + My Weapons.
- Last selected pack is remembered.
- Multiplayer lobby gained Your Weapon Pack selector.
- Room records store player pack labels.

## v0.7.55
Create-server and pack-choice repair attempt.
- Addressed create-server break from new pack selector flow.
- Started moving toward safer per-player pack assignment.

## v0.7.56
Stable sync, player packs, and room chat.
- Rolled risky pack/server changes back onto stable v0.7.53 sync baseline.
- Restored smoother shot/turn sync.
- Added happy-medium catch-up delay.
- Restored stable shooting.
- Fixed server creation.
- Added per-player weapon pack selection.
- Added room chat slideout near Host Options.

## v0.7.57
Host pack, instant fire, and in-game chat.
- Fixed host pack reset toward Experimental.
- Added per-player pack update action.
- Added room pack selector for the host.
- Host fire feels closer to local play.
- Added in-game room chat slideout.

## v0.7.58
Host pack and near-local fire stability.
- Host pack no longer snaps back to Experimental.
- Host room pack selector is authoritative before launch.
- Creating a room reapplies host selected pack.
- Saving weapons no longer switches to odd pack paths.
- Near-local fire path improved for active player.

## v0.7.59
Mobile retention and kicked-player recovery.
- Mobile players are less likely to be dumped to main menu during active play.
- Added room recovery path for mobile/browser throttling.
- Increased idle tolerance.
- Kicked/banned active players no longer lock the turn.
- Server normalizes invalid active players.

## v0.7.60
Mobile interface attempt.
- Added mobile/touch menu styling and layout changes.
- Later rolled back because mobile routing became unstable.

## v0.7.61
Terrain crater and napalm scale fix.
- Removed persistent crater rings.
- Improved terrain cutouts.
- Napalm now eats into terrain over time.
- Explosion sizes tightened.
- Very large blasts reduced to saner terrain bites.

## v0.7.62
Mobile menu routing attempt.
- Tried full mobile menu page routing.
- Later rolled back because it broke mobile launch/game visibility.

## v0.7.63
Lobby JSON/state recovery.
- Fixed lobby crash when `rooms.json` was `{}` or missing required keys.
- PHP now repairs damaged/empty multiplayer state.
- Client shows safer JSON error handling.
- Packaged clean default multiplayer state.

## v0.7.64
Mobile function rollback and JSON recovery.
- Removed risky v0.7.62 mobile routing.
- Kept JSON room crash recovery.
- Returned toward style-only mobile changes.

## v0.7.65
Mobile launch visibility attempt.
- Tried forcing mobile game iframe/canvas to front.
- Later replaced by a rollback because it still broke mobile flow.

## v0.7.66
Mobile menu rollback / stable recovery.
- Rebuilt from stable mobile/function baseline.
- Removed risky v0.7.60-v0.7.65 mobile routing/visibility changes.
- Restored working multiplayer mobile launch/menu flow.
- Kept JSON crash recovery.
- Kept terrain/crater/napalm cleanup.
- Kept host pack stability and stable sync/fire behavior.

## v0.7.67
Mobile viewport fit.
- Kept v0.7.66 working menu/game launch path.
- Changed only mobile viewport/menu fit layer.
- Mobile uses a centered desktop-style 75% scaled layout.
- Added support for Chrome mobile desktop-mode / browser zoom offsets.
- Re-enabled browser pinch zoom.
- Kept game canvas pinch zoom behavior intact.
- No gameplay, sync, weapon, pack, terrain, planet, or multiplayer logic changes.

---

# Current Notes For Testers

## Best Things To Test
- Create a multiplayer room.
- Join from desktop and mobile.
- Confirm mobile menu is centered and usable.
- Confirm the game launches visibly on mobile.
- Confirm players can select their weapon packs.
- Confirm host pack does not reset to Experimental.
- Confirm custom weapons stay visible.
- Confirm Fire responds quickly.
- Confirm turns do not lock after someone leaves or is kicked.
- Confirm late join enters after the current turn and skips the first possible turn.
- Confirm room JSON/lobby survives refreshes and empty state files.
- Confirm terrain generation and cleanup do not make the server slow over time.

## Known Development Direction
- Keep mobile changes style-only unless absolutely necessary.
- Do not replace working launch flow.
- Keep server/menu behavior close to the main WarHeads menu style.
- Preserve stable multiplayer sync over experimental UI rewrites.
- Avoid touching working code paths unless the fix directly requires it.

---

# Credits
WarHeads Classic Enhanced  
Developed by Elemental Spark  
Website: www.elementalspark.com
