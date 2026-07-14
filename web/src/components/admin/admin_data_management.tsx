import { useState } from 'react'
import { LuShieldAlert, LuDownload, LuTrash2, LuLoader, LuCheck, LuX } from 'react-icons/lu'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
      BackupUser,
      fetchBackupUsers,
      downloadUserBackup,
      deleteUserDataAsAdmin,
} from '@/api/adminApi'

type ExportState = 'pending' | 'downloading' | 'done' | 'failed'

interface ExportRow {
      address: string
      treeCount: number
      estimatedBytes: number
      state: ExportState
      error?: string
}

const formatBytes = (bytes: number): string => {
      if (!bytes) return '0 B'
      const units = ['B', 'KB', 'MB', 'GB']
      const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
      return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value.trim())

/**
 * Download one workspace zip per user, one user at a time.
 *
 * Sequential on purpose: each zip is buffered in the tab before it hits disk, so
 * firing them off in parallel is how you run a browser out of memory. A user whose
 * export fails is marked failed and the sweep carries on — a partial export that
 * says which users are missing beats an aborted one that says nothing.
 */
const ExportAllBackups = () => {
      const [rows, setRows] = useState<ExportRow[]>([])
      const [running, setRunning] = useState(false)

      const runExport = async () => {
            setRunning(true)
            setRows([])

            let users: BackupUser[]
            try {
                  users = await fetchBackupUsers()
            } catch (e) {
                  toast.error(`Could not list users: ${e instanceof Error ? e.message : String(e)}`)
                  setRunning(false)
                  return
            }

            const exportable = users.filter(u => u.treeCount > 0)
            if (exportable.length === 0) {
                  toast.info('No users have any data to export')
                  setRunning(false)
                  return
            }

            setRows(
                  exportable.map(u => ({
                        address: u.address,
                        treeCount: u.treeCount,
                        estimatedBytes: u.estimatedBytes,
                        state: 'pending' as ExportState,
                  }))
            )

            let succeeded = 0
            let failed = 0

            for (const user of exportable) {
                  setRows(prev =>
                        prev.map(r =>
                              r.address === user.address ? { ...r, state: 'downloading' } : r
                        )
                  )

                  try {
                        await downloadUserBackup(user.address)
                        succeeded++
                        setRows(prev =>
                              prev.map(r =>
                                    r.address === user.address ? { ...r, state: 'done' } : r
                              )
                        )
                  } catch (e) {
                        failed++
                        const error = e instanceof Error ? e.message : String(e)
                        setRows(prev =>
                              prev.map(r =>
                                    r.address === user.address ? { ...r, state: 'failed', error } : r
                              )
                        )
                  }
            }

            setRunning(false)

            if (failed === 0) {
                  toast.success(`Exported ${succeeded} workspace backup${succeeded === 1 ? '' : 's'}`)
            } else {
                  toast.warning(
                        `Exported ${succeeded}, failed ${failed}. The failed users are listed below — their data was NOT backed up.`
                  )
            }
      }

      return (
            <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                              <h3 className="font-medium">Export all user backups</h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    Downloads one <code>workspace_&lt;address&gt;.zip</code> per user, including
                                    workflow and template trees. Runs one user at a time.
                              </p>
                        </div>
                        <Button
                              data-testid="admin-export-all-button"
                              onClick={runExport}
                              disabled={running}
                              className="inline-flex items-center gap-2 shrink-0"
                        >
                              {running ? (
                                    <LuLoader className="h-4 w-4 animate-spin" />
                              ) : (
                                    <LuDownload className="h-4 w-4" />
                              )}
                              {running ? 'Exporting…' : 'Export'}
                        </Button>
                  </div>

                  {rows.length > 0 && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-72 overflow-y-auto">
                              {rows.map(row => (
                                    <div
                                          key={row.address}
                                          className="flex items-center justify-between gap-3 px-4 py-2 text-sm"
                                    >
                                          <span className="font-mono truncate">{row.address}</span>
                                          <span className="flex items-center gap-2 shrink-0 text-gray-500">
                                                <span className="text-xs">
                                                      {row.treeCount} tree{row.treeCount === 1 ? '' : 's'} ·{' '}
                                                      {formatBytes(row.estimatedBytes)}
                                                </span>
                                                {row.state === 'downloading' && (
                                                      <LuLoader className="h-4 w-4 animate-spin text-primary" />
                                                )}
                                                {row.state === 'done' && (
                                                      <LuCheck className="h-4 w-4 text-green-600" />
                                                )}
                                                {row.state === 'failed' && (
                                                      <LuX className="h-4 w-4 text-red-600" />
                                                )}
                                          </span>
                                    </div>
                              ))}
                        </div>
                  )}
            </div>
      )
}

/**
 * Wipe every trace of one user's workspace.
 *
 * The confirmation is a typed address rather than a yes/no dialog: it is the only
 * check that catches the case where the operator meant a different address, which
 * a dialog cannot.
 */
const DeleteUserByAddress = () => {
      const [address, setAddress] = useState('')
      const [confirmation, setConfirmation] = useState('')
      const [deleting, setDeleting] = useState(false)

      const addressIsValid = isEvmAddress(address)
      const armed =
            addressIsValid &&
            confirmation.trim().toLowerCase() === address.trim().toLowerCase() &&
            !deleting

      const runDelete = async () => {
            const target = address.trim()
            setDeleting(true)

            try {
                  const deleted = await deleteUserDataAsAdmin(target)

                  const total = Object.values(deleted).reduce((sum, n) => sum + (n || 0), 0)
                  toast.success(`Deleted ${total} records for ${target}`, {
                        description: Object.entries(deleted)
                              .filter(([, count]) => count > 0)
                              .map(([table, count]) => `${table}: ${count}`)
                              .join(', ') || 'No data found for this user',
                  })

                  setAddress('')
                  setConfirmation('')
            } catch (e: unknown) {
                  // The server's refusals (self-delete, super admin) come back as a
                  // body message, which is far more use than the bare "Request failed".
                  const serverError = (e as { response?: { data?: { error?: string } } })
                        ?.response?.data?.error
                  const message = serverError ?? (e instanceof Error ? e.message : String(e))
                  toast.error(`Failed to delete: ${message}`)
            } finally {
                  setDeleting(false)
            }
      }

      return (
            <div className="space-y-4">
                  <div>
                        <h3 className="font-medium">Delete a user's data</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              Permanently removes every tree, revision, file, template and setting
                              belonging to the address, and signs them out everywhere. The account itself
                              survives. This cannot be undone — export their backup first.
                        </p>
                  </div>

                  <div className="space-y-3">
                        <div className="space-y-1">
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Target address
                              </label>
                              <Input
                                    data-testid="admin-delete-address-input"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="0x0000000000000000000000000000000000000000"
                                    className="font-mono"
                              />
                              {address.length > 0 && !addressIsValid && (
                                    <p className="text-xs text-red-600">Not a valid EVM address</p>
                              )}
                        </div>

                        {addressIsValid && (
                              <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                          Re-type the address to confirm
                                    </label>
                                    <Input
                                          data-testid="admin-delete-confirm-input"
                                          value={confirmation}
                                          onChange={e => setConfirmation(e.target.value)}
                                          placeholder="Repeat the address exactly"
                                          className="font-mono"
                                    />
                              </div>
                        )}

                        <Button
                              data-testid="admin-delete-user-button"
                              onClick={runDelete}
                              disabled={!armed}
                              variant="outline"
                              className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                        >
                              {deleting ? (
                                    <LuLoader className="h-4 w-4 animate-spin" />
                              ) : (
                                    <LuTrash2 className="h-4 w-4" />
                              )}
                              {deleting ? 'Deleting…' : 'Delete user data'}
                        </Button>
                  </div>
            </div>
      )
}

export default function AdminDataManagement() {
      return (
            <div className="col-span-1 md:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50 overflow-hidden">
                  <div className="border-b border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 px-6 py-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                              <LuShieldAlert className="h-5 w-5 text-red-600" />
                              Admin · Data Management
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              These actions affect other users' data. Visible to admins only.
                        </p>
                  </div>
                  <div className="p-6 space-y-8 divide-y divide-gray-200 dark:divide-gray-700 [&>*+*]:pt-8">
                        <ExportAllBackups />
                        <DeleteUserByAddress />
                  </div>
            </div>
      )
}
