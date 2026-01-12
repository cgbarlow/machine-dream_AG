# Documentation Reorganization Suggestions

**Date:** 2026-01-13
**Purpose:** Suggested cleanup and reorganization for better maintainability
**Note:** This is a suggestion only - no files should be deleted or moved without review

---

## Executive Summary

The project has accumulated 41 documentation files in `docs/` root, many from development phases that are now complete. Suggested reorganization would:

1. **Archive historical development docs** (Week 1/2 progress, phase completions)
2. **Consolidate TUI debugging docs** (10+ files about TUI migration issues)
3. **Move planning docs** to archive (implementation now complete)
4. **Clean up root directory** test files

**Impact:** Reduces docs/ root from 41 files to ~10 essential files, improving discoverability.

---

## Root Directory Cleanup

### Files to Keep (Essential)

| File | Purpose | Action |
|------|---------|--------|
| `CLAUDE.md` | Project instructions for Claude Code | ✅ Keep |
| `README.md` | Main project documentation | ✅ Keep |
| `package.json` | NPM configuration | ✅ Keep |
| `package-lock.json` | Dependency lock | ✅ Keep |
| `tsconfig.json` | TypeScript configuration | ✅ Keep |
| `.eslintrc.json` | Linting rules | ✅ Keep |
| `.gitignore` | Git ignore rules | ✅ Keep |
| `.env.example` | Environment template | ✅ Keep |
| `.machine-dream.json` | Runtime configuration | ✅ Keep |

### Files to Consider Archiving/Removing

| File | Purpose | Suggestion |
|------|---------|------------|
| `test-cli.js` | Legacy CLI test script | ⚠️ Archive if superseded by `npm test` |
| `test-tui.js` | Legacy TUI test script | ⚠️ Archive if superseded by `npm test` |

### Directories to Keep

| Directory | Purpose | Action |
|-----------|---------|--------|
| `src/` | Source code | ✅ Keep |
| `tests/` | Test suite (310 tests) | ✅ Keep |
| `scripts/` | Batch testing scripts | ✅ Keep |
| `puzzles/` | Puzzle collection | ✅ Keep |
| `docs/` | Documentation (needs cleanup) | ✅ Keep (reorganize) |
| `node_modules/` | Dependencies | ✅ Keep (git ignored) |
| `dist/` | Build output | ✅ Keep (git ignored) |

### Runtime Output Directories (Git Ignored)

| Directory | Purpose | Action |
|-----------|---------|--------|
| `ab-test-results/` | A/B test outputs | ✅ Keep (add to .gitignore if not present) |
| `comprehensive-results/` | Comprehensive test outputs | ✅ Keep (add to .gitignore if not present) |
| `logs/` | Runtime logs (empty) | ⚠️ Consider removing if unused |
| `screenshots/` | Screenshots (empty) | ⚠️ Consider removing if unused |

---

## Docs Directory Reorganization

### Current Structure (41 files in root)

```
docs/
├── adr/                          # ✅ Active (Architecture Decision Records)
├── specs/                        # ✅ Active (15 formal specifications)
├── research/                     # ✅ Active (Research documentation)
├── reports/                      # ✅ Active (Performance reports)
├── features/                     # ✅ Active (Feature documentation)
└── [41 files in root]            # ⚠️ Needs organization
```

### Proposed Structure

```
docs/
├── README.md                     # Overview of documentation
├── USER_GUIDE.md                 # ✅ Main user guide
├── cli-reference.md              # ✅ CLI command reference
├── WEEK2-COMPLETION-REPORT.md    # ✅ Latest milestone (keep for now)
├── continuous-machine-thinking-research.md  # ✅ Core research
├── poc-strategy-report.md        # ✅ Core research
│
├── adr/                          # ✅ Architecture Decision Records
│   ├── README.md
│   └── [10 ADR files]
│
├── specs/                        # ✅ Formal Specifications
│   └── [17 spec files]
│
├── research/                     # ✅ Research Documentation
│   └── hardest-sudoku-puzzles.md
│
├── reports/                      # ✅ Performance Reports
│   ├── accuracy-comparison-20260110.md
│   └── performance-analysis-20260110.md
│
├── features/                     # ✅ Feature Documentation
│   └── llm-reasoning-tokens.md
│
├── archive/                      # 📦 NEW: Historical Documents
│   ├── development/              # Week progress, phase completions
│   ├── tui-migration/            # TUI debugging and migration docs
│   ├── planning/                 # Early planning documents
│   └── integration/              # Integration analysis docs
│
└── [Remaining reference docs]    # Analysis, testing guides
```

---

## Suggested Archive Categories

### 1. Development Progress (Archive → `docs/archive/development/`)

**Week 1 Progress (6 files):**
- `week1-STATUS.md`
- `week1-completion-report.md`
- `week1-day1-summary.md`
- `week1-day2-FINAL-summary.md`
- `week1-day2-summary.md`
- `week1-remaining-tasks.md`

**Week 2 Progress (5 files):**
- `week2-day2-summary.md`
- `week2-day3-summary.md`
- `week2-day4-summary.md`
- `week2-day5-audit.md`
- `week2-progress.md`

**Phase Completions (4 files):**
- `PHASE_3_COMPLETE.md`
- `PHASE_4_COMPLETE.md`
- `phase3-testing-summary.md`
- `phase4-cli-wiring-summary.md`

**Other Development Docs (2 files):**
- `debug-analysis-day1.md`
- `session-summary-2026-01-06.md`

**Rationale:** These are historical records valuable for project history but not needed for current development. Keep WEEK2-COMPLETION-REPORT.md in root as the latest milestone.

### 2. TUI Migration/Debugging (Archive → `docs/archive/tui-migration/`)

**TUI Debugging/Migration (10 files):**
- `INK-POC-READY.md`
- `NEO-BLESSED-FAILURE-ANALYSIS.md`
- `QUICK-FIX-NEO-BLESSED.md`
- `TUI-BLESSED-INCOMPATIBILITY-ANALYSIS.md`
- `TUI-CLI-INTEGRATION-STATUS.md`
- `TUI-DREAM-INTEGRATION-COMPLETE.md`
- `TUI-NEO-BLESSED-READY.md`
- `TUI-STACK-OVERFLOW-FIX.md`
- `TUI-TEST-NOW.md`
- `CLI-BACKEND-INTEGRATION-REFERENCE.md`

**Rationale:** TUI is now experimental and these are debugging records from the migration process. Valuable for historical context but not needed for current development.

### 3. Planning & Requirements (Archive → `docs/archive/planning/`)

**Planning Documents (6 files):**
- `IMMEDIATE_ACTION_CHECKLIST.md`
- `PRODUCTION_ACTION_PLAN.md`
- `PRODUCTION_READINESS_REPORT.md`
- `PRODUCTION_READINESS_SUMMARY.md`
- `implementation_plan.md`
- `specification-plan.md`

**Rationale:** These were planning documents for Week 2 implementation. Goals are now achieved (310 tests passing, zero mocks). Keep for historical reference but archive to reduce clutter.

### 4. Analysis & Integration (Archive → `docs/archive/integration/`)

**Integration/Analysis Documents (6 files):**
- `LLM_INTEGRATION_PLAN.md`
- `agentdb-analysis.md`
- `reasoningbank-memory-analysis.md`
- `specification-consistency-review.md`
- `poc-critique_gemini.md`
- `cli-testing-guide.md`

**Rationale:** These are analysis documents created during implementation planning. Integration is now complete. Valuable for understanding design decisions but not needed for day-to-day development.

---

## Files to Keep in Docs Root (10 Essential)

### Primary Documentation (2 files)
- `USER_GUIDE.md` - Main user documentation (52K)
- `cli-reference.md` - CLI command reference (24K)

### Current Milestone (1 file)
- `WEEK2-COMPLETION-REPORT.md` - Latest completion report (20K)

### Core Research (2 files)
- `continuous-machine-thinking-research.md` - Research basis (52K)
- `poc-strategy-report.md` - POC strategy (64K)

### Optional Reference Docs (Consider keeping in root or archiving)
These could stay in root for easy access or move to archive:
- `agentdb-analysis.md` (32K) - Useful reference
- `reasoningbank-memory-analysis.md` (16K) - Useful reference
- `specification-consistency-review.md` (24K) - Useful reference
- `cli-testing-guide.md` (16K) - Useful for testing
- `LLM_INTEGRATION_PLAN.md` (20K) - Reference for LLM work

**Total in Root:** 5 essential + 5 optional reference = 10 files (down from 41)

---

## Proposed Archive Structure

```
docs/archive/
├── README.md                     # Archive index with dates
│
├── development/                  # Development Progress
│   ├── week1/
│   │   ├── week1-STATUS.md
│   │   ├── week1-completion-report.md
│   │   ├── week1-day1-summary.md
│   │   ├── week1-day2-FINAL-summary.md
│   │   ├── week1-day2-summary.md
│   │   └── week1-remaining-tasks.md
│   ├── week2/
│   │   ├── week2-day2-summary.md
│   │   ├── week2-day3-summary.md
│   │   ├── week2-day4-summary.md
│   │   ├── week2-day5-audit.md
│   │   └── week2-progress.md
│   ├── phases/
│   │   ├── PHASE_3_COMPLETE.md
│   │   ├── PHASE_4_COMPLETE.md
│   │   ├── phase3-testing-summary.md
│   │   └── phase4-cli-wiring-summary.md
│   └── sessions/
│       ├── debug-analysis-day1.md
│       └── session-summary-2026-01-06.md
│
├── tui-migration/                # TUI Migration Records
│   ├── INK-POC-READY.md
│   ├── NEO-BLESSED-FAILURE-ANALYSIS.md
│   ├── QUICK-FIX-NEO-BLESSED.md
│   ├── TUI-BLESSED-INCOMPATIBILITY-ANALYSIS.md
│   ├── TUI-CLI-INTEGRATION-STATUS.md
│   ├── TUI-DREAM-INTEGRATION-COMPLETE.md
│   ├── TUI-NEO-BLESSED-READY.md
│   ├── TUI-STACK-OVERFLOW-FIX.md
│   ├── TUI-TEST-NOW.md
│   └── CLI-BACKEND-INTEGRATION-REFERENCE.md
│
├── planning/                     # Planning Documents
│   ├── IMMEDIATE_ACTION_CHECKLIST.md
│   ├── PRODUCTION_ACTION_PLAN.md
│   ├── PRODUCTION_READINESS_REPORT.md
│   ├── PRODUCTION_READINESS_SUMMARY.md
│   ├── implementation_plan.md
│   └── specification-plan.md
│
└── integration/                  # Integration Analysis
    ├── LLM_INTEGRATION_PLAN.md
    ├── agentdb-analysis.md
    ├── reasoningbank-memory-analysis.md
    ├── specification-consistency-review.md
    ├── poc-critique_gemini.md
    └── cli-testing-guide.md
```

---

## Implementation Steps (When Ready)

### Phase 1: Create Archive Structure
```bash
mkdir -p docs/archive/{development/{week1,week2,phases,sessions},tui-migration,planning,integration}
```

### Phase 2: Move Development Progress
```bash
# Week 1
git mv docs/week1-*.md docs/archive/development/week1/

# Week 2
git mv docs/week2-*.md docs/archive/development/week2/

# Phases
git mv docs/PHASE_*.md docs/phase*.md docs/archive/development/phases/

# Sessions
git mv docs/debug-analysis-day1.md docs/session-summary-*.md docs/archive/development/sessions/
```

### Phase 3: Move TUI Migration
```bash
git mv docs/{INK,NEO,TUI,QUICK,CLI-BACKEND}*.md docs/archive/tui-migration/
```

### Phase 4: Move Planning
```bash
git mv docs/{IMMEDIATE,PRODUCTION,implementation,specification-plan}*.md docs/archive/planning/
```

### Phase 5: Move Integration (Optional)
```bash
# Only if you want these archived
git mv docs/{LLM_INTEGRATION_PLAN,agentdb-analysis,reasoningbank-memory-analysis,specification-consistency-review,poc-critique_gemini,cli-testing-guide}.md docs/archive/integration/
```

### Phase 6: Create Archive README
```bash
# Create docs/archive/README.md with index of archived documents
```

### Phase 7: Update Main Docs README
```bash
# Update docs/README.md to reference archive
```

### Phase 8: Commit
```bash
git commit -m "docs: reorganize historical documentation into archive structure"
```

---

## Benefits of Reorganization

### Improved Discoverability
- Docs root reduced from 41 to 10 essential files
- Clear separation between active and historical docs
- Easier for new contributors to find relevant documentation

### Maintained History
- All historical documents preserved in organized archive
- Git history intact (using `git mv`)
- Easy to reference past decisions and progress

### Better Maintenance
- Active docs clearly identified
- Historical context available but not cluttering main directory
- Easier to keep documentation up-to-date

### Clearer Project State
- Current focus (LLM learning, batch testing) more evident
- Completed milestones (Week 2) highlighted
- Experimental features (TUI) clearly marked

---

## Alternative: Minimal Cleanup

If full reorganization is too much, consider this minimal approach:

### Keep in Root (Most Frequently Referenced)
- `USER_GUIDE.md`
- `cli-reference.md`
- `WEEK2-COMPLETION-REPORT.md`
- `continuous-machine-thinking-research.md`
- `poc-strategy-report.md`

### Archive Only Historical Progress
- Move `week1-*.md` and `week2-*.md` → `docs/archive/development/`
- Move `PHASE_*.md` and `phase*.md` → `docs/archive/development/`

### Archive TUI Debugging
- Move all `TUI-*.md` and `NEO-*.md` → `docs/archive/tui-migration/`

**Impact:** Reduces docs root from 41 to ~25 files with minimal effort

---

## Recommendations

### High Priority (Do Now)
1. ✅ Create `docs/archive/` structure
2. ✅ Move Week 1/2 progress docs to archive
3. ✅ Move phase completion docs to archive
4. ✅ Create archive README with index

### Medium Priority (Do Soon)
5. ⚠️ Move TUI debugging docs to archive (10 files)
6. ⚠️ Move planning docs to archive (6 files)
7. ⚠️ Update docs/README.md with new structure

### Low Priority (Consider Later)
8. 💡 Move integration analysis to archive (optional)
9. 💡 Remove empty directories (logs/, screenshots/)
10. 💡 Archive legacy test scripts (test-cli.js, test-tui.js)

---

## Notes

- **No Deletions:** All suggestions involve moving, not deleting
- **Git History:** Use `git mv` to preserve file history
- **Reversible:** Archive structure makes it easy to move files back if needed
- **Incremental:** Can implement in phases based on priority
- **Documentation:** Update main README to reference archive location

---

**Created:** 2026-01-13
**Status:** Proposal - Awaiting Review
**Next Step:** Review and approve reorganization plan
