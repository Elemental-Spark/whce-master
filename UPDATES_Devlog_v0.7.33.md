# WarHeads Classic Enhanced v0.7.33

Emergency multiplayer turn/UI/render hotfix.

- Fixed multiplayer planet drawImage crash caused by JSON-synced cached planet textures.
- Multiplayer now rehydrates planet textures safely after state sync.
- Moved LEAVE GAME overlay away from in-game Menu / Weapon Editor / Close buttons.
- Waiting players now have aim/fire/weapon/defense controls locked and greyed out.
- Weapon Editor remains available while waiting.
- Saving/editing a weapon during another player's turn no longer grants fire access until it is actually that player's turn.
- Multiplayer turn authority still controls who can fire.
- Version updated to v0.7.33.

Main game remains isolated. Multiplayer remains under warheads/multiplayer/.
