# WarHeads Classic Enhanced v0.7.36

## Room Settings Checkbox/Dropdown Hotfix

- Built from v0.7.35.
- Fixed Allow Spectators unchecking itself while the host is editing room settings.
- Fixed Allow Late Join unchecking itself while the host is editing room settings.
- Fixed Host Options dropdowns closing immediately during PHP polling.
- Prevented PHP polling from rebuilding/stomping active host room-setting controls.
- Apply Server Settings now sends and preserves the current humans, bots, turn length, missed-shot physics, late join, spectator, and mod settings cleanly.
- Preserved v0.7.33 GOLD shared multiplayer launch flow.
- Preserved v0.7.35 HOST TOOLS drawer.
- No gameplay, weapon, planet, bot, turn, or launch-flow rewrites.
- Main file remains index.html.
- Multiplayer remains isolated under warheads/multiplayer/.
