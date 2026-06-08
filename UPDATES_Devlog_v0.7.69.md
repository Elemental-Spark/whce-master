# WarHeads Classic Enhanced v0.7.69

## Turn rollback / stable cleanup hotfix

This build rolls back the risky v0.7.68 timeout auto-shot branch and returns multiplayer turn flow to the stable v0.7.67 path.

### Fixed

- Removed the server-side timeout auto-shot path that could fire before the correct turn.
- Removed the timeout branch that allowed non-active clients to finish/advance someone else’s turn.
- Restored the rule that only the active player, or the host for an actual bot turn, can submit turn-finished.
- Explicit Leave / Reset now removes the player from the running match instead of replacing them with a bot.
- If the active player leaves or is removed, the server normalizes the turn once and moves to the next valid participant.
- Kept per-player weapon pack handling from the stable branch.
- Kept mobile viewport fit, room JSON recovery, terrain/crater/napalm fixes, host pack stability, in-game chat, and stable multiplayer sync/fire behavior.

### Removed / cleaned

- Removed v0.7.68 missed-turn auto-shot server recovery. It was the cause of early shots, skipped turns, and turn advancement before shot animations settled.
- Removed timeoutAutoShot turn-finish bypass behavior.

### Notes

- Local active clients still auto-shoot when their own timer expires, as before.
- Disconnected/stale players are handled by validated server leave/timeout cleanup instead of random clients advancing the turn.
