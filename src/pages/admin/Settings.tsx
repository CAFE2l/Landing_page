import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Settings2, Bell, Users, Shield } from "lucide-react"
import type { SiteSettings } from "../../lib/types/settings"
import { fetchSettings } from "../../lib/services/settingsService"
import GeneralTab from "../../components/admin/settings/GeneralTab"
import NotificationsTab from "../../components/admin/settings/NotificationsTab"
import TeamTab from "../../components/admin/settings/TeamTab"
import SecurityTab from "../../components/admin/settings/SecurityTab"
import SettingsSkeleton from "../../components/admin/settings/SettingsSkeleton"

type TabId = "general" | "notifications" | "team" | "security"

interface TabDefinition {
  id: TabId
  label: string
  icon: typeof Settings2
  danger?: boolean
}

const TABS: TabDefinition[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "team", label: "Team", icon: Users },
  { id: "security", label: "Security", icon: Shield, danger: true },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("general")
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchSettings()
      setSettings(data)
    } catch (err) {
      setError("Failed to load settings. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Tab Bar */}
      <div className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-1 w-fit overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-all whitespace-nowrap ${
                isActive
                  ? "bg-white/[0.08] text-[#f0f0f5] border border-white/[0.06]"
                  : "text-[#6b6b80] hover:text-[#f0f0f5]"
              } ${tab.danger && !isActive ? "text-red-400/70 hover:text-red-300" : ""}
                ${tab.danger && isActive ? "text-red-300" : ""}`}
              aria-selected={isActive}
              role="tab"
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6">
        {loading ? (
          <SettingsSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={loadSettings} />
        ) : settings ? (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "general" && (
              <GeneralTab settings={settings} onSettingsChange={setSettings} />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab settings={settings} onSettingsChange={setSettings} />
            )}
            {activeTab === "team" && <TeamTab />}
            {activeTab === "security" && (
              <SecurityTab settings={settings} onSettingsChange={setSettings} />
            )}
          </motion.div>
        ) : null}
      </div>
    </motion.div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 mb-4">
        <AlertTriangle size={24} />
      </div>
      <p className="text-sm text-[#f0f0f5] font-medium mb-1">Something went wrong</p>
      <p className="text-xs text-[#6b6b80] mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}
