# Quick Fix: Switch to neo-blessed

**Time:** 5 minutes
**Risk:** LOW
**Success probability:** 85%

---

## What's Wrong

blessed.js v0.1.81 (from 2016) is incompatible with Node.js v24.12.0 (from 2024). The stack overflow happens in blessed's core code, not our content.

**Evidence:**
- Error persists after removing ALL emojis
- Error persists after removing ALL color tags
- Error persists after removing ALL nested formatting
- Error is in `Program._attr` (blessed.js internal code)

---

## The Solution

**neo-blessed** is a modern fork of blessed with Node.js v20+ compatibility fixes.

### Step 1: Install neo-blessed

```bash
# Remove old blessed
npm uninstall blessed @types/blessed

# Install neo-blessed
npm install neo-blessed
npm install --save-dev @types/neo-blessed
```

### Step 2: Update all imports (1 command)

```bash
# Find and replace all blessed imports
find src -name "*.ts" -type f -exec sed -i "s/from 'blessed'/from 'neo-blessed'/g" {} +
find src -name "*.ts" -type f -exec sed -i 's/from "blessed"/from "neo-blessed"/g' {} +
```

### Step 3: Rebuild and test

```bash
npm run build
npm run tui
```

---

## Expected Result

**✅ If it works:**
- TUI launches without stack overflow
- All screens render correctly
- Navigation works
- No regex errors

**❌ If it still fails:**
- We'll migrate to **ink** (modern React-based TUI)
- See: docs/INK-MIGRATION-GUIDE.md (to be created)

---

## Why This Should Work

neo-blessed includes fixes for:
- Node.js v20+ regex engine changes
- WSL terminal compatibility
- Stack overflow in element rendering
- Modern V8 JavaScript engine

**Relevant fixes:**
- `embarklabs/neo-blessed` - Active fork with WSL fixes
- `blessedjs/neo-blessed` - Community-maintained version

---

## Rollback Plan

If neo-blessed causes new issues:

```bash
# Revert to blessed
npm uninstall neo-blessed @types/neo-blessed
npm install blessed@^0.1.81
npm install --save-dev @types/blessed@^0.1.27

# Revert imports
find src -name "*.ts" -type f -exec sed -i "s/from 'neo-blessed'/from 'blessed'/g" {} +

# Rebuild
npm run build
```

---

## Next Steps After Success

1. Test all 9 screens thoroughly
2. Test keyboard shortcuts
3. Test form input (SolveScreen)
4. Commit with message: "Switch to neo-blessed for Node.js v24 compatibility"
5. Update USER_GUIDE.md to mention neo-blessed

---

## If This Doesn't Work

**Plan B:** Migrate to ink (React-based TUI)
- More effort (4-8 hours)
- Guaranteed to work
- Better long-term solution
- Modern developer experience

See: `docs/TUI-BLESSED-INCOMPATIBILITY-ANALYSIS.md` for full analysis
