# WarHeads Classic Enhanced v0.7.31 — Emergency Multiplayer Restore

Built from the last known working v0.7.24 hosted PHP multiplayer base.

## Fixes

- Preserved the working lobby, ready, room chat, and hosted PHP polling flow.
- Fixed multiplayer game launch so all players start from the same shared room roster/seed.
- Fixed selected room counts so host-selected humans and bots are used exactly.
- Supports up to 16 human players and 8 bots in website multiplayer.
- Fixed the 1 player + 1 bot case so it launches as 1 human and 1 bot, not a bad fallback bot swarm.
- Added bot participants to the shared turn order at match start.
- Host safely runs bot turns and syncs the resulting state to the room.
- If a human leaves during a running match, that slot is replaced by a bot.
- Hardened multiplayer planet rendering after state sync so serialized planet textures cannot crash drawImage.
- Kept multiplayer isolated in warheads/multiplayer/.
- No Android source included.
