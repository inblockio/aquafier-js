# Frontend Audit Report: `web/src`

**Date:** 2026-02-17
**Scope:** Component organization, performance, and UI quality for the claims workflow page

---

## Part 1: Component Organization

### Current Structure (217 files, ~50,600 LOC)

```
web/src/
├── api/                  3 files    (API client + domain modules)
├── components/          104 files   (shared + UI primitives)
│   ├── (root)            28 files   <<< CLUTTERED
│   ├── aqua_chain_actions/  13 files
│   ├── aqua_forms/          7 files
│   ├── dropzone_file_actions/ 7 files
│   ├── ui/                 40 files  (Shadcn)
│   └── other folders        9 files
├── pages/                62 files   (13 subdirectories)
├── utils/                12 files   (6,534 LOC)
├── hooks/                 7 files
├── models/ + types/      14 files
├── stores/                2 files   (Zustand)
└── ...
```

### Problems

| Issue | Severity | Details |
|-------|----------|---------|
| **Root components clutter** | High | 28 files dumped in `components/` root (~12,400 LOC). Includes `file_preview.tsx` (1,243 lines), `identity_card_dialog_ui.tsx` (668 lines), `connect_wallet_page_metmask.tsx` (615 lines). These should be in feature folders. |
| **Oversized utility file** | High | `utils/functions.ts` is **3,025 lines** — a grab-bag of crypto, validation, formatting, DNS, Aqua chain operations. Should be split into 5-8 domain-specific modules. |
| **Giant components** | High | 6 components exceed 1,000 lines: `CreateFormFromTemplate.tsx` (2,428), `PdfSigner.tsx` (1,774), `file_preview.tsx` (1,243), `PdfViewer.tsx` (1,032), `WalletAddressProfile.tsx` (1,023), `files_list_item.tsx` (1,002). Each should be decomposed into sub-components + hooks. |
| **Duplicate file** | Medium | `download_aqua_chain copy.tsx` (510 lines) is an accidental copy of `download_aqua_chain.tsx`. Should be deleted. |
| **Filename typos** | Low | `NotificaitonsHolder.tsx` (should be Notifications), `verifiy_dns.tsx` (should be verify), `WalletAdrressClaim.tsx` (should be Address). |
| **Limited custom hooks** | Medium | Only 7 hooks for 217 files. Large components embed logic that should be extracted (e.g., `useClaimsProcessor`, `useDNSVerification`, `useAttestations`). |

### Recommended Structure

```
web/src/
├── api/                      (no change)
├── components/
│   ├── ui/                   (Shadcn primitives - no change)
│   ├── common/               (ErrorBoundary, LoadingSpinner, CopyButton, AddressDisplay)
│   ├── file-preview/         (file_preview.tsx split into sub-components)
│   ├── identity-card/        (identity_card_dialog_ui.tsx)
│   ├── wallet-connect/       (connect_wallet_page_metmask.tsx)
│   ├── aqua-chain-actions/   (no change, just delete the duplicate)
│   ├── aqua-forms/           (split CreateFormFromTemplate into sub-components)
│   └── dropzone/             (no change)
├── features/                 <<< NEW: feature-based grouping
│   ├── claims/               (all claims workflow components + hooks)
│   ├── pdf-workflow/         (PDF signing components + hooks)
│   └── files/                (file management components + hooks)
├── pages/                    (thin route wrappers only)
├── hooks/                    (shared hooks)
├── utils/
│   ├── crypto.ts
│   ├── aqua-chain.ts
│   ├── validation.ts
│   ├── formatting.ts
│   ├── dns.ts
│   └── pdf.ts
└── ...
```

---

## Part 2: Performance Analysis — Claims Workflow Page

**Route:** `/app/claims/workflow/:walletAddress`
**Files:** 13 components, ~5,500 LOC

### Critical Performance Issues

#### 1. Sequential API Waterfall (claimsWorkflowPage.tsx:128-171)

```typescript
// CURRENT: Sequential — each claim blocks on two API calls
for (let i = 0; i < files.length; i++) {
    processedAttestations = await loadAttestationData(...)   // blocks
    const sharedContracts = await loadSharedContractsData(...) // then blocks again
}
```

For N claims, this creates 2N sequential network requests. With 20 claims at 200ms each, that's **8 seconds** of blocking.

**Fix:** Batch attestation processing locally (already have all attestation files), use `Promise.all` for shared contracts:

```typescript
const sharedContractsPromises = matchingClaims.map(c =>
    loadSharedContractsData(c.lastRevisionHash)
);
const allSharedContracts = await Promise.all(sharedContractsPromises);
```

#### 2. N+1 Attestation Loop (claimsWorkflowPage.tsx:76-104)

For each claim, `loadAttestationData` iterates over ALL attestation files. With 50 claims and 200 attestation files, that's 10,000 iterations.

**Fix:** Pre-index attestations by `identityClaimId` once in O(n), then look up in O(1):

```typescript
const attestationIndex = new Map<string, IAttestationEntry[]>();
for (const file of attestationFiles) { /* index once */ }
// Then: attestationIndex.get(claimHash) ?? []
```

#### 3. Missing Memoization Everywhere

- `WalletAddressProfile` (1,023 lines): No `React.memo`, re-renders on every parent state change
- `ClaimCard` inside `WalletAddressProfile`: Runs DNS verification in `useEffect` on re-render
- `renderClaim()` (120 lines): Inline function recreated every render
- `SimpleClaim`, `ENSClaim`: `Object.entries().map()` on every render without `useMemo`
- `ImprovedDNSLogs`: JSON.stringify in render path

#### 4. Cascading Re-renders from useLiveQuery (line 44-47)

```typescript
const contactProfiles = useLiveQuery(
    () => contactsDB.contacts.toArray(), []
);
```

Returns a new array reference on every IndexedDB change, which triggers the `useEffect` at line 373 → calls `loadClaimsFileData()` → resets all state → full re-render cascade.

#### 5. Duplicate Claim Processing Logic

`WalletAddressProfile` (lines 355-429) duplicates the claim processing from `claimsWorkflowPage` with its own triple-nested loop. The same files are processed twice.

#### 6. No Virtualization

Claim lists with attestations render all items. A profile with 50+ claims and hundreds of attestations creates thousands of DOM nodes without windowing.

#### 7. State Mutation (lines 456-459, 502-505)

```typescript
contractDeleted={hash => {
    let newState = claim.sharedContracts?.filter(e => e.hash != hash)
    claim.sharedContracts = newState  // Direct mutation!
}}
```

Mutating state objects directly bypasses React's change detection.

### Performance Summary

| Area | Score | Key Issue |
|------|-------|-----------|
| Network | 2/10 | Sequential waterfall, no parallelization, no caching |
| Rendering | 3/10 | No memoization, cascading re-renders, no virtualization |
| Data Processing | 3/10 | O(n*m) loops, duplicate processing, state mutations |
| Bundle | 6/10 | No lazy loading for claim sub-components |

---

## Part 3: UI/UX Quality — Claims Workflow Page

### Visual Layout (from code analysis)

The page has this structure:
1. **Header** — Gradient banner (slate-to-indigo) with "Identity Profiles" title + wallet address input
2. **Loading state** — Centered spinner (ClipLoader)
3. **Empty state** — Blue info card "No Claims Found"
4. **Profile card** — `WalletAddressProfile` with avatar, ENS name, claim summary cards
5. **Claims list** — Two groups rendered sequentially:
   - Group 1: Simple/Identity/ENS claims (7:5 grid layout)
   - Group 2: DNS/Signature/Other claims (same grid)
6. **Per-claim sections** — Claim content (left 7 cols) + Attestations (right 5 cols)
7. **Collapsible** — "Sharing Information" accordion per claim

### UI Issues Found

#### Broken Tailwind Classes (Will Not Render)

`EmailClaim.tsx` and `PhoneNumberClaim.tsx` use dynamic class interpolation:
```typescript
className={`border-${isVerified ? "green" : "gray"}-400`}
```
Tailwind purges classes not present as complete strings. These borders **will not appear** in production. Must use:
```typescript
className={isVerified ? "border-green-400" : "border-gray-400"}
```

#### Layout Issues

| Issue | Location | Impact |
|-------|----------|--------|
| **12-col grid without mobile handling** | claimsWorkflowPage.tsx:201,244 | `col-span-7` / `col-span-5` has no `sm:` or `md:` variant — on mobile, claims and attestations stack but stay at 7/5 proportions of a single column |
| **"Selected" badge overlaps content** | line 247 | `absolute top-0 right-0` green badge covers the claim card's top-right corner |
| **No max-width on attestation list** | line 215,265 | `max-h-[300px]` with overflow but wallet addresses overflow horizontally |
| **Hard-coded viewport heights** | WalletAddressProfile:857 | `max-h-[50vh]` doesn't adapt to content |
| **Duplicate chevron icons** | lines 441-444, 487-490 | Shows both ChevronDown AND ChevronUp at the same time (should toggle) |

#### Visual Consistency

- **Inconsistent card borders:** `border-2 border-gray-400` on claim cards vs `border-gray-200` elsewhere — the gray-400 borders are heavy
- **Mixed background colors:** `bg-gray-50` on claims, `bg-white` on profile, `bg-blue-50` on empty state — no clear hierarchy
- **Spacing inconsistency:** `gap-2`, `gap-4`, `p-2`, `p-4` without a system
- **Button styling varies:** ShareButton, AttestButton, and copy buttons all use different styles
- **No consistent card component:** Each section builds its own card with different rounding, shadows, and borders

#### Accessibility

| Issue | Impact |
|-------|--------|
| No ARIA labels on interactive elements | Screen readers can't identify buttons |
| Color-only status indicators (green/red badges) | Inaccessible to colorblind users |
| Missing alt text on signature images | Screen readers skip content |
| Form inputs without labels (AddressView) | Keyboard/screen reader navigation broken |
| No focus management when navigating to a "Selected" claim | Users can't find the highlighted claim |
| Collapsible triggers lack aria-expanded | State not communicated to assistive tech |

#### Suggested Visual Improvements

1. **Use consistent card wrapper** — Create a `<ClaimCard>` component with standard border, shadow, padding, and hover state
2. **Fix the grid** — Use `grid-cols-1 lg:grid-cols-12` so claims stack properly on mobile
3. **Collapsible chevron** — Toggle between ChevronDown/ChevronUp based on open state
4. **Attestation empty state** — Replace plain text with a more inviting illustration + CTA
5. **Address display** — Use monospace font + copy button consistently (some places have it, some don't)
6. **Loading skeleton** — Replace ClipLoader with skeleton cards that match the final layout shape
7. **Selected claim** — Use a left border accent (`border-l-4 border-green-500`) instead of absolute-positioned badge

### UI Summary

| Area | Score | Key Issue |
|------|-------|-----------|
| Visual Design | 5/10 | Inconsistent cards, borders, spacing |
| Responsiveness | 3/10 | Grid breaks on mobile, no sm/md variants |
| Accessibility | 2/10 | Missing ARIA, color-only indicators, no focus management |
| Empty/Error States | 5/10 | Empty state exists but error states are toast-only |
| Consistency | 4/10 | Mixed button styles, card styles, spacing values |

---

## Part 4: Quick Wins (Highest Impact, Lowest Effort)

| # | Fix | Files | Effort |
|---|-----|-------|--------|
| 1 | Fix broken Tailwind dynamic classes | EmailClaim.tsx, PhoneNumberClaim.tsx | 10 min |
| 2 | Delete `download_aqua_chain copy.tsx` | 1 file | 1 min |
| 3 | Add `React.memo` to WalletAddressProfile, SimpleClaim, ENSClaim, AttestationEntry | 4 files | 30 min |
| 4 | Parallelize shared contracts loading with `Promise.all` | claimsWorkflowPage.tsx | 20 min |
| 5 | Pre-index attestations into a Map instead of N*M loop | claimsWorkflowPage.tsx | 15 min |
| 6 | Fix responsive grid: add `grid-cols-1` default | claimsWorkflowPage.tsx | 5 min |
| 7 | Toggle chevron icon based on collapsible state | claimsWorkflowPage.tsx | 10 min |
| 8 | Remove console.log statements | SimpleClaim.tsx, ENSClaim.tsx | 5 min |
| 9 | Fix state mutation in contractDeleted callback | claimsWorkflowPage.tsx | 10 min |
| 10 | Split `utils/functions.ts` into domain modules | utils/ | 2-3 hrs |

---

## Overall Scores

| Category | Score |
|----------|-------|
| Component Organization | 5/10 |
| Performance | 3/10 |
| UI/UX Quality | 4/10 |
| Code Quality | 4/10 |
| Accessibility | 2/10 |
| **Overall** | **3.6/10** |
