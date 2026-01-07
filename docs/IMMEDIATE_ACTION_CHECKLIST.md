# Immediate Action Checklist - Week 1

**Project**: Machine Dream
**Priority**: CRITICAL
**Timeline**: 5 business days
**Goal**: Fix test failures and establish baseline quality

---

## Day 1: Test Failure Analysis

### Morning: Setup & Assessment
- [ ] Pull latest code: `git pull origin llm_integration`
- [ ] Clean install: `rm -rf node_modules && npm install`
- [ ] Run full test suite: `npm test -- --run`
- [ ] Document current test results:
  ```bash
  npm test -- --run > test-results-day1.txt 2>&1
  ```
- [ ] Review failing tests breakdown (52 failures)

### Afternoon: ProfileStorage Debug
- [ ] Read ProfileStorage implementation: `src/llm/profiles/ProfileStorage.ts`
- [ ] Read ProfileStorage tests: `tests/unit/profiles/ProfileStorage.test.ts`
- [ ] Identify root cause of 7 failures:
  1. Save and Load - profile persistence
  2. Profile Retrieval - count mismatch
  3. Delete Profile - incomplete deletion
  4. Export/Import - import logic
  5. Export/Import - overwrite logic
  6. Clear All - not clearing properly
- [ ] Create debugging plan for Day 2

**Deliverable**: Root cause analysis document

---

## Day 2: Fix ProfileStorage

### Morning: Core Persistence Logic
- [ ] Fix save/load implementation
- [ ] Fix profile count tracking
- [ ] Run save/load tests: `npm test -- ProfileStorage.test.ts`
- [ ] Verify fixes work

### Afternoon: CRUD Operations
- [ ] Fix delete operation
- [ ] Fix clearAll operation
- [ ] Test delete operations
- [ ] Test clear operations
- [ ] Run all ProfileStorage tests: Should see 0/7 failures

**Deliverable**: ProfileStorage tests passing

---

## Day 3: Export/Import & Remaining Tests

### Morning: Export/Import Fixes
- [ ] Fix export logic
- [ ] Fix import logic
- [ ] Fix import with overwrite
- [ ] Test export/import scenarios
- [ ] Verify all ProfileStorage tests pass (41 tests)

### Afternoon: Other Test Failures
- [ ] Run full test suite: `npm test -- --run`
- [ ] Identify remaining failures (should be 45 left)
- [ ] Categorize by module:
  - [ ] CLI tests
  - [ ] TUI tests
  - [ ] Integration tests
  - [ ] Unit tests
- [ ] Fix top 5 most critical

**Deliverable**: ProfileStorage 100% + progress on other tests

---

## Day 4: Test Stabilization

### Full Day: Fix Remaining Failures
- [ ] Fix CLI integration tests
- [ ] Fix TUI integration tests
- [ ] Fix unit test failures
- [ ] Run test suite every hour to verify progress
- [ ] Target: <10 failing tests by end of day

**Deliverable**: >95% test pass rate

---

## Day 5: Quality Assurance & CI Setup

### Morning: Final Test Fixes
- [ ] Fix last remaining test failures
- [ ] Verify 100% pass rate: `npm test -- --run`
- [ ] Run typecheck: `npm run typecheck`
- [ ] Run lint: `npm run lint` (fix critical errors)
- [ ] Document test coverage: `npm test -- --coverage`

### Afternoon: CI/CD Foundation
- [ ] Create `.github/workflows/ci.yml`:
  ```yaml
  name: CI
  on: [push, pull_request]
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: '20'
        - run: npm ci
        - run: npm run typecheck
        - run: npm test
        - run: npm run build
  ```
- [ ] Commit and push to trigger first CI run
- [ ] Verify CI passes on GitHub
- [ ] Enable branch protection (require CI to pass)

**Deliverable**: All tests passing + CI operational

---

## Success Criteria

By end of Week 1, you should have:
- ✅ **Zero failing tests** (272/272 passing)
- ✅ **CI/CD pipeline** running on GitHub Actions
- ✅ **Clean builds** (typecheck, test, build all pass)
- ✅ **Documentation** of test fixes and known issues

---

## Debugging Commands

### Run Specific Test File
```bash
npm test -- ProfileStorage.test.ts
```

### Run Tests in Watch Mode
```bash
npm test  # Interactive mode
```

### Run Tests with Verbose Output
```bash
npm test -- --reporter=verbose
```

### Check Test Coverage
```bash
npm test -- --coverage
```

### Debug Single Test
```bash
npm test -- -t "should save and load profiles"
```

### Run TypeScript Checks
```bash
npm run typecheck
```

### Check for Type Errors in Specific File
```bash
npx tsc --noEmit src/llm/profiles/ProfileStorage.ts
```

---

## Common Issues & Solutions

### Issue: Tests fail locally but pass in CI
**Solution**: Clean install
```bash
rm -rf node_modules package-lock.json
npm install
npm test
```

### Issue: File permission errors
**Solution**: Check file paths and permissions
```bash
ls -la ~/.machine-dream/
chmod 644 ~/.machine-dream/llm-profiles.json
```

### Issue: Database locked errors
**Solution**: Close all instances and delete test DB
```bash
pkill -f machine-dream
rm -f .agentdb test.db
npm test
```

### Issue: Import/export tests fail
**Solution**: Check file I/O and JSON serialization
```bash
# Test manually
node -e "
  const fs = require('fs');
  const data = { test: 'value' };
  fs.writeFileSync('test.json', JSON.stringify(data));
  const loaded = JSON.parse(fs.readFileSync('test.json', 'utf-8'));
  console.log(loaded);
"
```

---

## Daily Standup Template

**Date**: _____
**Progress**:
- Completed: _____
- Blocked by: _____
- Tests passing: ___/272

**Today's Focus**:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Blockers**: None / [describe]

---

## Emergency Contacts

If you get stuck:
1. **Review Specifications**: `docs/specs/13-llm-profile-management.md`
2. **Check Phase 4 Summary**: `docs/phase4-cli-wiring-summary.md`
3. **Review Test Output**: Look for specific error messages
4. **Debug Tests**: Add `console.log` to understand state
5. **Isolate Issue**: Create minimal reproduction

---

## Week 1 Deliverables Checklist

### Testing
- [ ] All 272 tests passing
- [ ] Test coverage report generated
- [ ] No skipped or disabled tests
- [ ] Test execution < 10 seconds

### Code Quality
- [ ] TypeScript typecheck passes
- [ ] No TypeScript errors
- [ ] ESLint passes (critical errors fixed)
- [ ] No console.error in test output

### CI/CD
- [ ] GitHub Actions workflow created
- [ ] First CI run successful
- [ ] Branch protection enabled
- [ ] Badge added to README

### Documentation
- [ ] Test fixes documented
- [ ] Known issues logged
- [ ] Next steps identified
- [ ] Week 1 summary written

---

## Next Week Preview (Week 2)

**Focus**: Remove mock implementations

Tasks:
1. Implement real memory command backend
2. Implement real system command backend
3. Add integration tests for new implementations
4. Verify no mock data remains in production code

---

## Tracking Progress

### Test Pass Rate
| Day | Passing | Failing | Rate |
|-----|---------|---------|------|
| Mon | 220 | 52 | 81% |
| Tue | ___ | ___ | ___% |
| Wed | ___ | ___ | ___% |
| Thu | ___ | ___ | ___% |
| Fri | 272 | 0 | 100% ✅ |

### Time Log
| Day | Hours | Focus Area | Blockers |
|-----|-------|------------|----------|
| Mon | ___ | Test analysis | ___ |
| Tue | ___ | ProfileStorage | ___ |
| Wed | ___ | Export/Import | ___ |
| Thu | ___ | Other tests | ___ |
| Fri | ___ | CI setup | ___ |

---

**Checklist Version**: 1.0
**Created**: January 7, 2026
**Owner**: Development Team
**Review**: End of each day
