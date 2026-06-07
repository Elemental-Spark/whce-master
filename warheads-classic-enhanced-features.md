# WarHeads Classic Enhanced - Feature Listing

WarHeads Classic Enhanced is an ultra early-access reboot of the classic turn-based space artillery formula, built around planets, gravity, destructible terrain, wild staged weapons, bots, and player-made weapon packs.

## Core Game

- Turn-based space artillery combat with local players and bots.
- Procedural planet fields with different planet sizes, colors, rings, and pixel-style surface details.
- Basic planetary gravity that bends shots around planets.
- Destructible terrain with crater cuts, tunneling marks, debris, and planet rebuilding when the field gets too damaged.
- Ships are procedural pixel spacecraft, generated per match.
- Ships can be knocked away and slowly pulled or warped back toward terrain if they get lost in space.
- Space wind affects shots and slowly drifts the starfield.
- Missed-shot behavior can be set to Teleport Wrap or Wall Bounce Classic.
- A 60-second default turn timer, with menu options for other turn lengths.

## Weapons

- Sniper is always the first/default shot slot.
- Weapons can be single-shot or multi-stage JSON weapons.
- Procedural weapon packs are generated for bots each game.
- Player-saved weapons are marked with `(P)` and stay available to the player.
- Staged weapons can chain multiple effects together for chaotic results.
- Splitter shots tunnel through planets, visually split underground, slow down per split, and either exit the planet or detonate inside.
- Terrain Build shots create or grow terrain, giving players defensive cover.
- Napalm eats away at terrain over multiple burns.
- Orbit shots circle a planet before dropping into the next effect.
- Walker shots drop a crawling alien-style payload onto a planet.
- Whiteout is a rare, powerful one-use weapon per player per game.
- Magnet shots can pull nearby ships toward the impact area, with a small chance for escape.

## Defenses

- Repel Field pushes incoming shots away.
- Bounce Field reflects close shots.
- Portal Command can relocate a threatened ship to another planet.
- Defenses are selected from the main control bar and remain active for the current ship.

## Weapon Editor

- In-game Weapon Editor for building custom JSON weapons.
- Add, delete, clone, load, save, and export weapons.
- Saved player weapons are immediately equipped and added to the game weapon list.
- Weapon JSON can be copied and shared later as a weapon pack format.

## Events

- Rare UFO flyby events can disrupt the battlefield.
- Very rare boss UFO events are supported.
- UFOs are capped to avoid runaway planet/event spawning.
- Bots focus on combat with their generated packs while players can use saved or generated packs.

## Visual Style

- Retro pixel spacecraft.
- Procedural pixel planets.
- Distinct shot silhouettes and tracer colors.
- Different VFX styles for explosions, napalm, terrain build, splitter tunnels, whiteout, beams, debris, and smoke.
- Clean mobile-friendly HUD built for scaling across screen sizes.

## Current Build Notes

- Version shown in-game: `v0.7.43`.
- Project name shown in-game: `WarHeads Classic Enhanced`.
- Announcement image title: `WarHeads Classic Enhanced`.
- This is ultra early-access and gameplay values are expected to change.


## v0.7.5 Additions
- More destructive but chunk-safe planet carving.
- Bigger planet build/repair effects.
- Four generated soft chiptune background tracks with Options volume/toggle controls.
- MUSIC folder support for hosted custom tracks.


## Advanced Mod Options

Options now includes an ADVANCED panel for local modding: gameplay variables, physics, planet rules, chaos caps, VFX/audio caps, asset folders, and import/exportable mod settings.

## v0.7.43 Additions
- Performance cleanup routine for leftover shots, debris, VFX, physics helpers, and old planet damage data.
- OAT / One At A Time weapon type beside STAGED and SNIPER.
- Experimental pack with 10 procedural 10-stage OAT weapons plus Terrain Mass Maker.
- MOBILE menu style and improved small-screen options/editor panels.
- Ten selectable graphical planet styles.
- Multiplayer host EDIT SERVER controls for cleanup, planet style, OAT, shots, particles, and planet cap.
