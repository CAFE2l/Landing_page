import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { UserPlus, Shield, Trash2, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import type { TeamMember, MemberRole } from "../../../lib/types/settings"
import { fetchTeam, inviteMember, updateMemberRole, removeMember } from "../../../lib/services/settingsService"
import { useAdminStore } from "../../../lib/store/adminStore"

const ROLE_OPTIONS: { value: MemberRole; label: string; description: string }[] = [
  { value: "owner", label: "Owner", description: "Full access to everything" },
  { value: "admin", label: "Admin", description: "Can manage settings and content" },
  { value: "editor", label: "Editor", description: "Can manage feedback and clients" },
  { value: "viewer", label: "Viewer", description: "Read-only access" },
]

const ROLE_BADGE: Record<MemberRole, string> = {
  owner: "bg-yellow-500/10 text-yellow-400",
  admin: "bg-[#4f6ef7]/10 text-[#4f6ef7]",
  editor: "bg-green-500/10 text-green-400",
  viewer: "bg-white/[0.06] text-[#6b6b80]",
}

export default function TeamTab() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<MemberRole>("editor")
  const [inviting, setInviting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [changingRole, setChangingRole] = useState<string | null>(null)
  const showConfirm = useAdminStore((s) => s.showConfirm)

  const loadTeam = async () => {
    setLoading(true)
    try {
      const data = await fetchTeam()
      setMembers(data)
    } catch {
      toast.error("Failed to load team members")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTeam()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error("Invalid email address")
      return
    }

    setInviting(true)
    try {
      const member = await inviteMember(inviteEmail.trim(), inviteRole)
      setMembers((prev) => [...prev, member])
      setInviteEmail("")
      toast.success(`Invitation sent to ${member.email}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to invite member")
    } finally {
      setInviting(false)
    }
  }

  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    setChangingRole(memberId)
    try {
      await updateMemberRole(memberId, role)
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)))
      toast.success("Role updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update role")
    } finally {
      setChangingRole(null)
    }
  }

  const handleRemove = (member: TeamMember) => {
    if (member.role === "owner") {
      toast.error("Cannot remove the owner")
      return
    }

    showConfirm(
      `Remove ${member.name}?`,
      `This will revoke all access for ${member.email}. They will need a new invitation to rejoin.`,
      async () => {
        setRemovingId(member.id)
        try {
          await removeMember(member.id)
          setMembers((prev) => prev.filter((m) => m.id !== member.id))
          toast.success(`${member.name} has been removed`)
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Failed to remove member")
        } finally {
          setRemovingId(null)
        }
      },
      "danger",
      "Remove",
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-[72px] animate-pulse rounded-xl bg-white/[0.04]" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Invite */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Invite Member</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Send an invitation to join the admin panel</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px] max-w-xs">
            <label htmlFor="inviteEmail" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Email Address</label>
            <input
              id="inviteEmail"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              placeholder="colleague@example.com"
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="inviteRole" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Role</label>
            <select
              id="inviteRole"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as MemberRole)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            >
              {ROLE_OPTIONS.filter((r) => r.value !== "owner").map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#050508]">{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleInvite}
            disabled={inviting}
            className="flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors disabled:opacity-40"
          >
            {inviting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <UserPlus size={16} />
            )}
            {inviting ? "Sending..." : "Send Invite"}
          </button>
        </div>
      </section>

      {/* Members */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Team Members ({members.length})</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Manage who has access to the admin panel</p>
        </div>

        {members.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <UsersIcon size={32} className="mb-3 text-[#6b6b80]" />
            <p className="text-sm text-[#6b6b80]">No team members yet</p>
            <p className="text-xs text-[#6b6b80]/60 mt-1">Invite your first member above</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {members.map((member) => {
                const isOwner = member.role === "owner"
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] text-xs font-bold text-white">
                      {member.name[0]?.toUpperCase() || "?"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#f0f0f5] truncate">{member.name}</p>
                        {isOwner && (
                          <Shield size={12} className="text-yellow-400 shrink-0" />
                        )}
                        {member.status === "pending" && (
                          <span className="flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                            <Loader2 size={10} className="animate-spin" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6b6b80] truncate">{member.email}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as MemberRole)}
                          disabled={isOwner || changingRole === member.id}
                          className={`rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs font-semibold outline-none transition-colors focus:border-[#4f6ef7]/50 ${
                            ROLE_BADGE[member.role]
                          } ${isOwner ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}`}
                          aria-label={`Change role for ${member.name}`}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-[#050508] text-[#f0f0f5]">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {changingRole === member.id && (
                          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40">
                            <Loader2 size={12} className="animate-spin text-[#4f6ef7]" />
                          </div>
                        )}
                      </div>

                      {!isOwner && (
                        <button
                          onClick={() => handleRemove(member)}
                          disabled={removingId === member.id}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b6b80] hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"
                          aria-label={`Remove ${member.name}`}
                        >
                          {removingId === member.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  )
}

function UsersIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
