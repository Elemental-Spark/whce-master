# WarHeads Classic Enhanced v0.7.33

Emergency multiplayer shared-room sync restore.

- Restored the hosted PHP multiplayer lobby/chat/ready flow from the working v0.7.24 base.
- Fixed multiplayer launch so all lobby players enter the same shared room game.
- Only the humans in the lobby plus the host-selected bot count are included in the match.
- Supports up to 16 human players and 8 bots.
- Randomizes the first turn between all humans and bots.
- Turn banner announces the active human or bot at the top.
- Removed the stray external "Send Shot" test button; multiplayer uses the normal in-game WarHeads FIRE controls.
- Re-added Reset Session for stuck browser/client sessions.
- Added Close Room for hosts.
- If a human leaves a running match, their slot is converted to a bot so the game can continue.
- Kept multiplayer isolated in `warheads/multiplayer/`.
- No Android source included.
