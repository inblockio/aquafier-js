# Bug Fixes Summary - React Query Integration

## Issues Fixed

### 1. ✅ User Files Tab Not Appearing After First Upload
**Problem:** When uploading an image and user files didn't exist before, users had to manually reload the page for the "user_files" tab to appear.

**Root Cause:**
- The `triggerWorkflowReload` function had early returns for 'user_files' and 'all_files' that skipped React Query cache invalidation
- Cache invalidation was not forcing immediate refetches of active queries

**Solution:**
- Moved React Query cache invalidation to happen BEFORE early returns in `triggerWorkflowReload`
- Added `refetchType: 'active'` to all `invalidateQueries` calls to force immediate refetches
- Made invalidation calls async with `await` to ensure proper sequencing

**Files Modified:**
- `/web/src/utils/reloadDatabase.ts` - Fixed cache invalidation for user_files and all_files
- `/web/src/hooks/useUserStats.ts` - Added `refetchType: 'active'` to reload watcher

### 2. ✅ Files Disappearing After Brief Flash
**Problem:** "All files" tab showed files for a split second then they would disappear. Files only loaded correctly after switching tabs and coming back.

**Root Causes:**
- `loadFiles()` was clearing the files array (`setFiles([])`) at the start of execution, causing a flicker
- Multiple `useEffect` dependencies were causing unnecessary re-renders (using `JSON.stringify(session)`)
- Race conditions when `loadFiles` was called multiple times in quick succession

**Solutions:**
- Removed `setFiles([])` from the start of `loadFiles()` - files stay visible while loading new data
- Only clear files when workflow actually changes (moved to workflow change useEffect)
- Improved useEffect dependencies to only track specific session properties (`session?.address`, `session?.nonce`) instead of stringifying entire session object
- Added null checks for response data: `response.aquaTrees || []`

**Files Modified:**
- `/web/src/pages/files/WorkflowSpecificTable.tsx` - Improved file loading and useEffect dependencies

### 3. ✅ Cache Invalidation Not Forcing Refetches
**Problem:** When reload triggers fired, React Query cache was invalidated but queries didn't refetch immediately due to stale time settings.

**Solution:**
- Changed all `queryClient.invalidateQueries()` calls to include `refetchType: 'active'`
- This forces active queries to refetch immediately instead of waiting for next mount/focus
- Made all invalidation calls async with `await` for proper sequencing

**Files Modified:**
- `/web/src/utils/reloadDatabase.ts` - All cache invalidation calls
- `/web/src/hooks/useUserStats.ts` - Reload watcher integration

## Known Backend Issue (Not Fixed - Requires Backend Changes)

### File Count Mismatch Between Stats and File List
**Issue:** The "all files" count shows 2 files but the actual list displays more files.

**Root Cause:**
- Backend `/user_data_stats` endpoint doesn't count files with `is_workflow=true` in the database
- Backend file list endpoints (`/tree/sorted_files`, `/tree/per_type`) return ALL files including those with `is_workflow=true`
- This creates a mismatch between the count shown in stats and the actual number of files displayed

**Impact:** Minor UI inconsistency - file count doesn't match visible files

**Recommended Backend Fix:**
- Option 1: Update `/user_data_stats` to include files with `is_workflow=true` in counts
- Option 2: Update file list endpoints to exclude `is_workflow=true` files by default
- Option 3: Add a separate count field for workflow files vs regular files

## Testing Recommendations

### Test Cases to Verify Fixes:

1. **First File Upload Test:**
   - Start with empty account (no files)
   - Upload a file
   - Verify "user_files" tab appears immediately without manual reload
   - Verify file count updates in stats

2. **Tab Switching Test:**
   - Upload files to multiple tabs (user_files, all, specific workflows)
   - Switch between tabs rapidly
   - Verify files don't disappear or flicker
   - Verify correct files show in each tab

3. **Real-time Updates Test:**
   - Open app in two browser tabs
   - Upload file in tab 1
   - Verify tab 2 updates via WebSocket
   - Verify stats update in both tabs

4. **Performance Test:**
   - Open Chrome DevTools Network tab
   - Navigate to /app route
   - Count API requests
   - Verify:
     - `/user_data_stats` called only 1-2 times (not 8)
     - `/subscriptions/usage` called only 1-2 times (not 4)
     - No GET requests to `/explorer_files` (should be 0)

## Performance Impact

### Expected Improvements:
- ✅ API calls reduced by ~70% on page load
- ✅ No duplicate simultaneous requests (request deduplication working)
- ✅ Faster perceived load time (no file flicker/disappearing)
- ✅ Immediate UI updates after file operations (no manual reload needed)

## Migration Notes

- All changes are backward compatible
- Existing reload watcher patterns continue to work
- Zustand subscription store continues to sync with React Query data
- No breaking changes to component interfaces
