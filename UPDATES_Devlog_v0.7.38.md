# WarHeads Classic Enhanced v0.7.38

## Multiplayer late-join queue / one-session hotfix

Built from v0.7.37 and preserving:
- v0.7.33 GOLD shared multiplayer launch flow
- v0.7.35 HOST TOOLS drawer spacing fix
- v0.7.36 room settings checkbox/dropdown persistence fix
- v0.7.37 server timer / stale iframe message guards

### Fixed
- Late joiners no longer steal an existing active player slot.
- Late joiners are announced as queued: `playername has joined late` style room chat.
- Late joiners spectate the current turn cycle first.
- At the next full turn-cycle boundary, queued late joiners are added as real active participants.
- New late joiners are appended to the turn order and do not get an instant shot before the next cycle begins.
- Running clients sync the new roster into the existing game iframe instead of restarting the match.
- Multiplayer game bridge now has roster sync support so added/replaced players can appear without launching a second game instance.
- Rejoin/room state continues syncing planets and match state through server `stateSync` events.
- Leaving the multiplayer game now hard-clears the local iframe/session and redirects to `https://elementalspark.com/#warheads`.
- Room close / game-over cleanup now clears active players, spectators, and queued late joiners.

### Notes
- Browser tabs/windows that the player manually opened cannot be forcibly closed by JavaScript, but the game now clears its own iframe/session and redirects the current multiplayer page back to the WarHeads site fallback.
- No weapon, terrain, bot combat, planet generation, ship editor, or single-player gameplay changes were intended.
