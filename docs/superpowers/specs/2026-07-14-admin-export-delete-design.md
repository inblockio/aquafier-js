# v3.2 — Admin data export and per-user delete

**Date:** 2026-07-14
**Branch:** `dev`
**Status:** Approved, ready for implementation plan

## Goal

Add exactly two admin-gated actions to the settings page:

1. **Export all user data** — one `.zip` backup per user, downloaded by iterating over every user.
2. **Delete a given user's data** — wipe everything belonging to a target address, e.g. `0x1F29D4D40901Ef076b5a826a6304EcA3a036BC9a`.

Exporting per user (rather than per tree) is deliberate: it produces one discardable artifact per user, so an operator can drop the zip of a user they do not want to retain and keep the rest.

Importing the zips into `aquafier.inblock.io` is out of scope and handled separately.

## Current state

The existing workspace backup is **not** a backend feature. `web/src/components/workspace/WorkspaceManagment.tsx` (mounted on the Info page, `web/src/pages/info_page.tsx`) builds the zip **in the browser** with `jszip`:

1. `GET /tree/sorted_files?limit=1000000&page=1` returns the caller's aqua trees.
2. Each asset is re-fetched from `GET /files/:fileHash`, because `fileObject.fileContent` holds a URL, not bytes.
3. `jszip` assembles `workspace_<address>.zip`.

The archive is flat:

```
<aquaTreeFileName>.aqua.json     one per tree
<asset filenames...>             raw, at the zip root
aqua.json                        manifest
```

with the manifest shaped as:

```json
{
  "type": "aqua_workspace_backup",
  "version": "1.0.0",
  "createdAt": "<iso>",
  "genesis": "0000...0000",
  "name_with_hash": [{ "name": "...", "hash": "..." }]
}
```

The import route (`POST /explorer_workspace_upload`) rejects any archive whose `type` is not `aqua_workspace_backup`.

Three facts constrain the design:

- **`GET /tree/sorted_files` is hard-scoped to `request.user.address`.** No route lets an admin read another user's trees. This is the actual gap to close.
- **The current backup silently drops data.** `fileType` defaults to `all`, which at `api/src/controllers/revisions.ts:1447` still filters `template_id: null, is_workflow: false`. Workflow trees (aqua_sign) and template trees are excluded, as are trees with an empty `file_index` (`revisions.ts:1497`). Tolerable for a user downloading their own workspace; unacceptable for a backup taken immediately before a delete.
- **`DELETE /user_data` (`api/src/controllers/user.ts:497`) already performs the deletion**, but it is ~250 lines inlined in the handler, keyed to `request.user.address`, and deletes exactly one session — the *caller's*, by `nonce` header. Aimed at another address unchanged, it would log out the admin and leave the target's sessions live.

## Architecture

### Backend

Three routes added to `api/src/controllers/admin.ts`. They inherit the controller's existing `preHandler` gate (`isUserAdmin`: env `DASHBOARD_WALLETS` **or** DB `Users.is_admin`), so no new authorization code is written.

| Route | Response |
|---|---|
| `GET /admin/backup/users` | `[{ address, treeCount, estimatedBytes }, ...]` |
| `GET /admin/backup/:address` | `200 application/zip`, streamed, `workspace_<address>.zip` |
| `DELETE /admin/user_data/:address` | `{ success, deleted: { <table>: <count>, ... } }` |

Two new service modules hold the logic, extracted so existing routes become callers rather than duplicates.

**`api/src/services/user_data_service.ts`**

```ts
type SessionScope = { kind: 'nonce'; nonce: string } | { kind: 'all' }

async function clearUserData(
  address: string,
  opts: { sessionScope: SessionScope }
): Promise<DeletionSummary>
```

Lifted verbatim from `user.ts:497-756`, with the session deletion parameterised. `DELETE /user_data` passes `{ kind: 'nonce', nonce }` (unchanged behaviour); the admin route passes `{ kind: 'all' }`, deleting every `SiweSession` for the target and none of the admin's. One deletion implementation with two callers makes the wrong-session bug structurally impossible.

Preserved as-is: reference-counted file deletion (`FileIndex.pubkey_hash` is an array; the `File` row dies only at zero refs, so files shared with other users survive), contract soft-delete for recipients, hard-delete for senders.

**`api/src/services/backup_service.ts`**

```ts
async function streamUserBackup(
  address: string,
  url: string,
  reply: FastifyReply
): Promise<void>
```

Reads `Latest` for the target **without** the `template_id: null, is_workflow: false` filter, rebuilds each tree with the existing `createAquaTreeFromRevisions()` (`api/src/utils/revision_build_utils.ts:32`), and pipes an `archiver` zip directly to the reply, reading blobs off disk via `File.file_location` rather than re-fetching them over HTTP.

The emitted layout is byte-compatible with what the browser produces today — same filenames, same `aqua.json` manifest with `type: "aqua_workspace_backup"` — so the zips remain importable.

`archiver` is added as an API dependency in preference to the `jszip` already present: `jszip` buffers the entire archive in memory before emitting a byte, which is precisely the failure mode on a large user.

### Frontend

One new component, `web/src/components/admin/admin_data_management.tsx`, rendered by `web/src/pages/user_settings/settings_page.tsx` behind the store's `isAdmin` flag, beside the existing "Clear Account Data" action:

```
/app/settings

  [ Appearance ]
  [ User Profile ]
  [ Ethereum Settings ]
  [ Clear Account Data ]  [ Save Changes ]

  ┌─ Admin · Data Management ────────────┐   isAdmin only
  │  Export all user backups   [Export]  │
  │  Delete a user's data      [Delete]  │
  └──────────────────────────────────────┘
```

**Export** fetches `GET /admin/backup/users`, then downloads each zip **sequentially**, showing a progress row per user. Sequential, not parallel: a fan-out of large archives will exhaust the tab's memory. A per-user failure is recorded and skipped, not fatal to the run; the summary reports which users failed.

**Delete** takes a target address, requires the operator to type the full address to arm the button, and on success displays the per-table deletion counts returned by the API.

API calls go through `web/src/api/adminApi.ts`, following the existing `getBackendUrl()` / `getHeaders()` convention in that file.

## Data flow

```
Export:
  browser ──GET /admin/backup/users──▶ api ──▶ Latest (all users)
  for each user, sequentially:
    browser ──GET /admin/backup/:address──▶ api
                                             ├─ Latest (no workflow/template filter)
                                             ├─ createAquaTreeFromRevisions() per tree
                                             ├─ read blobs from File.file_location
                                             └─ archiver ──stream──▶ workspace_<addr>.zip

Delete:
  browser ──DELETE /admin/user_data/:address──▶ api
                                                └─ clearUserData(address, {kind:'all'})
```

## Error handling and guardrails

Deletion is irreversible, so the route rejects before doing anything if:

- the target address is the caller's own address — that is what "Clear Account Data" is for, and it keeps the admin's session-deletion path distinct;
- the target address appears in `DASHBOARD_WALLETS` — an admin must not be able to wipe an admin by mistyping;
- the address is not a well-formed EVM address, or no `Users` row exists for it.

`clearUserData` runs in a Prisma transaction, as it does today: a partial wipe is worse than no wipe.

On the export side, a user whose tree rebuild throws is reported in the response rather than aborting the whole sweep, and the UI surfaces which users failed so the operator does not mistake a partial export for a complete one.

## Testing

- `clearUserData` against a seeded fixture: the target's rows are gone; a file **shared** with another user survives with the target's ref removed; a second user's data is untouched; the target's sessions are gone and the caller's is not.
- `streamUserBackup`: the produced zip opens; `aqua.json` declares `type: "aqua_workspace_backup"`; a workflow (`is_workflow: true`) tree is present in the archive, which the current backup would have dropped.
- Both new routes return `403` for a non-admin session and `401` with no nonce.
- The guardrails: deleting self, deleting a `DASHBOARD_WALLETS` address, and a malformed address are each rejected.

## Out of scope

- **Importing into `aquafier.inblock.io`** — handled separately by the requester.
- **The orphaned-blob bug.** `handleFilesDeletion` deletes the `File` row but never `unlink`s `file_location`, so blobs are left on disk. Pre-existing, non-destructive, and not this change's problem; recorded here so it is not mistaken for a regression introduced by the extraction.
