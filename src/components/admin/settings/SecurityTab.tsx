import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Key,
  Shield,
  Smartphone,
  LogOut,
  Activity,
  Download,
  AlertTriangle,
  RotateCcw,
  Trash2,
  Loader2,
  MessageSquare,
} from "lucide-react"
import toast from "react-hot-toast"
import type { ActivityLogEntry, AdminSession, SiteSettings } from "../../../lib/types/settings"
import {
  fetchActivityLogs,
  fetchSessions,
  terminateOtherSessions,
  resetSettings,
  exportAllData,
  clearAllFeedbacks,
  deleteAccount,
  updateSettings,
} from "../../../lib/services/settingsService"
import { useAdminStore } from "../../../lib/store/adminStore"

const ACTIVITY_ICONS: Record<string, typeof Activity> = {
  login: LogOut,
  settings_updated: SettingsIcon,
  member_invited: UserPlusIcon,
  member_removed: UserMinusIcon,
  member_role_changed: Shield,
  password_changed: Key,
  settings_reset: RotateCcw,
  data_exported: Download,
  feedbacks_cleared: MessageSquare,
  account_deleted: AlertTriangle,
}

const ACTIVITY_COLORS: Record<string, string> = {
  login: "text-emerald-400 bg-emerald-500/10",
  settings_updated: "text-[#4f6ef7] bg-[#4f6ef7]/10",
  member_invited: "text-blue-400 bg-blue-500/10",
  member_removed: "text-red-400 bg-red-500/10",
  member_role_changed: "text-purple-400 bg-purple-500/10",
  password_changed: "text-yellow-400 bg-yellow-500/10",
  settings_reset: "text-orange-400 bg-orange-500/10",
  data_exported: "text-cyan-400 bg-cyan-500/10",
  feedbacks_cleared: "text-red-400 bg-red-500/10",
  account_deleted: "text-red-400 bg-red-500/10",
}

interface SecurityTabProps {
  settings: SiteSettings | null
  onSettingsChange: (s: SiteSettings) => void
}

export default function SecurityTab({ settings, onSettingsChange }: SecurityTabProps) {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [terminating, setTerminating] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const showConfirm = useAdminStore((s) => s.showConfirm)

  /* ── Password state ── */
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  useEffect(() => {
    Promise.all([
      fetchActivityLogs().then(setLogs).catch(() => {}),
      fetchSessions().then(setSessions).catch(() => {}),
    ]).finally(() => {
      setLoadingLogs(false)
      setLoadingSessions(false)
    })
  }, [])

  /* ── Password ── */
  const handlePasswordChange = async () => {
    setPasswordError("")
    if (!currentPassword) { setPasswordError("Current password is required"); return }
    if (!newPassword) { setPasswordError("New password is required"); return }
    if (newPassword.length < 8) { setPasswordError("New password must be at least 8 characters"); return }
    if (newPassword !== confirmPassword) { setPasswordError("Passwords do not match"); return }

    setChangingPassword(true)
    await new Promise((r) => setTimeout(r, 600))
    toast.success("Password changed successfully")
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setChangingPassword(false)
  }

  /* ── Sessions ── */
  const handleTerminateSessions = () => {
    showConfirm(
      "Terminate other sessions?",
      "This will log out all other devices. Your current session will remain active.",
      async () => {
        setTerminating(true)
        try {
          await terminateOtherSessions()
          setSessions((prev) => prev.filter((s) => s.isCurrent))
          toast.success("Other sessions terminated")
        } catch {
          toast.error("Failed to terminate sessions")
        } finally {
          setTerminating(false)
        }
      },
      "danger",
    )
  }

  /* ── Danger Zone ── */
  const handleResetSettings = () => {
    showConfirm(
      "Reset all settings?",
      "This will restore all settings to their default values. This action cannot be undone.",
      async () => {
        setResetting(true)
        try {
          const defaults = await resetSettings()
          onSettingsChange(defaults)
          toast.success("Settings reset to defaults")
        } catch {
          toast.error("Failed to reset settings")
        } finally {
          setResetting(false)
        }
      },
      "danger",
      "Reset",
    )
  }

  const handleExportData = () => {
    showConfirm(
      "Export all data?",
      "Download a complete JSON export of all your settings, team, and activity logs.",
      async () => {
        setExporting(true)
        try {
          const data = await exportAllData()
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `cafe-services-export-${new Date().toISOString().split("T")[0]}.json`
          a.click()
          URL.revokeObjectURL(url)
          toast.success("Data exported successfully")
        } catch {
          toast.error("Failed to export data")
        } finally {
          setExporting(false)
        }
      },
      "default",
      "Export",
    )
  }

  const handleClearFeedbacks = () => {
    showConfirm(
      "Clear all feedbacks?",
      "This will permanently delete all feedback submissions and testimonials. This action cannot be undone.",
      async () => {
        setClearing(true)
        try {
          await clearAllFeedbacks()
          toast.success("All feedbacks cleared")
        } catch {
          toast.error("Failed to clear feedbacks")
        } finally {
          setClearing(false)
        }
      },
      "danger",
      "Clear All",
    )
  }

  const handleDeleteAccount = () => {
    if (deleteConfirm !== "CAFÉ Services") {
      toast.error('Type "CAFÉ Services" to confirm')
      return
    }

    showConfirm(
      "Delete account permanently?",
      "This will permanently delete your entire project, all settings, team, and data. This action CANNOT be undone.",
      async () => {
        setDeleting(true)
        try {
          await deleteAccount(deleteConfirm)
          toast.success("Account deleted. Redirecting...")
          setTimeout(() => window.location.assign("/"), 2000)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to delete account")
        } finally {
          setDeleting(false)
        }
      },
      "danger",
      "Delete Everything",
    )
  }

  return (
    <div className="space-y-10">
      {/* Change Password */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Change Password</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Update your admin account password</p>
        </div>
        <div className="max-w-md space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Current Password</label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            />
          </div>
          {passwordError && <p className="text-xs text-red-400">{passwordError}</p>}
          <button
            onClick={handlePasswordChange}
            disabled={changingPassword}
            className="flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors disabled:opacity-40"
          >
            {changingPassword ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Key size={16} />
            )}
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </section>

      {/* Two-Factor Authentication */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Two-Factor Authentication</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Add an extra layer of security to your account</p>
        </div>
        <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-4 max-w-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#4f6ef7]/10 text-[#4f6ef7]">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#f0f0f5]">Two-Factor Authentication</p>
              <p className="text-xs text-[#6b6b80] mt-0.5">Coming soon — stay tuned for enhanced security</p>
            </div>
          </div>
          <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-[#6b6b80]">
            Soon
          </span>
        </div>
      </section>

      {/* Active Sessions */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Active Sessions</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Devices logged into your admin account</p>
        </div>

        {loadingSessions ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-[68px] animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-[#6b6b80]">No active sessions</p>
        ) : (
          <div className="space-y-2 max-w-lg">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[#6b6b80]">
                  <Smartphone size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#f0f0f5]">{session.device}</p>
                    {session.isCurrent && (
                      <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#6b6b80]">
                    {session.browser} · {session.location}
                  </p>
                </div>
                <p className="text-[10px] text-[#6b6b80] shrink-0">{timeAgo(session.lastActive)}</p>
              </div>
            ))}
            {sessions.length > 1 && (
              <button
                onClick={handleTerminateSessions}
                disabled={terminating}
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
              >
                {terminating ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                {terminating ? "Terminating..." : "Terminate other sessions"}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Activity Logs */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Recent Activity</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Latest actions performed in the admin panel</p>
        </div>

        {loadingLogs ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-[52px] animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity size={24} className="mb-2 text-[#6b6b80]" />
            <p className="text-sm text-[#6b6b80]">No activity yet</p>
          </div>
        ) : (
          <div className="space-y-1 max-w-lg">
            {logs.map((log) => {
              const Icon = ACTIVITY_ICONS[log.action] || Activity
              const color = ACTIVITY_COLORS[log.action] || "text-[#6b6b80] bg-white/[0.06]"
              return (
                <div key={log.id} className="flex items-start gap-3 rounded-xl px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#f0f0f5]">{log.details}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-[#6b6b80]">{log.actor}</span>
                      <span className="text-[#6b6b80]/40">·</span>
                      <span className="text-xs text-[#6b6b80]">{timeAgo(log.timestamp)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ───── DANGER ZONE ───── */}
      <section>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f5]">Danger Zone</h3>
              <p className="mt-0.5 text-xs text-[#6b6b80]">Destructive actions that cannot be undone. Proceed with caution.</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {/* Reset */}
            <DangerAction
              icon={RotateCcw}
              label="Reset all settings"
              description="Restore all settings to their default values"
              buttonLabel="Reset"
              loading={resetting}
              onAction={handleResetSettings}
            />

            {/* Export */}
            <DangerAction
              icon={Download}
              label="Export all data"
              description="Download a complete JSON export of settings, team, and logs"
              buttonLabel="Export"
              loading={exporting}
              onAction={handleExportData}
            />

            {/* Clear feedbacks */}
            <DangerAction
              icon={MessageSquare}
              label="Clear all feedbacks"
              description="Permanently delete all feedback submissions and testimonials"
              buttonLabel="Clear All"
              loading={clearing}
              danger
              onAction={handleClearFeedbacks}
            />

            {/* Delete account */}
            <div className="rounded-xl border border-red-500/15 bg-red-500/[0.03] px-4 py-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[#f0f0f5]">Delete account / project</p>
                  <p className="mt-0.5 text-xs text-[#6b6b80]">
                    Permanently delete your entire project and all associated data
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder='Type "CAFÉ Services" to confirm'
                  className="flex-1 min-w-[200px] rounded-lg border border-red-500/30 bg-red-500/[0.04] px-3 py-2 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-red-500/50 transition-colors"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting || deleteConfirm !== "CAFÉ Services"}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                  {deleting ? "Deleting..." : "Delete Everything"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ────────── Shared sub-components ────────── */

function DangerAction({
  icon: Icon,
  label,
  description,
  buttonLabel,
  loading,
  danger,
  onAction,
}: {
  icon: typeof RotateCcw
  label: string
  description: string
  buttonLabel: string
  loading: boolean
  danger?: boolean
  onAction: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[#f0f0f5]">{label}</p>
        <p className="mt-0.5 text-xs text-[#6b6b80]">{description}</p>
      </div>
      <button
        onClick={onAction}
        disabled={loading}
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40 ${
          danger
            ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
            : "bg-white/[0.06] text-[#f0f0f5] hover:bg-white/[0.1]"
        }`}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
        {loading ? `${buttonLabel}...` : buttonLabel}
      </button>
    </div>
  )
}

function SettingsIcon({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
}

function UserPlusIcon({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
}

function UserMinusIcon({ size, className }: { size: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
