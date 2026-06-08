# WarHeads Classic Enhanced v0.7.70

Stability cleanup build from v0.7.69.

## Weapon Pack Cleanup
- Removed duplicate `Default + My Weapons` entries from the player pack selector.
- Added startup pack migration that cleans old duplicated pack records from local browser storage.
- `Default + My Weapons` is now treated as one automatic computed pack, not a saved pack that can clone itself.
- Bot packs/internal bot choices are no longer saved into the user/player pack list.
- Custom/edited weapons remain included in `Default + My Weapons` without creating another duplicate pack.
- Saving while editing `Default + My Weapons` no longer creates a new duplicate default pack.
- Multiplayer pack selectors now dedupe by ID and display name.

## Multiplayer Lobby Safety / Visibility
- Added a lobby sideboard showing rooms and player names so players can see who is in each room before joining.
- Added client-side mute controls for player chat.
- Room chat and lobby chat messages now include sender IDs so mutes persist more reliably.
- Players can mute/unmute from chat messages and room player rows.
- Mutes are local to the viewer and do not affect the server or other players.

## Multiplayer Stability Sweep
- Confirmed the broken timeout auto-shot branch from v0.7.68 remains removed.
- Kept the v0.7.69 stable turn rollback rules.
- Kept explicit leave/removal recovery so active players leaving do not lock the game.
- Kept room JSON recovery and clean packaged multiplayer state.

## Preserved
- v0.7.67 mobile viewport fit / browser pinch zoom support.
- v0.7.61 crater/napalm cleanup.
- v0.7.58+ host pack stability path.
- Stable multiplayer sync/fire behavior from the working branch.
- In-game room chat slideout.
