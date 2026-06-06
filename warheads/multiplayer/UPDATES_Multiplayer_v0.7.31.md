# Multiplayer v0.7.31

Emergency restore from the working v0.7.24 PHP lobby flow.

- Keeps lobby, ready, room chat, and PHP polling flow intact.
- Starts all clients from the same room roster and seed.
- Uses selected human/bot counts exactly.
- Allows up to 16 humans and 8 bots.
- Bot turns are host-controlled and sync through room state.
- Disconnecting humans are replaced by bots.
- Planet textures are revived after multiplayer state sync to prevent drawImage crashes.
