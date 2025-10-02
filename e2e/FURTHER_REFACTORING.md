# E2E Test Suite Refactoring Plan

## Current State

The `e2e/cases/tests.spec.ts` file contains 21 tests (1 skipped) that cover various workflows. Many tests share common setup steps (especially login/wallet creation) and could be consolidated into comprehensive flow tests that avoid redundant operations.

## Refactoring Principles

1. **Minimize redundant login/wallet creation** - Each login takes ~10-20 seconds (MetaMask setup)
2. **Group related operations into flows** - Test complete user journeys rather than isolated actions
3. **Maintain test clarity** - Use numbered stages with descriptive comments (like `createClaimFlow.spec.ts`)
4. **Keep atomic tests separate** - Simple tests (basic checks, login verification) should remain standalone
5. **Preserve existing patterns** - Follow the established pattern from `createClaimFlow.spec.ts` and `createAndImportDnsClaimFlow.spec.ts`

## Current Tests Analysis

### ✅ Keep As-Is (Simple, atomic tests)
- `basic site accessibility test` - Quick smoke test, no login needed
- `create new wallet test` - Tests wallet creation in isolation
- `login test` - Tests login in isolation
- `user alias setting test` - Single focused feature test

### 🔄 Consolidate into Flows

#### Group 1: File Operations
**Current tests (all require login + upload):**
- `linking 2 files test` - login → upload file 1 → upload file 2 → link them
- `upload, file form revision` - login → upload → create revision
- `upload, delete file` - login → upload → delete
- `upload, sign, download` - login → upload → sign → download
- `upload, witness, download` - login → upload → witness → download

**Proposed: `fileOperationsFlow.spec.ts`**
Single user, single session:
1. Login with user context
2. Upload first file (exampleFile.pdf)
3. Upload second file (logo.png)
4. Link the two files together
5. Create a form revision on first file
6. Sign the first file
7. Download the signed file
8. Witness the second file
9. Download the witnessed file
10. Delete the second file
11. Verify deletion

**Savings:** 4 redundant logins (~40-80 seconds)

#### Group 2: Claims Creation
**Current tests (all require login + create claim):**
- `create aqua sign claim` - login → create signature claim
- `create phone number claim` - login → create phone claim
- `create email claim` - login → create email claim

**Proposed: `createClaimsFlow.spec.ts`**
Single user, single session:
1. Login with user context
2. Create signature claim workflow
3. Verify signature claim created
4. Create phone number claim workflow
5. Verify phone number claim created
6. Create email claim workflow
7. Verify email claim created

**Savings:** 2 redundant logins (~20-40 seconds)

#### Group 3: Document Sharing
**Current tests (both require 2 users):**
- `share document between two users` - owner uploads → shares with specific user → recipient accesses
- `share document with everyone` - owner uploads → shares publicly

**Proposed: `documentSharingFlow.spec.ts`**
Two users, demonstrates both sharing modes:
1. Login with owner context
2. Upload file as owner
3. Share document with everyone (public link)
4. Verify public share link works
5. Login with recipient context
6. Owner shares second file specifically with recipient wallet
7. Recipient accesses shared document via import
8. Verify recipient can view/edit shared document

**Savings:** 1 redundant login (~10-20 seconds) + 1 file upload

#### Group 4: Templates
**Current tests:**
- `create a template` - login → create template
- `delete a template` - login → create template → delete template

**Proposed: `templatesFlow.spec.ts`**
Single user, single session:
1. Login with user context
2. Create first template
3. Verify template appears in list
4. Create second template
5. Verify both templates appear
6. Delete second template
7. Verify deletion (first template still exists)

**Savings:** 1 redundant login (~10-20 seconds)

### ⚠️ Special Cases

#### Import Tests (Keep Separate)
- `import, file multiple revisions` - Tests importing a specific file format
- `import aqua zip test` - Tests importing zip files
- `import user signature` - Tests importing signature files

**Reasoning:** These test different import paths and formats. Each requires specific pre-existing files in `/resources`. Consolidation doesn't make sense as they test distinct functionality.

#### Aqua-Sign Tests
- `single user aqua-sign` - ✅ Already well-structured, keep as-is
- `two user aqua-sign` - ⚠️ Currently SKIPPED due to workflow sharing issues

**Note:** `two user aqua-sign` should remain separate once fixed, as it tests a complex multi-user signing workflow that's distinct from other operations.

## Proposed File Structure

```
e2e/cases/
├── tests.spec.ts                          # Atomic tests only
│   ├── basic site accessibility test
│   ├── create new wallet test
│   ├── login test
│   ├── user alias setting test
│   ├── import, file multiple revisions
│   ├── import aqua zip test
│   ├── import user signature
│   └── single user aqua-sign
├── createClaimFlow.spec.ts                # ✅ Already exists
├── createAndImportDnsClaimFlow.spec.ts    # ✅ Already exists
├── fileOperationsFlow.spec.ts             # 🆕 NEW - consolidates 5 tests
├── createClaimsFlow.spec.ts               # 🆕 NEW - consolidates 3 tests
├── documentSharingFlow.spec.ts            # 🆕 NEW - consolidates 2 tests
└── templatesFlow.spec.ts                  # 🆕 NEW - consolidates 2 tests
```

## Implementation Order

1. **Phase 1: Easy wins**
   - ✅ `createAndImportDnsClaimFlow.spec.ts` (DONE)
   - `createClaimsFlow.spec.ts` (similar structure, low risk)
   - `templatesFlow.spec.ts` (simple consolidation)

2. **Phase 2: Moderate complexity**
   - `documentSharingFlow.spec.ts` (2 users, but straightforward)

3. **Phase 3: Complex**
   - `fileOperationsFlow.spec.ts` (many operations, needs careful ordering)

## Expected Performance Improvements

Current test suite (if all tests run):
- 21 tests × ~15 seconds average login = ~315 seconds of login overhead alone
- Plus test execution time
- **Total: ~10-15 minutes**

After refactoring:
- 8 standalone tests (8 logins)
- 5 flow tests (6 logins total: fileOps=1, claims=1, sharing=2, templates=1, DNS=2)
- **Login overhead: ~210 seconds (33% reduction)**
- **Estimated total: ~7-10 minutes (30-40% faster)**

## Additional Benefits

1. **Better test coverage** - Flows test realistic user journeys, not just isolated features
2. **Easier debugging** - Complete flows in single files make it easier to trace issues
3. **Reduced maintenance** - Fewer test files to update when APIs change
4. **Better CI performance** - Faster test runs = faster feedback loops

## Migration Strategy

1. Create new flow file
2. Test new flow file in isolation
3. Skip equivalent tests in `tests.spec.ts`
4. After verification period, delete skipped tests from `tests.spec.ts`
5. Update README with new test structure

## Notes

- Keep MetaMask timeout/wait times consistent across all tests
- Ensure each flow test has proper cleanup (close contexts)
- Add CI-specific timeouts where needed (see existing pattern)
- Document any test dependencies on `/resources` files
