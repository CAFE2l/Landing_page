import { supabase, supabaseConfigured } from "../supabase/client"
import type {
  SiteSettings,
  TeamMember,
  ActivityLogEntry,
  AdminSession,
  MemberRole,
  ActivityAction,
} from "../types/settings"
import { DEFAULT_SETTINGS } from "../types/settings"

const SETTINGS_KEY = "cafe_admin_settings"
const TEAM_KEY = "cafe_admin_team"
const ACTIVITY_KEY = "cafe_admin_activity_logs"
const SESSIONS_KEY = "cafe_admin_sessions"

let settingsCache: SiteSettings | null = null

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function nowISO(): string {
  return new Date().toISOString()
}

function delay(ms = 300): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/* ───────── Setup default mock data ───────── */

function getDefaultTeam(): TeamMember[] {
  return [
    {
      id: "owner-1",
      name: "Admin",
      email: "admin@cafeservices.com",
      role: "owner",
      status: "active",
      avatarUrl: null,
      joinedAt: "2024-01-15T10:00:00.000Z",
    },
    {
      id: "member-1",
      name: "Ana Silva",
      email: "ana@cafeservices.com",
      role: "admin",
      status: "active",
      avatarUrl: null,
      joinedAt: "2024-03-20T14:30:00.000Z",
    },
    {
      id: "member-2",
      name: "Carlos Mendes",
      email: "carlos@cafeservices.com",
      role: "editor",
      status: "pending",
      avatarUrl: null,
      joinedAt: "2025-01-10T09:00:00.000Z",
    },
  ]
}

function getDefaultActivityLogs(): ActivityLogEntry[] {
  return [
    { id: "log-1", action: "login", actor: "Admin", details: "Logged in from Chrome on macOS", timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
    { id: "log-2", action: "settings_updated", actor: "Admin", details: "Updated site name and description", timestamp: new Date(Date.now() - 86400000).toISOString() },
    { id: "log-3", action: "member_invited", actor: "Admin", details: "Invited Carlos Mendes (editor)", timestamp: new Date(Date.now() - 3 * 86400000).toISOString() },
    { id: "log-4", action: "login", actor: "Ana Silva", details: "Logged in from Firefox on Windows", timestamp: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: "log-5", action: "settings_updated", actor: "Ana Silva", details: "Changed notification preferences", timestamp: new Date(Date.now() - 7 * 86400000).toISOString() },
  ]
}

function getDefaultSessions(): AdminSession[] {
  return [
    {
      id: "sess-current",
      device: "MacBook Pro",
      browser: "Chrome 125",
      location: "São Paulo, Brazil",
      ip: "191.xxx.xxx.1",
      lastActive: nowISO(),
      isCurrent: true,
    },
    {
      id: "sess-2",
      device: "iPhone 15",
      browser: "Safari",
      location: "Rio de Janeiro, Brazil",
      ip: "191.xxx.xxx.45",
      lastActive: new Date(Date.now() - 86400000).toISOString(),
      isCurrent: false,
    },
    {
      id: "sess-3",
      device: "Windows PC",
      browser: "Firefox 126",
      location: "Belo Horizonte, Brazil",
      ip: "191.xxx.xxx.78",
      lastActive: new Date(Date.now() - 3 * 86400000).toISOString(),
      isCurrent: false,
    },
  ]
}

/* ───────── LocalStorage helpers ───────── */

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T
  } catch { /* ignore */ }
  return fallback
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* storage full — ignore */ }
}

/* ───────── Settings CRUD ───────── */

export async function fetchSettings(): Promise<SiteSettings> {
  await delay()

  if (supabase && supabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .single()

      if (!error && data) {
        settingsCache = data as SiteSettings
        saveToStorage(SETTINGS_KEY, data)
        return data as SiteSettings
      }
    } catch { /* fall through to storage */ }
  }

  const cached = settingsCache ?? loadFromStorage<SiteSettings | null>(SETTINGS_KEY, null)
  if (cached) return cached

  saveToStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  settingsCache = DEFAULT_SETTINGS
  return DEFAULT_SETTINGS
}

export async function updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
  await delay(400)

  const current = await fetchSettings()
  const merged: SiteSettings = { ...current, ...updates }

  if (supabase && supabaseConfigured) {
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert({ id: 1, ...merged, updated_at: nowISO() })

      if (!error) {
        settingsCache = merged
        saveToStorage(SETTINGS_KEY, merged)
        await logActivity("settings_updated", "Admin", "Updated site settings")
        return merged
      }
    } catch { /* fall through */ }
  }

  settingsCache = merged
  saveToStorage(SETTINGS_KEY, merged)
  await logActivity("settings_updated", "Admin", "Updated site settings")
  return merged
}

export async function uploadLogo(file: File): Promise<string> {
  await delay(500)

  if (supabase && supabaseConfigured) {
    try {
      const ext = file.name.split(".").pop() ?? "png"
      const path = `logos/logo-${Date.now()}.${ext}`
      const { data, error } = await supabase.storage
        .from("admin-assets")
        .upload(path, file, { upsert: true })

      if (!error && data) {
        const { data: urlData } = supabase.storage
          .from("admin-assets")
          .getPublicUrl(data.path)
        return urlData.publicUrl
      }
    } catch { /* fall through */ }
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(file)
  })
}

/* ───────── Team ───────── */

export async function fetchTeam(): Promise<TeamMember[]> {
  await delay(300)

  if (supabase && supabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, created_at")
        .in("role", ["admin", "owner"])

      if (!error && data && data.length > 0) {
        const members: TeamMember[] = data.map((p: Record<string, unknown>) => ({
          id: String(p.id),
          name: String((p as { full_name?: string }).full_name ?? (p as { email?: string }).email?.split("@")[0] ?? "Unknown"),
          email: String((p as { email?: string }).email ?? ""),
          role: ((p as { role?: string }).role === "owner" ? "owner" : "admin") as MemberRole,
          status: "active" as const,
          avatarUrl: String((p as { avatar_url?: string }).avatar_url ?? ""),
          joinedAt: String((p as { created_at?: string }).created_at ?? nowISO()),
        }))
        saveToStorage(TEAM_KEY, members)
        return members
      }
    } catch { /* fall through */ }
  }

  return loadFromStorage<TeamMember[]>(TEAM_KEY, getDefaultTeam())
}

export async function inviteMember(email: string, role: MemberRole): Promise<TeamMember> {
  await delay(500)

  if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address")
  }

  const member: TeamMember = {
    id: generateId(),
    name: email.split("@")[0],
    email,
    role,
    status: "pending",
    avatarUrl: null,
    joinedAt: nowISO(),
  }

  const team = await fetchTeam()
  if (team.some((m) => m.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("Member already exists")
  }

  const updated = [...team, member]
  saveToStorage(TEAM_KEY, updated)
  await logActivity("member_invited", "Admin", `Invited ${email} (${role})`)
  return member
}

export async function updateMemberRole(memberId: string, role: MemberRole): Promise<void> {
  await delay(300)
  const team = await fetchTeam()
  const member = team.find((m) => m.id === memberId)
  if (!member) throw new Error("Member not found")
  if (member.role === "owner") throw new Error("Cannot change owner role")

  const updated = team.map((m) => (m.id === memberId ? { ...m, role } : m))
  saveToStorage(TEAM_KEY, updated)
  await logActivity("member_role_changed", "Admin", `Changed ${member.email} role to ${role}`)
}

export async function removeMember(memberId: string): Promise<void> {
  await delay(400)
  const team = await fetchTeam()
  const member = team.find((m) => m.id === memberId)
  if (!member) throw new Error("Member not found")
  if (member.role === "owner") throw new Error("Cannot remove the owner")

  const updated = team.filter((m) => m.id !== memberId)
  saveToStorage(TEAM_KEY, updated)
  await logActivity("member_removed", "Admin", `Removed ${member.email}`)
}

/* ───────── Activity Logs ───────── */

export async function fetchActivityLogs(): Promise<ActivityLogEntry[]> {
  await delay(300)

  if (supabase && supabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("admin_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)

      if (!error && data) {
        const logs: ActivityLogEntry[] = (data as Record<string, unknown>[]).map((row) => {
          const meta = row.metadata as Record<string, unknown> | null ?? {}
          return {
            id: String(row.id),
            action: (row.action as ActivityAction) ?? "login",
            actor: String(meta.actor ?? "Admin"),
            details: String(meta.details ?? ""),
            timestamp: String(row.created_at ?? nowISO()),
          }
        })
        saveToStorage(ACTIVITY_KEY, logs)
        return logs
      }
    } catch { /* fall through */ }
  }

  return loadFromStorage<ActivityLogEntry[]>(ACTIVITY_KEY, getDefaultActivityLogs())
}

async function logActivity(action: ActivityAction, actor: string, details: string): Promise<void> {
  const entry: ActivityLogEntry = {
    id: generateId(),
    action,
    actor,
    details,
    timestamp: nowISO(),
  }

  if (supabase && supabaseConfigured) {
    try {
      await supabase.from("admin_activity_log").insert({
        action,
        target_type: "settings",
        metadata: { actor, details },
      })
    } catch { /* ignore */ }
  }

  const logs = loadFromStorage<ActivityLogEntry[]>(ACTIVITY_KEY, [])
  logs.unshift(entry)
  if (logs.length > 50) logs.length = 50
  saveToStorage(ACTIVITY_KEY, logs)
}

/* ───────── Sessions ───────── */

export async function fetchSessions(): Promise<AdminSession[]> {
  await delay(200)
  return loadFromStorage<AdminSession[]>(SESSIONS_KEY, getDefaultSessions())
}

export async function terminateOtherSessions(): Promise<void> {
  await delay(400)
  const sessions = await fetchSessions()
  const current = sessions.find((s) => s.isCurrent)
  const updated = current ? [current] : []
  saveToStorage(SESSIONS_KEY, updated)
  await logActivity("settings_updated", "Admin", "Terminated other sessions")
}

/* ───────── Dangerous actions ───────── */

export async function resetSettings(): Promise<SiteSettings> {
  await delay(500)
  settingsCache = null
  saveToStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
  await logActivity("settings_reset", "Admin", "Reset all settings to defaults")
  return DEFAULT_SETTINGS
}

export async function exportAllData(): Promise<Record<string, unknown>> {
  await delay(600)
  await logActivity("data_exported", "Admin", "Exported all data")

  const settings = await fetchSettings()
  const team = await fetchTeam()
  const logs = await fetchActivityLogs()

  return {
    exportedAt: nowISO(),
    version: "1.0",
    settings,
    team,
    activityLogs: logs,
  }
}

export async function clearAllFeedbacks(): Promise<void> {
  await delay(500)

  if (supabase && supabaseConfigured) {
    try {
      await supabase.from("feedback_posts").delete().neq("id", "0")
    } catch { /* fall through */ }
  }

  await logActivity("feedbacks_cleared", "Admin", "Cleared all feedbacks")
}

export async function deleteAccount(projectName: string): Promise<void> {
  if (projectName !== "CAFÉ Services") {
    throw new Error("Project name does not match")
  }
  await delay(800)
  await logActivity("account_deleted", "Admin", "Account deleted")
  localStorage.clear()
}

/* ───────── Notification test ───────── */

export async function sendTestNotification(): Promise<void> {
  await delay(600)
}
