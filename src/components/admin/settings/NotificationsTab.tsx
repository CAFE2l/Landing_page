import { useState, useEffect } from "react"
import { Save, Send } from "lucide-react"
import toast from "react-hot-toast"
import type { SiteSettings } from "../../../lib/types/settings"
import { updateSettings, sendTestNotification } from "../../../lib/services/settingsService"

interface NotificationsTabProps {
  settings: SiteSettings
  onSettingsChange: (settings: SiteSettings) => void
}

const TOGGLE_CLASS =
  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f6ef7] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0f]"

export default function NotificationsTab({ settings, onSettingsChange }: NotificationsTabProps) {
  const [form, setForm] = useState<SiteSettings>({ ...settings })
  const [saving, setSaving] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [emailError, setEmailError] = useState("")

  useEffect(() => {
    setForm({ ...settings })
  }, [settings])

  const update = (key: keyof SiteSettings, value: unknown) => {
    const next = { ...form, [key]: value }
    setForm(next)
    setDirty(true)
  }

  const validateEmail = (email: string): boolean => {
    if (!email.trim()) {
      setEmailError("Notification email is required")
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Invalid email format")
      return false
    }
    setEmailError("")
    return true
  }

  const handleSave = async () => {
    if (!validateEmail(form.notificationEmail)) {
      toast.error("Please fix the email validation error")
      return
    }

    setSaving(true)
    try {
      const updated = await updateSettings(form)
      onSettingsChange(updated)
      setDirty(false)
      toast.success("Notification settings saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setSendingTest(true)
    try {
      await sendTestNotification()
      toast.success("Test notification sent! Check your inbox.")
    } catch {
      toast.error("Failed to send test notification")
    } finally {
      setSendingTest(false)
    }
  }



  return (
    <div className="space-y-8">
      {/* Email Notifications */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Email Notifications</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Control which events trigger email alerts</p>
        </div>

        <div className="space-y-3">
          <ToggleRow
            enabled={form.emailNotificationsEnabled}
            onChange={(v) => update("emailNotificationsEnabled", v)}
            label="Enable email notifications"
            description="Master switch for all email notifications"
          />

          {form.emailNotificationsEnabled && (
            <div className="ml-6 space-y-3 border-l border-white/[0.06] pl-4">
              <ToggleRow
                enabled={form.notifyNewFeedback}
                onChange={(v) => update("notifyNewFeedback", v)}
                label="New feedback submission"
                description="When a client submits new feedback or testimonial"
              />
              <ToggleRow
                enabled={form.notifyNewClient}
                onChange={(v) => update("notifyNewClient", v)}
                label="New client / lead"
                description="When a new client registers or submits a contact form"
              />
              <ToggleRow
                enabled={form.notifyNewOrder}
                onChange={(v) => update("notifyNewOrder", v)}
                label="New service order"
                description="When a client places a new service order"
              />
            </div>
          )}
        </div>
      </section>

      {/* Notification Email & Digest */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Delivery Settings</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Where and how often notifications are sent</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="notificationEmail" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">
              Notification Email <span className="text-red-400">*</span>
            </label>
            <input
              id="notificationEmail"
              type="email"
              value={form.notificationEmail}
              onChange={(e) => {
                update("notificationEmail", e.target.value)
                if (emailError) validateEmail(e.target.value)
              }}
              onBlur={(e) => validateEmail(e.target.value)}
              className={`w-full max-w-md rounded-lg border bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none transition-colors placeholder:text-[#6b6b80] ${
                emailError
                  ? "border-red-500/50 focus:border-red-500"
                  : "border-white/[0.08] focus:border-[#4f6ef7]/50"
              }`}
              placeholder="admin@example.com"
            />
            {emailError && <p className="mt-1 text-xs text-red-400">{emailError}</p>}
          </div>

          <div>
            <label htmlFor="digestFrequency" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Digest Frequency</label>
            <select
              id="digestFrequency"
              value={form.digestFrequency}
              onChange={(e) => update("digestFrequency", e.target.value)}
              className="w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            >
              <option value="daily" className="bg-[#050508]">Daily summary</option>
              <option value="weekly" className="bg-[#050508]">Weekly summary</option>
              <option value="none" className="bg-[#050508]">No digest</option>
            </select>
            <p className="mt-1 text-xs text-[#6b6b80]">
              {form.digestFrequency === "none"
                ? "Only individual notifications will be sent"
                : `Receive a ${form.digestFrequency} summary of all activity`}
            </p>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 border-t border-white/[0.06] pt-6 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>

        <button
          onClick={handleTest}
          disabled={sendingTest || !form.notificationEmail.trim()}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] hover:bg-white/[0.08] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {sendingTest ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
          ) : (
            <Send size={14} />
          )}
          {sendingTest ? "Sending..." : "Send Test"}
        </button>

        {dirty && (
          <span className="text-xs text-yellow-400/80 bg-yellow-400/10 px-2.5 py-1 rounded-full">
            Unsaved changes
          </span>
        )}
      </div>
    </div>
  )
}

function ToggleRow({
  enabled,
  onChange,
  label,
  description,
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
      <div className="min-w-0 flex-1 pr-4">
        <p className="text-sm font-medium text-[#f0f0f5]">{label}</p>
        <p className="mt-0.5 text-xs text-[#6b6b80]">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        onClick={() => onChange(!enabled)}
        className={`${TOGGLE_CLASS} ${enabled ? "bg-[#4f6ef7]" : "bg-white/[0.12]"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  )
}
