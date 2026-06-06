# WarHeads Classic Enhanced v0.7.37

Multiplayer sync / identity hotfix built forward from v0.7.36.

## Fixed

- Prevented the multiplayer client from launching/reloading the game iframe twice for the same running room.
- Ignored stale bridge messages from old iframe/game instances so an older launch cannot control the current match.
- Added server-authoritative turn start timestamps to room state.
- Added synced turn countdown display in the multiplayer overlay so clients stay closer together.
- Prevented non-active clients from locally auto-firing when their local timer reaches zero.
- Queued state-sync snapshots until the game iframe bridge is ready, improving rejoin/reload behavior.
- Fixed stuck `SHOT SENT` / frozen-controls behavior when the server rejects a shot as out-of-turn or duplicate.
- Changed running-match late joins so they spectate the current match instead of being injected into the active participant list mid-game.

## Preserved

- v0.7.33 GOLD shared multiplayer launch flow.
- v0.7.35 HOST TOOLS drawer.
- v0.7.36 room settings checkbox/dropdown persistence.
- `index.html` remains the main entry file.
- Multiplayer remains isolated under `warheads/multiplayer/`.
- No Android source included.
