# WarHeads Classic Enhanced Website Multiplayer Branch v0.7.24

This multiplayer branch is isolated under `warheads/multiplayer/` and does not overwrite the GOLD single-player/LAN files.

## No npm required

This version is built for normal PHP-enabled web hosting. Upload the package to your web host and open:

`warheads/multiplayer/index.html`

The main menu MULTIPLAYER button also opens that page.

## Required host feature

Your web host must support PHP. The `warheads/multiplayer/data/` folder must be writable so rooms, chat, and turn events can be stored.

## How it works

This is a turn-based hosted lobby using PHP polling instead of Node/WebSockets. It is made for website hosting and public testing. The existing v0.7.22 main game remains untouched except for the menu button that opens this separate multiplayer folder.

## Safety

The lobby includes a starter name/chat moderation filter and safety warnings. Expand `blocked-names.json` for your server rules.
