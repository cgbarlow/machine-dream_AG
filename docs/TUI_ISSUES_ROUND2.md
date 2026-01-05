# TUI Issues - Round 2

**Date:** 2026-01-05
**Environment:** VSCode Terminal
**Status:** Investigating

## Issues Identified from Screenshot

### 1. ❌ Menu Items Missing Shortcuts
**Observed:** Menu shows only icon + name (e.g., "🧩 solve", "💾 memory")
**Expected:** Should show "🧩  solve        [S]", "💾  memory       [M]"
**Impact:** Users don't know keyboard shortcuts
**Possible Cause:** getMenuItems() not being called correctly or menu formatting issue

### 2. ❌ Header Not Visible
**Observed:** No header showing "Machine Dream TUI" title
**Expected:** Should see header with title at top
**Possible Cause:** Header height/positioning issue or not rendering

### 3. ❌ Menu Label Shows Raw Tags
**Observed:** Label shows "Menu {yellow-fg}" instead of formatted text
**Expected:** Should show "Menu (focused)" with yellow text
**Possible Cause:** `tags: true` not set on menu element, or VSCode terminal doesn't support blessed tags

### 4. ❌ Content Panel Navigation Not Working
**Observed:** User can Tab to content but can't navigate within it
**Expected:** Should be able to scroll/navigate content
**Possible Cause:** Content is a box, not a list - needs different key handling

### 5. ❌ F-Keys Not Working
**Observed:** F1, F2, F3, etc. do nothing
**Expected:** F1 = Help, F10 = Menu toggle, etc.
**Possible Cause:** VSCode terminal may not pass F-keys through, or blessed not binding them

### 6. ⚠️ Terminal Environment Detection
**New Code Added:** Terminal detection in environment.ts to fix 'terminfo parse error'
**Need to Review:** Whether environment detection is interfering with rendering

## VSCode Terminal Specifics

VSCode's integrated terminal has known limitations:
- May not support all blessed features
- F-keys might be captured by VSCode
- Some escape sequences may not work
- Tag rendering might be disabled

## Investigation Plan

1. Check if menu items are being generated with shortcuts
2. Verify header is being created and added to screen
3. Fix tag rendering (use plain text for labels in VSCode)
4. Add proper content scrolling support
5. Test alternative to F-keys (Ctrl+H for help, etc.)
6. Review environment.ts for conflicts

## Next Steps

- Log the menu items being generated
- Check screen children to see what's rendered
- Add VSCode-specific fallbacks
- Improve content area interactivity
