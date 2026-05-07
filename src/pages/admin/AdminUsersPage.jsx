import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Activity,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  History,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Unlock,
  UserCircle2,
  UserCog,
  UserPlus,
  X,
} from 'lucide-react'

import { AdminEntityPage } from '@/components/admin/AdminEntityPage'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TypedConfirmDialog } from '@/components/ui/typed-confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Highlight } from '@/components/ui/highlight'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { useCurrentProfile } from '@/hooks/use-current-profile'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/get-error-message'
import {
  activateAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  forceLogoutAdminUser,
  getAdminUserAuditLogs,
  getPermissionCatalog,
  getRoleCatalog,
  grantAdminUserPermissions,
  listAdminUsers,
  lockAdminUser,
  registerUserAsAdmin,
  resetFailedAttempts,
  revokeAdminUserPermissions,
  unlockAdminUser,
  updateAdminUserDetails,
  updateAdminUserRole,
} from '@/services/admin-user'
import {
  isHiddenAction,
  unwrapFeedPage,
} from '@/pages/admin/analytics-constants'
import { UserAuditRow } from '@/pages/admin/user-audit-shared'

// Visual treatment per role. Falls back to a neutral chip for any role
// the catalog returns that we haven't styled yet. GUEST is the default
// role assigned to self-registered users awaiting admin activation —
// they only carry ROLE_GUEST and no permissions.
const ROLE_META = {
  SUPER_ADMIN: { label: 'Super admin', icon: Crown,       accent: 'text-amber-600 dark:text-amber-400' },
  ADMIN:       { label: 'Admin',       icon: ShieldCheck, accent: 'text-primary' },
  EMPLOYEE:    { label: 'Employee',    icon: UserCog,     accent: 'text-sky-600 dark:text-sky-400' },
  GUEST:       { label: 'Guest',       icon: UserCircle2, accent: 'text-muted-foreground' },
}

function roleMetaFor(role) {
  if (!role) return { label: '—', icon: UserCog, accent: 'text-muted-foreground' }
  const key = String(role).toUpperCase()
  return (
    ROLE_META[key] ?? {
      label: key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()),
      icon: UserCog,
      accent: 'text-muted-foreground',
    }
  )
}

function AdminUsersPage() {
  const me = useCurrentProfile()
  const toast = useToast()

  const [users, setUsers] = useState(null)
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  // Per-row "what's in flight" map keyed by userId — drives the spinner
  // on the action that's currently saving so individual rows can update
  // independently without freezing the whole table.
  const [pendingByUser, setPendingByUser] = useState({})
  const setPending = (userId, value) =>
    setPendingByUser((prev) => ({ ...prev, [userId]: value }))
  const clearPending = (userId) =>
    setPendingByUser((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })

  // Dialog state.
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [isCreatingUser, setIsCreatingUser] = useState(false)
  const [roleDialogUser, setRoleDialogUser] = useState(null)
  const [permsDialogUser, setPermsDialogUser] = useState(null)
  const [editDialogUser, setEditDialogUser] = useState(null)
  const [deleteDialogUser, setDeleteDialogUser] = useState(null)
  const [activationDialog, setActivationDialog] = useState(null) // { user, action }
  // Confirm dialog for lock/unlock/force-logout/reset-attempts. Each
  // entry encodes the user, the action key, and the copy to render.
  const [stateActionDialog, setStateActionDialog] = useState(null)
  // Per-user audit-log viewer.
  const [auditDialogUser, setAuditDialogUser] = useState(null)

  const loadAll = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      // Catalogs are tiny and almost-static — fetching them alongside
      // the user list keeps the dialogs snappy on first open.
      const [userList, roleList, permissionList] = await Promise.all([
        listAdminUsers(),
        getRoleCatalog().catch(() => []),
        getPermissionCatalog().catch(() => []),
      ])
      setUsers(userList)
      setRoles(roleList)
      setPermissions(permissionList)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load users'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll()
  }, [loadAll])

  const filteredUsers = useMemo(() => {
    if (!users) return null
    const term = filter.trim().toLowerCase()
    if (!term) return users
    return users.filter((u) => {
      const hay = [u.username, u.name, u.email, u.role]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(term)
    })
  }, [users, filter])

  // Replace one user in `users` after a mutation lands. Avoids a full
  // refetch — backend always returns the updated user, so we just swap.
  const replaceUser = (updated) => {
    if (!updated || updated.id == null) return
    setUsers((prev) =>
      Array.isArray(prev) ? prev.map((u) => (u.id === updated.id ? updated : u)) : prev,
    )
  }

  // ── Role change ──────────────────────────────────────────────────────
  const submitRoleChange = async (newRole) => {
    if (!roleDialogUser) return
    const userId = roleDialogUser.id
    setPending(userId, 'role')
    try {
      const updated = await updateAdminUserRole(userId, newRole)
      replaceUser(updated)
      toast.success(
        'Role updated',
        `${roleDialogUser.username || roleDialogUser.email} is now ${roleMetaFor(newRole).label}`,
      )
      setRoleDialogUser(null)
    } catch (err) {
      toast.apiError(err, 'Could not change role')
    } finally {
      clearPending(userId)
    }
  }

  // ── Permissions edit ─────────────────────────────────────────────────
  const submitPermissionsChange = async ({ toGrant, toRevoke }) => {
    if (!permsDialogUser) return
    const userId = permsDialogUser.id
    setPending(userId, 'permissions')
    try {
      let latest = permsDialogUser
      // Two endpoints, two requests — keep them sequential so the audit
      // log lands a stable order (grant before revoke).
      if (toGrant.length > 0) {
        latest = await grantAdminUserPermissions(userId, toGrant)
      }
      if (toRevoke.length > 0) {
        latest = await revokeAdminUserPermissions(userId, toRevoke)
      }
      replaceUser(latest)
      // Backend auto-promotes GUEST → EMPLOYEE on grant, so the
      // returned user may have a new role. Mention it so the admin
      // doesn't have to spot the role chip change to know it happened.
      const beforeRole = String(permsDialogUser.role || '').toUpperCase()
      const afterRole = String(latest.role || '').toUpperCase()
      const promoted = beforeRole === 'GUEST' && afterRole === 'EMPLOYEE'
      const diff = describePermissionDiff({ toGrant, toRevoke })
      toast.success(
        'Permissions updated',
        promoted ? `${diff} · auto-promoted to Employee` : diff,
      )
      setPermsDialogUser(null)
    } catch (err) {
      toast.apiError(err, 'Could not update permissions')
    } finally {
      clearPending(userId)
    }
  }

  // ── Edit user details ────────────────────────────────────────────────
  const submitEditUser = async (changes) => {
    if (!editDialogUser) return
    const userId = editDialogUser.id
    setPending(userId, 'edit')
    try {
      const updated = await updateAdminUserDetails(userId, changes)
      replaceUser(updated)
      toast.success('User updated', updated.username || updated.email)
      setEditDialogUser(null)
    } catch (err) {
      toast.apiError(err, 'Could not update user details')
      throw err
    } finally {
      clearPending(userId)
    }
  }

  // ── Delete user ──────────────────────────────────────────────────────
  // Hard delete — uses TypedConfirmDialog to require typing the
  // username, mirroring the entity-delete flows elsewhere in the app.
  const submitDeleteUser = async () => {
    if (!deleteDialogUser) return
    const userId = deleteDialogUser.id
    setPending(userId, 'delete')
    try {
      await deleteAdminUser(userId)
      // Drop the user from the list optimistically since we got 2xx.
      setUsers((prev) =>
        Array.isArray(prev) ? prev.filter((u) => u.id !== userId) : prev,
      )
      toast.success(
        'User deleted',
        `${deleteDialogUser.username || deleteDialogUser.email} is gone`,
      )
      setDeleteDialogUser(null)
    } catch (err) {
      toast.apiError(err, 'Could not delete user')
    } finally {
      clearPending(userId)
    }
  }

  // ── Activate / deactivate ────────────────────────────────────────────
  const submitActivation = async () => {
    if (!activationDialog) return
    const { user, action } = activationDialog
    setPending(user.id, 'activation')
    try {
      const updated =
        action === 'activate' ? await activateAdminUser(user.id) : await deactivateAdminUser(user.id)
      replaceUser(updated)
      toast.success(
        action === 'activate' ? 'User activated' : 'User deactivated',
        user.username || user.email,
      )
      setActivationDialog(null)
    } catch (err) {
      toast.apiError(err, action === 'activate' ? 'Could not activate' : 'Could not deactivate')
    } finally {
      clearPending(user.id)
    }
  }

  // ── Create new user ──────────────────────────────────────────────────
  // Single POST /api/admin/users — backend honours the role + seeds
  // EMPLOYEE_DEFAULT_PERMISSIONS server-side, so we don't need a
  // follow-up role bump or a list refetch to discover the new row.
  // Any throw bubbles to the dialog's error state via the catch
  // upstream in AddUserDialog.submit (rendered inline as `formError`).
  const submitNewUser = async ({ name, username, email, password, role }) => {
    setIsCreatingUser(true)
    try {
      const targetRole = String(role || 'EMPLOYEE').toUpperCase()
      const created = await registerUserAsAdmin({
        name,
        username,
        email,
        password,
        role: targetRole,
      })

      // Splice the freshly-created row in without a roundtrip. If the
      // backend's response shape ever drifts, fall back to a refetch.
      if (created && created.id != null) {
        setUsers((prev) => {
          const list = Array.isArray(prev) ? prev : []
          if (list.some((u) => u.id === created.id)) return list
          return [created, ...list]
        })
      } else {
        const refreshed = await listAdminUsers()
        setUsers(refreshed)
      }

      toast.success(
        'User created',
        `${username} (${roleMetaFor(targetRole).label}) is ready to sign in`,
      )
      setAddUserOpen(false)
    } finally {
      setIsCreatingUser(false)
    }
  }

  // ── Lock / unlock / reset attempts / force logout ────────────────────
  // Single confirm-dialog flow keyed on `action`. Each branch maps to a
  // service call + a success toast title; everything else is shared.
  const STATE_ACTION_HANDLERS = {
    lock: { call: lockAdminUser, successTitle: 'User locked' },
    unlock: { call: unlockAdminUser, successTitle: 'User unlocked' },
    forceLogout: { call: forceLogoutAdminUser, successTitle: 'Sessions revoked' },
    resetAttempts: { call: resetFailedAttempts, successTitle: 'Failed attempts reset' },
  }

  const submitStateAction = async () => {
    if (!stateActionDialog) return
    const { user, action } = stateActionDialog
    const handler = STATE_ACTION_HANDLERS[action]
    if (!handler) return
    setPending(user.id, 'state')
    try {
      const updated = await handler.call(user.id)
      replaceUser(updated)
      toast.success(handler.successTitle, user.username || user.email)
      setStateActionDialog(null)
    } catch (err) {
      toast.apiError(err, 'Could not complete action')
    } finally {
      clearPending(user.id)
    }
  }

  // Self-protection — UI guards mirror the server's; messaging is
  // friendlier on the client. Backend will still 400 if the FE is
  // bypassed.
  const isSelf = (user) => me && user && Number(me.id) === Number(user.id)

  // Single dispatch for every Manage-menu item so RowManageMenu stays
  // a thin presentational component.
  const handleRowAction = (user, action) => {
    switch (action) {
      case 'edit':
        setEditDialogUser(user)
        return
      case 'role':
        setRoleDialogUser(user)
        return
      case 'permissions':
        setPermsDialogUser(user)
        return
      case 'audit':
        setAuditDialogUser(user)
        return
      case 'delete':
        setDeleteDialogUser(user)
        return
      case 'activate':
      case 'deactivate':
        setActivationDialog({ user, action })
        return
      case 'lock':
      case 'unlock':
      case 'forceLogout':
      case 'resetAttempts':
        setStateActionDialog({ user, action })
        return
      default:
        return
    }
  }

  return (
    <AdminEntityPage
      title="Users"
      description="Manage platform accounts — change roles, grant or revoke permissions, and disable access without deleting the account."
      action={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="gap-2"
            onClick={() => setAddUserOpen(true)}
          >
            <UserPlus className="size-4" />
            Add user
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={loadAll}
            disabled={isLoading}
          >
            <RefreshCw className={`size-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      }
    >
      <Card className="border-border bg-card shadow-sm shadow-black/5">
        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {filteredUsers?.length ?? 0}
            </span>{' '}
            of{' '}
            <span className="font-semibold tabular-nums text-foreground">
              {users?.length ?? 0}
            </span>{' '}
            users
          </span>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name, username, email, or role…"
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4 px-5 py-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={loadAll}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {isLoading && !users ? (
        <Card className="border-border bg-card shadow-sm shadow-black/5">
          <div className="divide-y divide-border">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Skeleton className="size-9 rounded-full" />
                <Skeleton className="h-5 w-44" />
                <Skeleton className="ml-auto h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ) : !filteredUsers || filteredUsers.length === 0 ? (
        <EmptyState
          icon={UserCog}
          title={users && users.length === 0 ? 'No users yet' : 'No matches'}
          description={
            users && users.length === 0
              ? 'When teammates register or are seeded, they show up here.'
              : 'Try a different search term, or clear the filter.'
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/5">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>User</TableHead>
                <TableHead className="w-[140px]">Role</TableHead>
                <TableHead>Authorities</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[140px] text-right">Manage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const meta = roleMetaFor(user.role)
                const Icon = meta.icon
                const pending = pendingByUser[user.id]
                const self = isSelf(user)
                const extra = Array.isArray(user.extraPermissions) ? user.extraPermissions : []
                // Strip the `ROLE_*` tag — it's a marker, not a real
                // permission, and including it makes "Inherited from
                // role (1)" appear for users who actually have zero
                // perms (EMPLOYEEs after the role-base was emptied).
                const effective = (
                  Array.isArray(user.effectiveAuthorities) ? user.effectiveAuthorities : []
                ).filter((a) => !String(a).startsWith('ROLE_'))
                const inheritedCount = Math.max(0, effective.length - extra.length)
                return (
                  <TableRow key={user.id} className={cn(!user.active && 'opacity-60')}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserCircle2 className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            <Highlight text={user.name || user.username || '—'} query={filter} />
                            {self ? (
                              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                                You
                              </span>
                            ) : null}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            <Highlight text={user.email || user.username || ''} query={filter} />
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium',
                          meta.accent,
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span className="text-foreground">{meta.label}</span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {extra.length === 0 ? (
                          inheritedCount > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              Inherited from role ({inheritedCount})
                            </span>
                          ) : (
                            <span className="text-xs italic text-muted-foreground">
                              No permissions yet
                            </span>
                          )
                        ) : (
                          <>
                            {extra.slice(0, 4).map((p) => (
                              <span
                                key={p}
                                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400"
                                title="Granted by an admin"
                              >
                                <KeyRound className="size-3" />
                                {p}
                              </span>
                            ))}
                            {extra.length > 4 ? (
                              <span className="text-xs text-muted-foreground">
                                +{extra.length - 4} more
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <UserStatusCell user={user} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowManageMenu
                        user={user}
                        self={self}
                        pending={pending}
                        onAction={(action) => handleRowAction(user, action)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <RoleDialog
        user={roleDialogUser}
        roles={roles}
        isProcessing={Boolean(roleDialogUser && pendingByUser[roleDialogUser.id] === 'role')}
        onCancel={() => setRoleDialogUser(null)}
        onSubmit={submitRoleChange}
      />
      <PermissionsDialog
        user={permsDialogUser}
        permissionsCatalog={permissions}
        isProcessing={Boolean(permsDialogUser && pendingByUser[permsDialogUser.id] === 'permissions')}
        onCancel={() => setPermsDialogUser(null)}
        onSubmit={submitPermissionsChange}
      />
      <ConfirmDialog
        open={Boolean(activationDialog)}
        title={
          activationDialog?.action === 'activate'
            ? 'Re-enable this user?'
            : 'Disable this user?'
        }
        description={
          activationDialog?.action === 'activate'
            ? `${activationDialog?.user?.username || activationDialog?.user?.email} will be able to sign in again immediately.`
            : `${activationDialog?.user?.username || activationDialog?.user?.email} will be signed out and blocked from logging in. Their data is kept; you can re-enable them later.`
        }
        confirmLabel={activationDialog?.action === 'activate' ? 'Re-enable' : 'Disable'}
        confirmVariant={activationDialog?.action === 'activate' ? 'default' : 'destructive'}
        isProcessing={Boolean(
          activationDialog && pendingByUser[activationDialog.user.id] === 'activation',
        )}
        onConfirm={submitActivation}
        onOpenChange={(open) => {
          if (!open) setActivationDialog(null)
        }}
      />
      <StateActionDialog
        dialog={stateActionDialog}
        isProcessing={Boolean(
          stateActionDialog && pendingByUser[stateActionDialog.user.id] === 'state',
        )}
        onConfirm={submitStateAction}
        onCancel={() => setStateActionDialog(null)}
      />
      <AddUserDialog
        open={addUserOpen}
        roles={roles}
        isProcessing={isCreatingUser}
        onCancel={() => setAddUserOpen(false)}
        onSubmit={submitNewUser}
      />
      <EditUserDialog
        user={editDialogUser}
        isProcessing={Boolean(
          editDialogUser && pendingByUser[editDialogUser.id] === 'edit',
        )}
        onCancel={() => setEditDialogUser(null)}
        onSubmit={submitEditUser}
      />
      <TypedConfirmDialog
        open={Boolean(deleteDialogUser)}
        title="Delete this user?"
        description={
          deleteDialogUser
            ? `Permanently delete ${deleteDialogUser.username || deleteDialogUser.email}. This is not recoverable. Audit logs the user authored stay; the account itself is gone.`
            : ''
        }
        codeToConfirm={deleteDialogUser?.username || deleteDialogUser?.email || ''}
        promptLabel="Type the username to confirm"
        confirmLabel="Delete user"
        isProcessing={Boolean(
          deleteDialogUser && pendingByUser[deleteDialogUser.id] === 'delete',
        )}
        onConfirm={submitDeleteUser}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogUser(null)
        }}
      />
      <UserAuditLogDialog
        user={auditDialogUser}
        onClose={() => setAuditDialogUser(null)}
      />
    </AdminEntityPage>
  )
}

// Compact status cell — surfaces three-state Active/Locked/Disabled
// at a glance, plus a "N failed attempts" subline when relevant.
// Locked beats Active visually because a locked-but-active account is
// effectively the same as disabled to a user trying to sign in.
//
// `user.active` defaults to true when undefined — older API responses
// or partial DTOs don't always include the field, and rendering every
// such user as "Disabled" is wrong (the only authoritative "disabled"
// signal is `active === false`).
function UserStatusCell({ user }) {
  const failed = Number(user?.failedAttempts ?? 0)
  const lockedAt = user?.lockTime ? new Date(user.lockTime) : null
  const isLocked = Boolean(lockedAt && !Number.isNaN(lockedAt.getTime()))
  const isDisabled = user?.active === false

  return (
    <div className="space-y-0.5">
      {isDisabled ? (
        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
          <X className="size-3.5" />
          Disabled
        </span>
      ) : isLocked ? (
        <span
          className="inline-flex items-center gap-1 rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400"
          title={`Locked since ${lockedAt.toLocaleString()}`}
        >
          <Lock className="size-3.5" />
          Locked
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Check className="size-3.5" />
          Active
        </span>
      )}
      {failed > 0 ? (
        <p className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="size-3" />
          {failed} failed attempt{failed === 1 ? '' : 's'}
        </p>
      ) : null}
    </div>
  )
}

// Single per-row dropdown holding every admin action for the user.
// Renders the panel via a portal at fixed coordinates so it can't be
// clipped by the table wrapper's `overflow-hidden` (which gives the
// table its rounded corners). Sections: identity (role/permissions),
// access (lock/unlock/reset), sessions (force logout), account state
// (enable/disable). Self-protection items appear disabled with a
// tooltip.
function RowManageMenu({ user, self, pending, onAction }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const buttonRef = useRef(null)
  const menuRef = useRef(null)

  // Reposition the menu under the trigger button. `flipUp` flips it to
  // sit above the button when there isn't enough room below — keeps
  // the menu fully on-screen near the bottom of the table.
  const reposition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const MENU_WIDTH = 256 // matches w-64
    const ESTIMATED_HEIGHT = 360
    const GAP = 4
    const wouldOverflowBottom =
      rect.bottom + GAP + ESTIMATED_HEIGHT > window.innerHeight
    const top = wouldOverflowBottom
      ? Math.max(8, rect.top - GAP - ESTIMATED_HEIGHT)
      : rect.bottom + GAP
    const left = Math.max(
      8,
      Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8),
    )
    setCoords({ top, left })
  }, [])

  useEffect(() => {
    if (!open) return
    reposition()
    const handler = () => reposition()
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const onMouseDown = (event) => {
      const target = event.target
      if (
        buttonRef.current && buttonRef.current.contains(target)
      ) return
      if (menuRef.current && menuRef.current.contains(target)) return
      setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isLocked = Boolean(user?.lockTime)
  const isDisabled = user?.active === false
  const failed = Number(user?.failedAttempts ?? 0)
  const isAdminTarget = String(user.role).toUpperCase() === 'ADMIN'
  const isAdminSelf = self && isAdminTarget

  // Section structure: an array of { label, items[] } so the divider
  // between groups is implicit.
  const sections = [
    {
      label: 'Identity',
      items: [
        {
          key: 'edit',
          label: 'Edit details',
          icon: Pencil,
          onClick: () => onAction('edit'),
        },
        {
          key: 'role',
          label: 'Change role',
          icon: ShieldCheck,
          onClick: () => onAction('role'),
          disabled: isAdminSelf,
          disabledReason: "Admins can't change their own role",
        },
        {
          key: 'permissions',
          label: 'Edit permissions',
          icon: KeyRound,
          onClick: () => onAction('permissions'),
          disabled: isAdminTarget,
          disabledReason:
            "Admins inherit every permission from their role — demote to Employee first to grant a custom set",
        },
        {
          key: 'audit',
          label: 'View activity',
          icon: History,
          onClick: () => onAction('audit'),
        },
      ],
    },
    {
      label: 'Access',
      items: [
        isLocked
          ? {
              key: 'unlock',
              label: 'Unlock account',
              icon: Unlock,
              accent: 'text-emerald-600 dark:text-emerald-400',
              onClick: () => onAction('unlock'),
            }
          : {
              key: 'lock',
              label: 'Lock account',
              icon: Lock,
              accent: 'text-rose-600 dark:text-rose-400',
              onClick: () => onAction('lock'),
              disabled: self,
              disabledReason: "Admins can't lock themselves",
            },
        failed > 0
          ? {
              key: 'resetAttempts',
              label: `Reset ${failed} failed attempt${failed === 1 ? '' : 's'}`,
              icon: RotateCcw,
              onClick: () => onAction('resetAttempts'),
            }
          : null,
      ].filter(Boolean),
    },
    {
      label: 'Sessions',
      items: [
        {
          key: 'forceLogout',
          label: 'Force logout',
          icon: LogOut,
          onClick: () => onAction('forceLogout'),
          disabled: self,
          disabledReason: 'Use sign-out everywhere from your own profile',
        },
      ],
    },
    {
      label: 'Account state',
      items: [
        isDisabled
          ? {
              key: 'activate',
              label: 'Enable account',
              icon: Check,
              accent: 'text-emerald-600 dark:text-emerald-400',
              onClick: () => onAction('activate'),
            }
          : {
              key: 'deactivate',
              label: 'Disable account',
              icon: ShieldOff,
              accent: 'text-rose-600 dark:text-rose-400',
              onClick: () => onAction('deactivate'),
              disabled: self,
              disabledReason: "Admins can't deactivate themselves",
            },
      ],
    },
    {
      label: 'Danger zone',
      items: [
        {
          key: 'delete',
          label: 'Delete permanently',
          icon: Trash2,
          accent: 'text-rose-600 dark:text-rose-400',
          onClick: () => onAction('delete'),
          disabled: self,
          disabledReason: "Admins can't delete themselves",
        },
      ],
    },
  ]

  return (
    <>
      {/* Wrap in a span so we can hold the trigger's bounding rect
          without depending on whether @base-ui's Button forwards
          refs. Inline-block matches the button's layout exactly. */}
      <span ref={buttonRef} className="inline-block">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => setOpen((v) => !v)}
          disabled={Boolean(pending)}
          aria-haspopup="menu"
          aria-expanded={open}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <UserCog className="size-3.5" />
          )}
          Manage
          <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} />
        </Button>
      </span>
      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 100 }}
              className="w-64 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl shadow-black/20"
            >
              {sections.map((section, idx) => (
                <div key={section.label}>
                  {idx > 0 ? <div className="my-1 h-px bg-border" /> : null}
                  <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {section.label}
                  </p>
                  {section.items.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        disabled={item.disabled}
                        title={item.disabled ? item.disabledReason : undefined}
                        onClick={() => {
                          setOpen(false)
                          if (!item.disabled) item.onClick()
                        }}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
                          item.disabled
                            ? 'cursor-not-allowed text-muted-foreground/50'
                            : 'hover:bg-muted/60',
                        )}
                      >
                        <Icon
                          className={cn(
                            'size-3.5',
                            !item.disabled && (item.accent || 'text-muted-foreground'),
                          )}
                        />
                        {item.label}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

// Confirm dialog for lock/unlock/force-logout/reset-attempts. Drives
// the copy off `action` so we don't end up with four near-identical
// ConfirmDialog blocks in the parent.
const STATE_ACTION_COPY = {
  lock: {
    title: 'Lock this account?',
    body: (user) =>
      `${user.username || user.email} will be unable to sign in until you unlock them. Existing sessions are not revoked — pair with "Force logout" if you also want to kick them off active devices.`,
    confirmLabel: 'Lock account',
    variant: 'destructive',
  },
  unlock: {
    title: 'Unlock this account?',
    body: (user) =>
      `${user.username || user.email} will be able to sign in again. Their failed-login counter is also cleared.`,
    confirmLabel: 'Unlock',
    variant: 'default',
  },
  forceLogout: {
    title: 'Sign this user out everywhere?',
    body: (user) =>
      `Every active session for ${user.username || user.email} will be revoked. They'll be asked to sign in again on their next request from any device.`,
    confirmLabel: 'Force logout',
    variant: 'destructive',
  },
  resetAttempts: {
    title: 'Reset failed-login counter?',
    body: (user) => {
      const n = Number(user?.failedAttempts ?? 0)
      return `Zero out ${user.username || user.email}'s ${n} failed attempt${n === 1 ? '' : 's'}. Lock state is unchanged — if the account is locked, use Unlock instead.`
    },
    confirmLabel: 'Reset counter',
    variant: 'default',
  },
}

// ── Add user dialog ────────────────────────────────────────────────────
// Wraps /auth/register + an optional follow-up role bump. Validates
// inline so the admin doesn't have to round-trip for trivial typos
// (empty fields, password too short, mismatched confirm). Server
// errors (duplicate username, weak password the policy rejects, …)
// surface as `formError` below the form.
function AddUserDialog({ open, roles, isProcessing, onCancel, onSubmit }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState('EMPLOYEE')
  const [formError, setFormError] = useState('')

  // Reset every time the dialog re-opens so a previous attempt's
  // values don't bleed in.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName('')
    setUsername('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setRole('EMPLOYEE')
    setFormError('')
  }, [open])

  if (!open) return null

  // Mirror the static fallback used by RoleDialog so the role picker
  // works even if the catalog endpoint fails.
  const FALLBACK_ROLES = [
    { role: 'EMPLOYEE', authorities: [] },
    { role: 'ADMIN', authorities: [] },
  ]
  const roleItems = Array.isArray(roles) && roles.length > 0 ? roles : FALLBACK_ROLES

  const trimmedName = name.trim()
  const trimmedUsername = username.trim()
  const trimmedEmail = email.trim()
  const validationError = (() => {
    if (!trimmedName) return 'Name is required.'
    if (!trimmedUsername) return 'Username is required.'
    if (!/^[\w.-]{3,}$/.test(trimmedUsername))
      return 'Username must be at least 3 characters (letters, numbers, dot, underscore, hyphen).'
    if (!trimmedEmail) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return 'Enter a valid email address.'
    if (!password) return 'Password is required.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (password !== confirmPassword) return 'Passwords don’t match.'
    return ''
  })()

  const submit = async (event) => {
    event.preventDefault()
    if (validationError) {
      setFormError(validationError)
      return
    }
    setFormError('')
    try {
      await onSubmit({
        name: trimmedName,
        username: trimmedUsername,
        email: trimmedEmail,
        password,
        role,
      })
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not create user'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Add user"
    >
      <Card className="flex max-h-[90vh] w-full max-w-xl flex-col border-border bg-card shadow-lg shadow-black/15">
        <CardHeader className="space-y-2">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserPlus className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">Add a new user</CardTitle>
          <p className="text-sm text-muted-foreground">
            Creates the account immediately. Pick a role here, or set it from the user&rsquo;s row afterwards.
          </p>
          <p className="rounded-md border border-sky-500/30 bg-sky-500/5 px-2.5 py-1.5 text-xs leading-relaxed text-sky-800 dark:text-sky-300">
            <span className="font-semibold">Heads up:</span> new Employees get a default set
            seeded automatically &mdash; <span className="font-mono text-[11px]">read</span>,{' '}
            <span className="font-mono text-[11px]">create</span>, and{' '}
            <span className="font-mono text-[11px]">update</span> for every resource (no{' '}
            <span className="font-mono text-[11px]">remove</span> or{' '}
            <span className="font-mono text-[11px]">delete</span>). Open their row →{' '}
            <span className="font-mono text-[11px]">Edit permissions</span> to add or revoke
            from there. ADMIN accounts inherit every permission automatically.
          </p>
        </CardHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <CardContent className="flex-1 space-y-4 overflow-y-auto">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-user-name">Name</Label>
                <Input
                  id="add-user-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Akar Arkan"
                  disabled={isProcessing}
                  autoComplete="name"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-user-username">Username</Label>
                <Input
                  id="add-user-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="akar"
                  disabled={isProcessing}
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-user-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="add-user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="akar@example.com"
                  disabled={isProcessing}
                  autoComplete="email"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="add-user-password">Password</Label>
                <div className="relative">
                  <Input
                    id="add-user-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={isProcessing}
                    autoComplete="new-password"
                    className="pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-user-confirm">Confirm password</Label>
                <Input
                  id="add-user-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat the password"
                  disabled={isProcessing}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {roleItems.map((item) => {
                  const r = String(item.role || '').toUpperCase()
                  const meta = roleMetaFor(r)
                  const Icon = meta.icon
                  const isActive = role === r
                  const authorities = Array.isArray(item.authorities) ? item.authorities : []
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      disabled={isProcessing}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                        isActive
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-border bg-background hover:bg-muted/40',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60',
                          meta.accent,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                        {authorities.length > 0 ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {authorities.length} authorit
                            {authorities.length === 1 ? 'y' : 'ies'}
                          </p>
                        ) : null}
                      </div>
                      {isActive ? <Check className="mt-1 size-4 shrink-0 text-primary" /> : null}
                    </button>
                  )
                })}
              </div>
            </div>

            {formError ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isProcessing || Boolean(validationError)}
              className="gap-2"
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Create user
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

// ── Edit details dialog ────────────────────────────────────────────────
// Partial-update form for the user's identity fields. Only sends keys
// that actually changed so the audit row is precise. Inline validates
// trivial typos before round-tripping.
function EditUserDialog({ user, isProcessing, onCancel, onSubmit }) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')

  // Reset every time the dialog opens for a new user.
  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName(user.name ?? '')
    setUsername(user.username ?? '')
    setEmail(user.email ?? '')
    setFormError('')
  }, [user])

  if (!user) return null

  const trimmedName = name.trim()
  const trimmedUsername = username.trim()
  const trimmedEmail = email.trim()

  // Compute the diff so we send only what changed and so the Save
  // button can sit at "Nothing to save" until the admin actually
  // edits something.
  const changes = {}
  if (trimmedName && trimmedName !== (user.name ?? '')) changes.name = trimmedName
  if (trimmedUsername && trimmedUsername !== (user.username ?? '')) changes.username = trimmedUsername
  if (trimmedEmail && trimmedEmail.toLowerCase() !== String(user.email ?? '').toLowerCase())
    changes.email = trimmedEmail
  const isUnchanged = Object.keys(changes).length === 0

  const validationError = (() => {
    if (trimmedUsername && !/^[\w.-]{3,}$/.test(trimmedUsername))
      return 'Username must be at least 3 characters (letters, numbers, dot, underscore, hyphen).'
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      return 'Enter a valid email address.'
    return ''
  })()

  const submit = async (event) => {
    event.preventDefault()
    if (validationError) {
      setFormError(validationError)
      return
    }
    if (isUnchanged) return
    setFormError('')
    try {
      await onSubmit(changes)
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not update user'))
    }
  }

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit user"
    >
      <Card className="w-full max-w-lg border-border bg-card shadow-lg shadow-black/15">
        <CardHeader className="space-y-2">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Pencil className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">Edit user details</CardTitle>
          <p className="text-sm text-muted-foreground">
            Identity-only fields. Use the role / permissions actions to change what
            they&rsquo;re allowed to do.
          </p>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name">Name</Label>
              <Input
                id="edit-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={user.name || 'Display name'}
                disabled={isProcessing}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-username">Username</Label>
              <Input
                id="edit-user-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={user.username || 'username'}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="edit-user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={user.email || 'name@example.com'}
                  disabled={isProcessing}
                  className="pl-8"
                />
              </div>
            </div>

            {formError ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="flex items-center justify-between gap-2 border-t border-border bg-muted/20 px-6 py-4">
            <p className="text-xs text-muted-foreground">
              {isUnchanged
                ? 'No changes yet'
                : `${Object.keys(changes).length} field${Object.keys(changes).length === 1 ? '' : 's'} to update`}
            </p>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessing || isUnchanged || Boolean(validationError)}
                className="gap-2"
              >
                {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

function StateActionDialog({ dialog, isProcessing, onConfirm, onCancel }) {
  const action = dialog?.action
  const copy = action ? STATE_ACTION_COPY[action] : null
  return (
    <ConfirmDialog
      open={Boolean(dialog && copy)}
      title={copy?.title || ''}
      description={copy && dialog ? copy.body(dialog.user) : ''}
      confirmLabel={copy?.confirmLabel || 'Confirm'}
      confirmVariant={copy?.variant || 'default'}
      isProcessing={isProcessing}
      onConfirm={onConfirm}
      onOpenChange={(open) => {
        if (!open) onCancel()
      }}
    />
  )
}

// Group an authority list ("audio:read", "audio:create", …) into a
// resource → action[] map so the role preview reads as a tidy matrix
// instead of a 35-string blob. ROLE_* prefixes (e.g. "ROLE_ADMIN")
// are skipped — they're already represented by the role chip itself.
function groupAuthorities(list) {
  const out = new Map()
  if (!Array.isArray(list)) return out
  for (const raw of list) {
    if (typeof raw !== 'string') continue
    if (raw.startsWith('ROLE_')) continue
    const [resource, action] = raw.split(':', 2)
    if (!resource || !action) continue
    if (!out.has(resource)) out.set(resource, new Set())
    out.get(resource).add(action)
  }
  return out
}

// Stable resource ordering so the preview reads top-to-bottom in the
// same order across roles. Resources not in this list (future
// additions) sort alphabetically after the known set.
const RESOURCE_ORDER = [
  'audio',
  'video',
  'image',
  'text',
  'category',
  'person',
  'project',
  'user',
]
function sortedResources(resources) {
  return [...resources].sort((a, b) => {
    const ai = RESOURCE_ORDER.indexOf(a)
    const bi = RESOURCE_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

const ACTION_ORDER = ['read', 'create', 'update', 'remove', 'delete']
function sortedActions(actions) {
  return [...actions].sort((a, b) => {
    const ai = ACTION_ORDER.indexOf(a)
    const bi = ACTION_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

// Single-line resource summary used inside each role card. Renders
// "audio · video · image · …" so admins can see at a glance which
// surfaces the role touches without expanding a details panel.
function ResourceSummary({ groups }) {
  if (groups.size === 0) {
    return <span className="text-xs text-muted-foreground">No authorities</span>
  }
  const resources = sortedResources([...groups.keys()])
  return (
    <p className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
      {resources.map((r) => (
        <span
          key={r}
          className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-foreground/80"
          title={sortedActions([...groups.get(r)]).join(', ')}
        >
          {r}
          <span className="ml-1 text-muted-foreground">{groups.get(r).size}</span>
        </span>
      ))}
    </p>
  )
}

// Compute "+ added" / "− removed" between two authority lists for the
// diff banner that appears once the admin picks a non-current role.
function diffAuthorities(currentList, nextList) {
  const cur = new Set((currentList || []).filter((a) => !a.startsWith('ROLE_')))
  const nxt = new Set((nextList || []).filter((a) => !a.startsWith('ROLE_')))
  const added = [...nxt].filter((a) => !cur.has(a))
  const removed = [...cur].filter((a) => !nxt.has(a))
  return { added: sortedActions(added), removed: sortedActions(removed) }
}

// ── Role change dialog ─────────────────────────────────────────────────
function RoleDialog({ user, roles, isProcessing, onCancel, onSubmit }) {
  const [selected, setSelected] = useState(null)
  const [showFullDiff, setShowFullDiff] = useState(false)

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(String(user.role || '').toUpperCase())
    setShowFullDiff(false)
  }, [user])

  if (!user) return null

  // Catalog item shape: { role: 'ADMIN', authorities: [...] }
  // Tolerate the catalog being empty/older — fall back to a static
  // set so admins aren't blocked if the catalog endpoint hiccups.
  const FALLBACK_ROLES = [
    { role: 'EMPLOYEE', authorities: [] },
    { role: 'ADMIN', authorities: [] },
  ]
  const items = Array.isArray(roles) && roles.length > 0 ? roles : FALLBACK_ROLES
  const currentRole = String(user.role || '').toUpperCase()
  const isUnchanged = selected === currentRole

  // Look up the authority lists for the current and selected roles
  // for the diff banner. Falls back to the user's own
  // effectiveAuthorities when the catalog doesn't expose the role.
  const findRoleAuthorities = (role) => {
    const match = items.find((r) => String(r.role || '').toUpperCase() === role)
    if (match && Array.isArray(match.authorities)) return match.authorities
    return []
  }
  const currentAuth =
    findRoleAuthorities(currentRole).length > 0
      ? findRoleAuthorities(currentRole)
      : Array.isArray(user.effectiveAuthorities)
      ? user.effectiveAuthorities
      : []
  const selectedAuth = selected ? findRoleAuthorities(selected) : []
  const diff = diffAuthorities(currentAuth, selectedAuth)

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Change role"
    >
      <Card className="flex max-h-[90vh] w-full max-w-2xl flex-col border-border bg-card shadow-lg shadow-black/15">
        <CardHeader className="space-y-2">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">Change role</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick the role for{' '}
            <span className="font-semibold text-foreground">
              {user.username || user.email}
            </span>
            . Their inherited authorities switch immediately on the next request.
          </p>
        </CardHeader>
        <CardContent className="flex-1 space-y-3 overflow-y-auto">
          {items.map((item) => {
            const role = String(item.role || '').toUpperCase()
            const meta = roleMetaFor(role)
            const Icon = meta.icon
            const isActive = selected === role
            const isCurrent = currentRole === role
            const authorities = Array.isArray(item.authorities) ? item.authorities : []
            const groups = groupAuthorities(authorities)
            return (
              <button
                key={role}
                type="button"
                onClick={() => setSelected(role)}
                disabled={isProcessing}
                className={cn(
                  'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                  isActive
                    ? 'border-primary/50 bg-primary/5'
                    : 'border-border bg-background hover:bg-muted/40',
                )}
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60',
                    meta.accent,
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                    {isCurrent ? (
                      <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Current
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                      {authorities.filter((a) => !a.startsWith('ROLE_')).length} authorities
                    </span>
                  </div>
                  <ResourceSummary groups={groups} />
                </div>
                {isActive ? (
                  <Check className="mt-1 size-4 shrink-0 text-primary" />
                ) : null}
              </button>
            )
          })}

          {/* Diff banner — only renders when the admin picks something
              different from the current role. Lets them preview the
              exact authority list change before committing. */}
          {!isUnchanged && (diff.added.length > 0 || diff.removed.length > 0) ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Switching to {roleMetaFor(selected).label}
                </p>
                <button
                  type="button"
                  onClick={() => setShowFullDiff((v) => !v)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  {showFullDiff ? 'Hide details' : 'See details'}
                  <ChevronRight
                    className={cn('size-3 transition-transform', showFullDiff && 'rotate-90')}
                  />
                </button>
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                {diff.added.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Plus className="size-3" />
                    {diff.added.length} added
                  </span>
                ) : null}
                {diff.removed.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                    <Minus className="size-3" />
                    {diff.removed.length} removed
                  </span>
                ) : null}
              </div>
              {showFullDiff ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {diff.added.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">
                        Added
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {diff.added.map((a) => (
                          <span
                            key={a}
                            className="rounded border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0.5 font-mono text-[10px] text-emerald-700 dark:text-emerald-400"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {diff.removed.length > 0 ? (
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-600 dark:text-rose-400">
                        Removed
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {diff.removed.map((a) => (
                          <span
                            key={a}
                            className="rounded border border-rose-500/30 bg-rose-500/5 px-1.5 py-0.5 font-mono text-[10px] text-rose-700 dark:text-rose-400 line-through"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit(selected)}
            disabled={isProcessing || isUnchanged || !selected}
            className="gap-2"
          >
            {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
            {isUnchanged ? 'Already this role' : `Apply ${roleMetaFor(selected).label}`}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

// ── Permissions dialog ─────────────────────────────────────────────────
function PermissionsDialog({ user, permissionsCatalog, isProcessing, onCancel, onSubmit }) {
  // `selected` holds only the EXTRA permissions the admin wants the
  // user to have on top of their role. Role-inherited authorities are
  // shown as checked-and-locked but never live in this Set — the
  // backend's grant/revoke endpoints only mutate the extras table, so
  // diffing against `selected` would otherwise queue revokes for
  // permissions the role enforces unconditionally.
  const [selected, setSelected] = useState(new Set())

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(new Set(Array.isArray(user.extraPermissions) ? user.extraPermissions : []))
  }, [user])

  if (!user) return null

  const extra = Array.isArray(user.extraPermissions) ? user.extraPermissions : []
  // `effectiveAuthorities` includes the user's `ROLE_*` tag alongside
  // their granted permissions — strip it before treating this list as
  // a permission set, otherwise `ROLE_EMPLOYEE` would render as a
  // locked checkbox row in the matrix.
  const effective = (
    Array.isArray(user.effectiveAuthorities) ? user.effectiveAuthorities : []
  ).filter((a) => !String(a).startsWith('ROLE_'))
  // Anything in effective but NOT in the explicit extras came from
  // the role itself — those are the locked rows. With EMPLOYEE now
  // carrying zero baseline perms, this set is typically empty for
  // employees and only ADMIN has a non-empty inherited set.
  const inherited = new Set(effective.filter((p) => !extra.includes(p)))

  // Build the master list of perms to render: catalog first, then any
  // inherited / extra perm not in the catalog (defensive, in case the
  // backend adds an authority before the catalog endpoint is updated).
  const catalog = Array.isArray(permissionsCatalog) ? permissionsCatalog : []
  const seen = new Set()
  const all = []
  for (const p of [...catalog, ...effective, ...extra]) {
    const key = String(p)
    if (seen.has(key)) continue
    if (key.startsWith('ROLE_')) continue
    seen.add(key)
    all.push(key)
  }

  // Group permissions by their prefix ("audio:read" → "audio") so the
  // dialog reads as a tidy matrix instead of a 50-item flat list.
  const grouped = all.reduce((acc, p) => {
    const [group] = p.split(':', 1)
    const key = group || 'other'
    if (!acc.has(key)) acc.set(key, [])
    acc.get(key).push(p)
    return acc
  }, new Map())

  const toggle = (perm) => {
    if (inherited.has(perm)) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  const original = new Set(extra)
  const toGrant = [...selected].filter((p) => !original.has(p))
  const toRevoke = [...original].filter((p) => !selected.has(p))
  const isUnchanged = toGrant.length === 0 && toRevoke.length === 0

  const inheritedCount = inherited.size
  const extraCount = selected.size

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onCancel()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Edit permissions"
    >
      <Card className="flex max-h-[85vh] w-full max-w-2xl flex-col border-border bg-card shadow-lg shadow-black/15">
        <CardHeader className="space-y-2">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <KeyRound className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">Edit permissions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Permissions for{' '}
            <span className="font-semibold text-foreground">
              {user.username || user.email}
            </span>
            . Locked rows are inherited from their role; toggle the rest to grant
            or revoke. Changes apply immediately.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1.5 py-0.5 font-medium text-muted-foreground">
              <ShieldCheck className="size-3" />
              {inheritedCount} from role
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-1.5 py-0.5 font-medium text-emerald-700 dark:text-emerald-400">
              <KeyRound className="size-3" />
              {extraCount} extra
            </span>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {grouped.size === 0 ? (
            <p className="text-sm text-muted-foreground">
              No permissions are currently in the catalog. Reload to retry.
            </p>
          ) : (
            [...grouped.entries()].map(([group, perms]) => (
              <div key={group}>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group}
                </p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {perms.map((perm) => {
                    const isInherited = inherited.has(perm)
                    const isExtra = selected.has(perm)
                    const isOn = isInherited || isExtra
                    const locked = isInherited || isProcessing
                    return (
                      <label
                        key={perm}
                        title={
                          isInherited
                            ? 'Inherited from role — demote the user to revoke.'
                            : undefined
                        }
                        className={cn(
                          'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm transition-colors',
                          locked ? 'cursor-not-allowed' : 'cursor-pointer',
                          isInherited
                            ? 'border-border bg-muted/30 text-muted-foreground'
                            : isExtra
                            ? 'border-emerald-500/40 bg-emerald-500/5 text-foreground'
                            : 'border-border bg-background hover:bg-muted/40',
                          isProcessing && !isInherited && 'pointer-events-none opacity-60',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isOn}
                          onChange={() => toggle(perm)}
                          disabled={locked}
                          className="size-4 rounded border-border accent-primary"
                        />
                        <span className="flex-1 truncate font-mono text-xs">{perm}</span>
                        {isInherited ? (
                          <span className="shrink-0 rounded bg-background px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                            role
                          </span>
                        ) : null}
                      </label>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 border-t border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {isUnchanged
              ? 'No changes yet'
              : `${toGrant.length} to grant, ${toRevoke.length} to revoke`}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onSubmit({ toGrant, toRevoke })}
              disabled={isProcessing || isUnchanged}
              className="gap-2"
            >
              {isProcessing ? <Loader2 className="size-4 animate-spin" /> : null}
              Save permissions
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

function describePermissionDiff({ toGrant, toRevoke }) {
  const parts = []
  if (toGrant.length > 0) parts.push(`+${toGrant.length} granted`)
  if (toRevoke.length > 0) parts.push(`−${toRevoke.length} revoked`)
  return parts.join(' · ')
}

// ── Per-user audit log dialog ──────────────────────────────────────────
const AUDIT_PAGE_SIZE = 20

function UserAuditLogDialog({ user, onClose }) {
  const [page, setPage] = useState(0)
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Reset page whenever the dialog re-opens for a different user so
  // we don't carry "page 3" state from the previous viewing.
  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(0)
    setData(null)
    setError(null)
  }, [user])

  useEffect(() => {
    if (!user) return
    const ctrl = new AbortController()
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true)
    setError(null)
    getAdminUserAuditLogs(
      user.id,
      { page, size: AUDIT_PAGE_SIZE, sort: 'createdAt,desc' },
      { signal: ctrl.signal },
    )
      .then((response) => {
        if (cancelled) return
        setData(response)
      })
      .catch((err) => {
        if (cancelled || ctrl.signal.aborted) return
        setError(err)
      })
      .finally(() => {
        if (cancelled) return
        setIsLoading(false)
      })
    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [user, page])

  if (!user) return null

  const { items, meta } = unwrapFeedPage(data)
  // LIST is suppressed here for the same reason it's suppressed on the
  // global activity feed: it's noise. Backend stopped writing new ones,
  // but old DB rows still reference it.
  const visible = items.filter((row) => !isHiddenAction(row?.action))
  const totalPages = meta?.totalPages ?? (meta?.totalElements != null
    ? Math.max(1, Math.ceil(meta.totalElements / AUDIT_PAGE_SIZE))
    : null)
  const isFirstPage = page === 0
  const isLastPage = totalPages != null
    ? page >= totalPages - 1
    : items.length < AUDIT_PAGE_SIZE
  const hasAny = items.length > 0
  const hasVisible = visible.length > 0

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 px-4 py-6 backdrop-blur-[1px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="User activity"
    >
      <Card className="flex max-h-[85vh] w-full max-w-2xl flex-col border-border bg-card shadow-lg shadow-black/15">
        <CardHeader className="space-y-2">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <History className="size-5" />
          </div>
          <CardTitle className="text-lg font-semibold">Activity for {user.username || user.email}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Audit trail of admin actions on this account &mdash; role changes, permission
            grants, lock/unlock, sign-out, etc. Most recent first.
          </p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto space-y-2">
          {isLoading && !hasAny ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>{getErrorMessage(error, 'Could not load activity')}</span>
            </div>
          ) : !hasVisible ? (
            <EmptyState
              icon={History}
              title="No activity yet"
              description="Once an admin acts on this account, the changes show up here."
            />
          ) : (
            <ul className="space-y-2">
              {visible.map((row) => {
                const when = row.createdAt || row.timestamp || row.date
                const key = row.logId ?? row.id ?? `${row.action}-${when}`
                return <UserAuditRow key={key} row={row} />
              })}
            </ul>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2 border-t border-border bg-muted/20 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {meta?.totalElements != null
              ? `${meta.totalElements} event${meta.totalElements === 1 ? '' : 's'} total`
              : hasAny
              ? `Page ${page + 1}`
              : ''}
            {totalPages && totalPages > 1
              ? ` · page ${page + 1} of ${totalPages}`
              : ''}
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={isLoading || isFirstPage}
              className="gap-1"
            >
              <ChevronLeft className="size-3.5" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading || isLastPage}
              className="gap-1"
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
            <Button type="button" onClick={onClose} size="sm">
              Close
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

export { AdminUsersPage }
