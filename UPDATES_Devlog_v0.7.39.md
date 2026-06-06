# WarHeads Classic Enhanced v0.7.39

Camera control hotfix from v0.7.38.

## Fixed
- Manual mouse-wheel zoom no longer immediately snaps back because auto-follow was still locked to a ship/shot.
- Zoom In / Zoom Out now count as manual camera control and preserve the player-selected zoom amount.
- Drag/pan now fully breaks auto-follow so the camera does not force focus back to the active player.
- During active shot/warhead/walker sequences, manual zoom pauses camera auto-follow until the sequence is finished.
- When auto-follow resumes after a shot sequence, it preserves the user-selected zoom level.

## Preserved
- v0.7.35 HOST TOOLS drawer.
- v0.7.36 Host Options checkbox/dropdown persistence.
- v0.7.37 multiplayer sync / identity protections.
- v0.7.38 late-join queue/session behavior.
- Multiplayer remains isolated under warheads/multiplayer/.
- Main entry remains index.html.
