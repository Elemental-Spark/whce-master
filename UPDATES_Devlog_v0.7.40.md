# WarHeads Classic Enhanced v0.7.40

## Multiplayer Leave/Menu + Lobby Details Hotfix

Tiny follow-up from v0.7.39.

### Fixed
- Explicit **LEAVE** / **LEAVE GAME** now resets the player's multiplayer session before exiting, so manual leave does not accidentally auto-rejoin the same running match.
- Default multiplayer exit target is now the WarHeads game main menu first.
- If the WarHeads menu target cannot be reached, the exit fallback remains `https://elementalspark.com/#warheads`.
- Lobby/server **DETAILS** buttons now persist their open/closed state through PHP polling refreshes.
- Lobby details clicks now stop event bubbling and use button type/ARIA state so the button cannot be swallowed by row refresh or form behavior.

### Preserved
- v0.7.35 HOST TOOLS drawer.
- v0.7.36 Host Options checkbox/dropdown persistence.
- v0.7.37 multiplayer sync/identity protections.
- v0.7.38 late-join queue/session behavior.
- v0.7.39 camera zoom/manual control behavior.
- Main file remains `index.html`.
- Multiplayer remains isolated under `warheads/multiplayer/`.
