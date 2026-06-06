# WarHeads Multiplayer Notes

v0.7.30 adds a website-hosted PHP polling multiplayer branch under `warheads/multiplayer/`.

Main GOLD files remain preserved. Multiplayer imports/uses cloned shared data and does not write into the main game folders.

For normal web hosting:
1. Upload the full package.
2. Make sure PHP is enabled.
3. Make sure `warheads/multiplayer/data/` is writable.
4. Open the main game and click MULTIPLAYER, or open `warheads/multiplayer/index.html` directly.

This branch is turn-based and intended for public testing. Later we can upgrade to a stronger server-authoritative stack if the web host supports Node/WebSockets or if we move the lobby server to a cloud host.
