# WarHeads Classic Enhanced - How To Play

This guide covers the current v0.7.5 ultra early-access build of WarHeads Classic Enhanced.

## Goal

Destroy the other ships while surviving the planet field. Shots are affected by gravity, terrain, wind, defenses, and weapon stages.

Each player takes a turn. Aim, choose power, select a weapon and defense, then fire. If a shot misses, the game uses the selected missed-shot rule: Teleport Wrap or Wall Bounce Classic.

## Main Menu

The main menu is where you set up a match.

- Players: chooses the number of ships in the match.
- Turn Length: sets how long each player has before the game forces an automatic action.
- Missed Shots: chooses how shots behave when they leave the world.
- Add Saved Pack: lets the player include saved `(P)` weapons alongside generated weapons.
- Create A Pack For Me: starts a game with generated weapons for the player and bots.
- 5 Minute Weapon Editor: opens the Weapon Editor first, then starts the match when the timer ends.
- Options: opens extra match tuning options.
- Weapon Editor: opens the editor without starting a running match.

## Options Menu

Options are match-level settings.

- UFO Events: Off, Rare, Occasional, or Chaos Test.
- Max UFOs: limits how many UFOs can be on screen at once.
- Boss Chance: controls whether rare boss UFO events can happen.
- Main Menu: closes the options panel.

For normal play, keep UFO Events on Rare and Boss Chance on Very Rare.

## Game Screen

The top HUD shows:

- Player and enemy health bars.
- Turn timer.
- Current turn state.
- Damage dealt and damage taken.
- Version number and early-access message.

The bottom HUD shows:

- Angle.
- Power.
- Current weapon.
- Current defense.
- Current zoom.
- Weapon dropdown.
- Weapon Editor button.
- Defense dropdown.
- Zoom out and zoom in buttons.
- Fire button.

## Controls

- Angle slider: changes the firing angle.
- Power slider: changes launch power.
- Weapon dropdown: selects your current weapon.
- Defense dropdown: selects your active defense.
- Fire: launches the selected weapon.
- Zoom buttons: zoom in and out.
- Drag on the battlefield: pans the camera.
- Mouse wheel or touchpad scroll: zooms the battlefield.

## Turn Flow

1. Choose a weapon.
2. Choose a defense.
3. Adjust angle and power.
4. Press Fire.
5. Your ship says a short sci-fi insult.
6. The shot launches.
7. The camera follows the shot.
8. Damage and terrain changes resolve.
9. The next ship takes its turn.

Bots choose a weapon and defense automatically.

## Terrain And Planets

Planets are the main terrain. They can be damaged, cratered, tunneled, burned, grown, or destroyed.

Important terrain behavior:

- Explosions cut craters into planets.
- Napalm burns away terrain.
- Terrain Build grows terrain at the impact point or creates a new small planet-like mass.
- Splitter shots create tunnel marks while splitting underground.
- If planets are too broken, the game can create new planets.
- Planet creation is capped so the match does not flood the map.

## Gravity

Planets pull shots toward them. A shot can curve, orbit, miss, wrap, bounce, or crash depending on its speed and position.

Tips:

- Low-power shots are easier to bend with gravity.
- High-power shots are better for deep splitter tunnels.
- Big planets have stronger influence.
- Wind can slightly change long-range shots.

## Defenses

### Repel Field

Pushes nearby incoming shots away from the ship.

Use it when you expect slow gravity-bent shots or cluster fragments.

### Bounce Field

Reflects close shots and can send them back into danger.

Use it when enemies are firing direct shots.

### Portal Command

When a shot gets too close, the threatened ship can jump to another planet.

Use it when you want an escape chance against big slow weapons.

## Weapon Editor

The Weapon Editor lets you build custom weapons from stages.

Editor controls:

- Name: weapon name.
- Shot Type: choose Staged or Sniper.
- Stage list: every row is one weapon stage.
- Add Stage: adds another stage.
- Weapon JSON: shows the weapon definition.
- New: starts a new weapon.
- Clone: duplicates the current weapon.
- Load JSON: imports JSON from the text box.
- Export: dumps all known weapons into the text box.
- Save: saves the current weapon and equips it.
- Main Menu: returns to the main menu.
- Close: closes the editor.

Player-made weapons are marked with `(P)`.

If you leave the name blank, the game gives the custom weapon a procedural name and adds `(P)`.

## Weapon JSON Basics

A weapon is made of:

- id: internal weapon id.
- name: display name.
- type: `sniper` or `staged`.
- color: tracer and VFX color.
- playerMade: whether it should be marked as a player weapon.
- stages: the list of weapon effects.

A stage is made of:

- action: the stage type.
- delay: when the stage happens.
- radius: effect size.
- damage: ship damage.
- count: number of sub-effects.

Values are clamped so a weapon cannot create absurd counts or runaway sizes.

## Weapon Types

### Sniper

A single warhead-style shot. This is always the first/default slot.

Use it for clean aiming and predictable damage.

### Explode

Creates a normal explosion crater and damages nearby ships.

Use it as the basic finishing stage of a weapon.

### Burst

Creates multiple small explosions around the impact area.

Use it to widen damage or chew up terrain.

### Split

Splits into several outward shots.

Use it for spread damage after a main impact.

### Dig

Cuts into terrain with a focused digging effect.

Use it for planet damage and tunnel-like impact results.

### Laser

Creates beam effects and laser-style damage.

Use it for flashy direct-hit or chaos weapons.

### Build

Grows terrain at the impact point or creates new terrain.

Use it for cover, blocking lines, or changing the battlefield.

### Napalm

Burns and eats away terrain.

Use it to strip planet surfaces or expose ships.

### Magnet

Pulls nearby ships toward the impact point.

Use it to drag ships into danger or away from safe terrain.

### Orbit

Places a shot into orbit around a planet before it drops.

Use it when you want delayed, dramatic gravity-based hits.

### Splitter

Hits a planet, boosts forward, tunnels through it, splits underground up to 3 times, slows with each split, and tries to exit the other side.

If it exits with enough speed, the cloned shots keep flying under normal physics. If it slows too much while still inside, it detonates inside the planet.

Use high power for splitter shots. Slow splitter shots are meant to become underground destruction instead of clean exits.

### Walker

Drops a walking payload on a planet. It travels around the surface and detonates when it reaches a target or times out.

Use it when a ship is hiding behind terrain on the same planet.

### Fly

Launches several independent flying sub-shots.

Use it to spread pressure across the field.

### Whiteout

Creates a bright charging orb and a massive explosion.

This is extremely powerful and can launch ships away from planets. Each player gets one real Whiteout per game. After that, extra Whiteout attempts fizzle.

### Homing

Creates a shot that steers toward a target for a limited time.

Use it when direct aim is hard.

### Spread

Launches shots in a controlled spread.

Use it for medium-wide coverage.

### Shotgun

Launches a tighter but more forceful spread.

Use it at closer ranges.

### Warburst

Throws random warheads outward in a full pattern.

Use it for chaos and large-area battlefield disruption.

### Cluster

Takes staged payloads and launches them outward.

Use it for complex custom weapons where each stage becomes part of a spread.

### Wave

Launches shots in a wave-like pattern.

Use it to sweep across terrain.

### Machine

Fires repeated sub-shots over time.

Use it to pressure a region instead of relying on one big blast.

## Weapon Building Tips

- Put Sniper-style simple weapons first if you want predictable play.
- Put Build before defensive or delay stages to create cover.
- Use Napalm before Explode to soften terrain.
- Use Magnet before Explode to pull ships into the blast.
- Use Orbit with a long delay for dramatic planet drops.
- Use Splitter only when you can shoot fast enough to cross the planet.
- Keep Whiteout rare because it can swing a match hard.
- Mix small and medium explosions instead of stacking only large ones.

## Recommended Starter Weapons

- Sniper: simple direct shot.
- Terrain Build: creates cover.
- Napalm: burns surface terrain.
- Core Splitter: tunnels through planets.
- Walker: hunts around a planet surface.
- Magnet: pulls ships out of safety.
- Orbit Drop: delayed gravity-based strike.
- Whiteout: one-time power weapon.

## Early Access Notes

This build is intentionally experimental. Expect weapon balance, AI, visuals, mobile layout, and event pacing to change as WarHeads Classic Enhanced grows.


## Custom Music
Use Options to turn music on/off, change volume, or choose a track. For hosted/web builds, drop .ogg/.mp3/.wav files into the MUSIC folder and list them in MUSIC/playlist.json.


## Local Modding

Open **Options > Advanced** to tune gameplay, physics, planets, VFX/audio caps, and bot behavior. Use **Export Settings JSON** to share a preset. Drop hosted custom assets into MUSIC, SOUNDS, TEXTURES, PARTICLES, SCRIPTS, or OTHER.
