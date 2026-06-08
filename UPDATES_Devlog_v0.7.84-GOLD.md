# WarHeads Classic Enhanced v0.7.84 GOLD

Gold chat + permanent weapon-save recovery from v0.7.83.

## Fixed
- Restored the working in-game room chat behavior.
- Desktop chat is again the right-side slideout with the small CHAT button.
- Desktop chat button highlights/pulses when new messages arrive while closed.
- Mobile uses the left in-game CHAT button to open the same room chat panel.
- Removed the placeholder chat message behavior.
- Prevented duplicate desktop/mobile chat controls from showing at the same time:
  - desktop: right-side slideout button
  - mobile: left in-game CHAT button

## Fixed Weapon Editor Save
- Weapon edits are now saved as permanent custom weapon updates again.
- Save Weapon now:
  - updates the saved weapon in `weaponDefs`
  - persists it to localStorage
  - re-equips it to the active player/loadout
  - keeps it selected after save
  - updates the weapon price/credit display immediately
- This restores the expected behavior where reopening the editor shows the edited weapon instead of the old/pre-edit version.

## Preserved
- v0.7.83 editor rollback baseline.
- Static GOLD version label.
- Current gameplay/UIX baseline.
