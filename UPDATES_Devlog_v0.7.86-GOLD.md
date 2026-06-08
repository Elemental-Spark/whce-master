# WarHeads Classic Enhanced v0.7.86 GOLD

Full stability/code-audit pass built from v0.7.85 GOLD recovery.

- Fixed the experimental weapon-pack installer crash by mutating the constant default weapon array safely instead of reassigning it.
- Restored solid filled ship/sprite editor colors; no outline-only painted cells.
- Changed ship/sprite editor workboards to transparent-white/checker backgrounds so dark colors are visible.
- Reconnected the final stage executor to elemental/alien/environmental actions: fire, freeze, shock, infect, summon, vortex, acid, gravity, alien, plasma, meteor, and radiation.
- Removed the persistent browser credit storage path; credits are session/match settings only.
- Kept desktop multiplayer chat as a right-side slideout with new-message highlight; the in-game left chat button remains mobile-only.
- Hardened cluster/orbit stages so custom/editor-built weapons cannot crash if their payload list is empty or incomplete.
- Smoke-tested all 31 loaded weapons / 146 stages in both the main game and multiplayer game runtime with zero thrown stage errors.
- Rechecked single-player, Local LAN entry, multiplayer shell files, weapon editor, ship editor, sprite editor, JavaScript syntax, PHP syntax, and zip integrity.
