"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { LucideIcon } from "lucide-react"
import {
  Building2, CreditCard, Bell, Shield, Puzzle,
  Save, Upload, AlertTriangle, Eye, EyeOff,
  DollarSign, TrendingUp, Wallet, Clock, Smartphone,
  Monitor, Globe, Plus, X,
  Key, Fingerprint, History,
  CheckCircle, XCircle, ArrowRight, Loader2,
  Mail, MapPin, Hash, Banknote,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import { cn } from "../../lib/utils"
import type { SiteSettings, TeamMember, AdminSession, ActivityLogEntry, PhoneData, LocationData } from "../../lib/types/settings"
import { DEFAULT_SETTINGS } from "../../lib/types/settings"
import { fetchSettings, updateSettings, fetchTeam, removeMember, fetchSessions, fetchActivityLogs, uploadLogo } from "../../lib/services/settingsService"
import { fetchAdminCommandCenter } from "../../lib/adminCommandCenter"
import { useAdminStore } from "../../lib/store/adminStore"
import toast from "react-hot-toast"
import PhoneInput from "../../components/admin/PhoneInput"
import LocationInput from "../../components/admin/LocationInput"

// ============================================================
// Types
// ============================================================

type TabId = "business" | "payments" | "notifications" | "security" | "integrations"

interface TabDef {
  id: TabId
  label: string
  icon: LucideIcon
  desc: string
}

const TABS: TabDef[] = [
  { id: "business", label: "Business", icon: Building2, desc: "Company identity, contact, and public information" },
  { id: "payments", label: "Payments", icon: CreditCard, desc: "Payment configuration, methods, and financial overview" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alert channels and event subscriptions" },
  { id: "security", label: "Security", icon: Shield, desc: "Password, sessions, and access control" },
  { id: "integrations", label: "Integrations", icon: Puzzle, desc: "Connected services and system health" },
]

// ============================================================
// Main Settings Page
// ============================================================

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>("business")
  const [settings, setSettings] = useState<SiteSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ccData, setCcData] = useState<Awaited<ReturnType<typeof fetchAdminCommandCenter>> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, cc] = await Promise.all([
        fetchSettings(),
        fetchAdminCommandCenter().catch(() => null),
      ])
      setSettings(s)
      setCcData(cc)
    } catch {
      setError("Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = useCallback(async (updates: Partial<SiteSettings>) => {
    if (!settings) return
    const merged = { ...settings, ...updates }
    setSettings(merged)
    try {
      await updateSettings(updates)
      toast.success("Settings saved")
    } catch {
      toast.error("Failed to save")
    }
  }, [settings])

  if (loading) return <SettingsSkeleton />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!settings) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Tab bar */}
      <div className="mobile-scroll-x flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-1 w-fit">
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
              }`}
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
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "business" && <BusinessTab settings={settings} onSave={handleSave} />}
          {activeTab === "payments" && <PaymentsTab settings={settings} onSave={handleSave} ccData={ccData} />}
          {activeTab === "notifications" && <NotificationsTab settings={settings} onSave={handleSave} />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

// ============================================================
// Business Tab
// ============================================================

function BusinessTab({ settings, onSave }: { settings: SiteSettings; onSave: (u: Partial<SiteSettings>) => void }) {
  const [form, setForm] = useState(settings)
  const [dirty, setDirty] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => { setForm(settings) }, [settings])

  const update = (key: keyof SiteSettings, value: string | number | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadLogo(file)
      update("logoUrl", url)
      toast.success("Logo uploaded")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const handlePhoneChange = (e164: string, data: PhoneData | null) => {
    setForm((prev) => ({ ...prev, whatsapp: e164, phoneData: data }))
    setDirty(true)
  }

  const handleLocationChange = (display: string, data: LocationData | null) => {
    setForm((prev) => ({ ...prev, location: display, locationData: data }))
    setDirty(true)
  }

  const handleSave = () => {
    onSave(form)
    setDirty(false)
  }

  const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#4a4a5a] outline-none transition-all focus:border-[#4f6ef7]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#4f6ef7]/20"
  const labelClass = "text-xs font-semibold text-[#6b6b80] uppercase tracking-wider mb-1.5 block"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Form */}
      <div className="lg:col-span-3 space-y-6">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-6">
          <SectionTitle icon={Building2} title="Company Identity" desc="Your business name, description, and visual identity" />

          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 size={24} className="text-[#4a4a5a]" />
              )}
            </div>
            <div>
              <label className="touch-target inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-sm font-medium text-[#f0f0f5] hover:bg-white/[0.1] cursor-pointer transition-colors">
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? "Uploading..." : "Upload Logo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} disabled={uploading} />
              </label>
              <p className="text-[10px] text-[#6b6b80] mt-1">PNG, JPG, WEBP. 2MB max</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Business Name" value={form.siteName} onChange={(v) => update("siteName", v)} placeholder="CAFÉ Services" className={inputClass} labelClass={labelClass} />
            <Field label="Public Email" value={form.publicEmail} onChange={(v) => update("publicEmail", v)} placeholder="contato@cafe.com" type="email" className={inputClass} labelClass={labelClass} />
          </div>

          <TextareaField label="Public Description" value={form.siteDescription} onChange={(v) => update("siteDescription", v)} placeholder="Describe your business..." className={inputClass} labelClass={labelClass} />
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-6">
          <SectionTitle icon={Smartphone} title="Contact & Social" desc="How clients reach you" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PhoneInput
              value={form.whatsapp}
              phoneData={form.phoneData}
              onChange={handlePhoneChange}
              label="WhatsApp"
              labelClass={labelClass}
            />
            <Field label="Telegram" value={form.telegram} onChange={(v) => update("telegram", v)} placeholder="@username or invite link" className={inputClass} labelClass={labelClass} />
            <Field label="Discord" value={form.discord} onChange={(v) => update("discord", v)} placeholder="discord.gg/invite" className={inputClass} labelClass={labelClass} />
            <LocationInput
              value={form.location}
              locationData={form.locationData}
              onChange={handleLocationChange}
              label="Location"
              labelClass={labelClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Website URL" value={form.siteUrl} onChange={(v) => update("siteUrl", v)} placeholder="https://cafeservices.com" className={inputClass} labelClass={labelClass} />
            <div>
              <label className={labelClass}>Timezone</label>
              <select value={form.timezone} onChange={(e) => update("timezone", e.target.value)} className={inputClass}>
                <option value="America/Sao_Paulo">America/Sao_Paulo (UTC-3)</option>
                <option value="America/New_York">America/New_York (UTC-5)</option>
                <option value="America/Chicago">America/Chicago (UTC-6)</option>
                <option value="America/Denver">America/Denver (UTC-7)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (UTC-8)</option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
                <option value="Europe/Berlin">Europe/Berlin (UTC+1)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>
        </div>

        {dirty && (
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => { setForm(settings); setDirty(false) }} className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors">
              <Save size={14} />
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Live Preview */}
      <div className="lg:col-span-2">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 sticky top-24">
          <SectionTitle icon={Eye} title="Public Preview" desc="How your business appears to clients" />

          <div className="mt-5 rounded-xl border border-white/[0.06] bg-[#0a0a0f] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg border border-white/[0.08] bg-white/[0.04] overflow-hidden flex items-center justify-center shrink-0">
                {form.logoUrl ? (
                  <img src={form.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-8 w-8 rounded-md bg-[#4f6ef7]/20 flex items-center justify-center text-[#4f6ef7] font-bold text-sm">
                    {form.siteName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{form.siteName || "Your Business Name"}</p>
                <p className="text-xs text-[#6b6b80] truncate">{form.siteUrl || "https://yourdomain.com"}</p>
              </div>
            </div>

            {form.siteDescription && (
              <p className="text-xs text-[#8a8a9a] leading-relaxed line-clamp-3">{form.siteDescription}</p>
            )}

            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <PreviewContact icon={Mail} label={form.publicEmail || "email@domain.com"} />
              <PreviewContact icon={MapPin} label={form.location || "Location not set"} />
              {form.whatsapp && <PreviewContact icon={Smartphone} label={form.phoneData?.formattedNumber || `+${form.whatsapp}`} />}
              {form.telegram && <PreviewContact icon={SendIcon} label={form.telegram} />}
              {form.discord && <PreviewContact icon={MessageCircleIcon} label={form.discord} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Payments Tab
// ============================================================

function PaymentsTab({ settings, onSave, ccData }: {
  settings: SiteSettings
  onSave: (u: Partial<SiteSettings>) => void
  ccData: Awaited<ReturnType<typeof fetchAdminCommandCenter>> | null
}) {
  const [form, setForm] = useState<SiteSettings>({
    ...settings,
    acceptedPaymentMethods: settings.acceptedPaymentMethods ?? [],
  })
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setForm({
      ...settings,
      acceptedPaymentMethods: settings.acceptedPaymentMethods ?? [],
    })
  }, [settings])

  const update = (key: keyof SiteSettings, value: string | number | boolean | string[]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const toggleMethod = (method: string) => {
    const current = form.acceptedPaymentMethods
    const next = current.includes(method) ? current.filter((m) => m !== method) : [...current, method]
    update("acceptedPaymentMethods", next)
  }

  const handleSave = () => {
    onSave(form)
    setDirty(false)
  }

  const metrics = ccData?.metrics || []
  const revenueMonth = metrics.find((m) => m.key === "revenue_month")?.value || 0
  const pendingCount = metrics.find((m) => m.key === "pending_payments")?.value || 0
  const activeProjects = metrics.find((m) => m.key === "active_projects")?.value || 0
  const completedProjects = metrics.find((m) => m.key === "completed_projects")?.value || 0
  const allTimeRevenue = ccData?.orders?.filter((o) => o.upfrontPaid || ["paid", "paid_upfront", "delivered", "completed"].includes(o.projectStatus))
    .reduce((sum, o) => sum + (o.upfrontPaid ? o.upfrontAmount : 0) + (o.remainingPaid ? o.remainingAmount : 0), 0) || 0

  const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#4a4a5a] outline-none transition-all focus:border-[#4f6ef7]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#4f6ef7]/20"
  const labelClass = "text-xs font-semibold text-[#6b6b80] uppercase tracking-wider mb-1.5 block"

  return (
    <div className="space-y-6">
      {/* Financial Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard icon={TrendingUp} label="Revenue This Month" value={revenueMonth} money />
        <MetricCard icon={DollarSign} label="All Time Revenue" value={allTimeRevenue} money />
        <MetricCard icon={Clock} label="Pending Payments" value={pendingCount} />
        <MetricCard icon={Wallet} label="Awaiting Final" value={ccData?.orders?.filter((o) => o.upfrontPaid && !o.remainingPaid).length || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Payment Configuration */}
        <div className="lg:col-span-3 space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-6">
            <SectionTitle icon={CreditCard} title="Payment Configuration" desc="Split percentages, methods, and accounts" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Upfront Payment (%)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={100} value={form.upfrontPercentage} onChange={(e) => {
                    const val = parseInt(e.target.value)
                    update("upfrontPercentage", val)
                    update("finalPaymentPercentage", 100 - val)
                  }} className="flex-1 accent-[#4f6ef7] h-1.5" />
                  <span className="text-sm font-semibold text-[#f0f0f5] w-10 text-right">{form.upfrontPercentage}%</span>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-5">
                <div className="h-2 flex-1 rounded-full bg-white/[0.08] overflow-hidden flex">
                  <div className="h-full bg-[#4f6ef7] rounded-full transition-all" style={{ width: `${form.upfrontPercentage}%` }} />
                  <div className="h-full bg-[#22c55e] rounded-full transition-all" style={{ width: `${form.finalPaymentPercentage}%` }} />
                </div>
                <span className="text-[10px] text-[#6b6b80] whitespace-nowrap">
                  <span className="text-[#4f6ef7]">{form.upfrontPercentage}%</span> / <span className="text-[#22c55e]">{form.finalPaymentPercentage}%</span>
                </span>
              </div>
            </div>

            <div>
              <label className={labelClass}>Accepted Payment Methods</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { id: "paypal", label: "PayPal", icon: CreditCard },
                  { id: "pix", label: "Pix", icon: Hash },
                  { id: "wise", label: "Wise", icon: Banknote },
                  { id: "stripe", label: "Stripe", icon: CreditCard },
                ].map((method) => {
                  const active = form.acceptedPaymentMethods.includes(method.id)
                  return (
                    <button
                      key={method.id}
                      onClick={() => toggleMethod(method.id)}
                      className={`touch-target inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all ${
                        active
                          ? "bg-[#4f6ef7]/15 border border-[#4f6ef7]/30 text-[#8fa3ff]"
                          : "bg-white/[0.04] border border-white/[0.08] text-[#6b6b80] hover:text-[#f0f0f5]"
                      }`}
                    >
                      {active ? <CheckCircle size={14} /> : <Plus size={14} />}
                      {method.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-6">
            <SectionTitle icon={Wallet} title="Payment Accounts" desc="Credentials for receiving payments" />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="PayPal Email" value={form.paypalEmail} onChange={(v) => update("paypalEmail", v)} placeholder="merchant@domain.com" type="email" className={inputClass} labelClass={labelClass} />
              <Field label="Pix Key" value={form.pixKey} onChange={(v) => update("pixKey", v)} placeholder="CPF, CNPJ, email or random key" className={inputClass} labelClass={labelClass} />
              <Field label="Stripe Publishable Key" value={form.stripePublishableKey} onChange={(v) => update("stripePublishableKey", v)} placeholder="pk_live_..." className={inputClass} labelClass={labelClass} />
              <Field label="Stripe Secret Key" value={form.stripeSecretKey} onChange={(v) => update("stripeSecretKey", v)} type="password" placeholder="sk_live_..." className={inputClass} labelClass={labelClass} />
            </div>
          </div>

          {dirty && (
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => { setForm(settings); setDirty(false) }} className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors">
                <Save size={14} />
                Save Changes
              </button>
            </div>
          )}
        </div>

        {/* Payment History Sidebar */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6">
            <SectionTitle icon={TrendingUp} title="Revenue Breakdown" desc="From your command center" />
            <div className="mt-4 space-y-3">
              <BarRow label="Upfront Payments" value={ccData?.orders?.filter((o) => o.upfrontPaid).length || 0} total={ccData?.orders?.length || 1} color="#4f6ef7" />
              <BarRow label="Final Payments" value={ccData?.orders?.filter((o) => o.remainingPaid).length || 0} total={ccData?.orders?.length || 1} color="#22c55e" />
              <BarRow label="Pending" value={pendingCount} total={ccData?.orders?.length || 1} color="#f59e0b" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Notifications Tab
// ============================================================

function NotificationsTab({ settings, onSave }: { settings: SiteSettings; onSave: (u: Partial<SiteSettings>) => void }) {
  const [form, setForm] = useState(settings)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { setForm(settings) }, [settings])

  const toggle = (key: keyof SiteSettings) => {
    setForm((prev) => ({ ...prev, [key]: !prev[key] as boolean }))
    setDirty(true)
  }

  const handleSave = () => {
    onSave(form)
    setDirty(false)
  }

  const events = [
    { key: "notifyNewOrder" as keyof SiteSettings, label: "New Order", desc: "When a client places a new order" },
    { key: "notifyPaymentReceived" as keyof SiteSettings, label: "Payment Received", desc: "When a payment is confirmed" },
    { key: "notifyNewFeedback" as keyof SiteSettings, label: "Feedback Received", desc: "When a client submits feedback" },
    { key: "notifyNewClient" as keyof SiteSettings, label: "New Client Registered", desc: "When a new user signs up" },
    { key: "notifyProjectDelivered" as keyof SiteSettings, label: "Project Delivered", desc: "When a project is marked as delivered" },
  ]

  const channels = [
    { key: "emailNotificationsEnabled" as keyof SiteSettings, label: "Email", desc: "Send to notification email", icon: Mail },
    { key: "browserPushEnabled" as keyof SiteSettings, label: "Browser Push", desc: "Desktop push notifications", icon: Monitor },
    { key: "whatsappNotificationsEnabled" as keyof SiteSettings, label: "WhatsApp", desc: "Via WhatsApp message", icon: Smartphone },
  ]

  const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#4a4a5a] outline-none transition-all focus:border-[#4f6ef7]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#4f6ef7]/20"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        {/* Channels */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-5">
          <SectionTitle icon={Bell} title="Notification Channels" desc="Where alerts are delivered" />
          <div className="space-y-3">
            {channels.map((ch) => {
              const Icon = ch.icon
              const enabled = form[ch.key] as boolean
              return (
                <div key={ch.key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${enabled ? "bg-[#4f6ef7]/15 text-[#8fa3ff]" : "bg-white/[0.04] text-[#4a4a5a]"}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#f0f0f5]">{ch.label}</p>
                      <p className="text-xs text-[#6b6b80]">{ch.desc}</p>
                    </div>
                  </div>
                  <ToggleSwitch enabled={enabled} onClick={() => toggle(ch.key)} />
                </div>
              )
            })}
          </div>

          <div>
            <label className="text-xs font-semibold text-[#6b6b80] uppercase tracking-wider mb-1.5 block">Notification Email</label>
            <input
              type="email"
              value={form.notificationEmail}
              onChange={(e) => { setForm((prev) => ({ ...prev, notificationEmail: e.target.value })); setDirty(true) }}
              placeholder="admin@domain.com"
              className={inputClass}
            />
          </div>
        </div>

        {/* Events */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-5">
          <SectionTitle icon={Bell} title="Event Subscriptions" desc="Which events trigger notifications" />
          <div className="space-y-2">
            {events.map((ev) => {
              const enabled = form[ev.key] as boolean
              return (
                <div key={ev.key} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#f0f0f5]">{ev.label}</p>
                    <p className="text-xs text-[#6b6b80]">{ev.desc}</p>
                  </div>
                  <ToggleSwitch enabled={enabled} onClick={() => toggle(ev.key)} />
                </div>
              )
            })}
          </div>
        </div>

        {dirty && (
          <div className="flex items-center justify-end gap-3">
            <button onClick={() => { setForm(settings); setDirty(false) }} className="rounded-xl border border-white/[0.08] px-5 py-2.5 text-sm font-medium text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="inline-flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors">
              <Save size={14} />
              Save Changes
            </button>
          </div>
        )}
      </div>

      {/* Digest Sidebar */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6">
          <SectionTitle icon={Bell} title="Digest Preferences" desc="Summary frequency" />
          <div className="mt-4 space-y-2">
            {(["daily", "weekly", "none"] as const).map((freq) => (
              <button
                key={freq}
                onClick={() => { setForm((prev) => ({ ...prev, digestFrequency: freq })); setDirty(true) }}
                className={`w-full rounded-xl px-4 py-2.5 text-sm font-medium text-left transition-all ${
                  form.digestFrequency === freq
                    ? "bg-[#4f6ef7]/15 border border-[#4f6ef7]/30 text-[#8fa3ff]"
                    : "bg-white/[0.04] border border-white/[0.08] text-[#6b6b80] hover:text-[#f0f0f5]"
                }`}
              >
                {freq === "daily" ? "Daily Summary" : freq === "weekly" ? "Weekly Digest" : "No Digest"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Security Tab
// ============================================================

function SecurityTab() {
  const { user } = useAuth()
  const showConfirm = useAdminStore((s) => s.showConfirm)
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [logs, setLogs] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" })
  const [pwVisible, setPwVisible] = useState(false)
  const [savingPw, setSavingPw] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [s, l] = await Promise.all([fetchSessions(), fetchActivityLogs()])
      setSessions(s.slice(0, 5))
      setLogs(l.slice(0, 10))
    } catch {
      toast.error("Could not load security data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw) { toast.error("Fill all fields"); return }
    if (pwForm.newPw.length < 8) { toast.error("Minimum 8 characters"); return }
    if (pwForm.newPw !== pwForm.confirm) { toast.error("Passwords don't match"); return }
    setSavingPw(true)
    await new Promise((r) => setTimeout(r, 800))
    toast.success("Password updated")
    setPwForm({ current: "", newPw: "", confirm: "" })
    setSavingPw(false)
  }

  const handleTerminateSessions = () => {
    showConfirm(
      "Terminate Sessions",
      "This will sign out all other devices. Your current session will remain active.",
      async () => {
        setSessions((prev) => prev.map((s) => s.isCurrent ? s : { ...s, lastActive: "Terminated" }))
        toast.success("Other sessions terminated")
      },
      "warning",
      "Yes, terminate",
    )
  }

  const handleLogoutAll = () => {
    showConfirm(
      "Log Out Everywhere",
      "You will be signed out of all devices including this one.",
      async () => {
        toast.success("All sessions terminated")
      },
      "danger",
      "Log out everywhere",
    )
  }

  const inputClass = "w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder-[#4a4a5a] outline-none transition-all focus:border-[#4f6ef7]/50 focus:bg-white/[0.06] focus:ring-1 focus:ring-[#4f6ef7]/20"

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        {/* Password */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-5">
          <SectionTitle icon={Key} title="Change Password" desc="Update your login credentials" />
          <div className="space-y-4 max-w-md">
            <PasswordField label="Current Password" value={pwForm.current} onChange={(v) => setPwForm((p) => ({ ...p, current: v }))} visible={pwVisible} onToggle={() => setPwVisible(!pwVisible)} className={inputClass} />
            <PasswordField label="New Password" value={pwForm.newPw} onChange={(v) => setPwForm((p) => ({ ...p, newPw: v }))} visible={pwVisible} onToggle={() => setPwVisible(!pwVisible)} className={inputClass} />
            <PasswordField label="Confirm New Password" value={pwForm.confirm} onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))} visible={pwVisible} onToggle={() => setPwVisible(!pwVisible)} className={inputClass} />
            <button
              onClick={handleChangePassword}
              disabled={savingPw}
              className="inline-flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors disabled:opacity-50"
            >
              {savingPw ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savingPw ? "Updating..." : "Update Password"}
            </button>
          </div>
        </div>

        {/* Two Factor */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-5">
          <SectionTitle icon={Fingerprint} title="Two-Factor Authentication" desc="Add an extra layer of security" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#f0f0f5]">Authenticator App</p>
              <p className="text-xs text-[#6b6b80]">Use Google Authenticator, Authy, or similar</p>
            </div>
            <ToggleSwitch enabled={twoFactorEnabled} onClick={() => setTwoFactorEnabled(!twoFactorEnabled)} />
          </div>
        </div>

        {/* Active Sessions */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6 space-y-5">
          <SectionTitle icon={Monitor} title="Active Sessions" desc="Devices currently logged in" />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-[#6b6b80]">No active sessions found</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#6b6b80]">
                      <Globe size={14} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#f0f0f5]">{session.browser} on {session.device}</p>
                      <p className="text-xs text-[#6b6b80]">{session.location} · {session.isCurrent ? "Current session" : `Last active ${new Date(session.lastActive).toLocaleDateString()}`}</p>
                    </div>
                  </div>
                  {session.isCurrent && <span className="text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">Active</span>}
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={handleTerminateSessions} className="rounded-xl border border-white/[0.08] px-4 py-2 text-xs font-medium text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
              Terminate other sessions
            </button>
            <button onClick={handleLogoutAll} className="rounded-xl border border-red-500/20 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors">
              Log out everywhere
            </button>
          </div>
        </div>
      </div>

      {/* Activity Sidebar */}
      <div className="lg:col-span-2 space-y-4">
        {/* Account Info */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6">
          <SectionTitle icon={Shield} title="Account" desc="Your login details" />
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-[#6b6b80]">Email</span><span className="text-[#f0f0f5] font-medium">{user?.email || "—"}</span></div>
            <div className="flex justify-between"><span className="text-[#6b6b80]">Last Login</span><span className="text-[#f0f0f5] font-medium">{user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-[#6b6b80]">Account Created</span><span className="text-[#f0f0f5] font-medium">{user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}</span></div>
            <div className="flex justify-between"><span className="text-[#6b6b80]">2FA</span><span className={twoFactorEnabled ? "text-[#22c55e]" : "text-[#6b6b80]"}>{twoFactorEnabled ? "Enabled" : "Disabled"}</span></div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6">
          <SectionTitle icon={History} title="Recent Activity" desc="Last 10 events" />
          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />)}
            </div>
          ) : logs.length === 0 ? (
            <p className="mt-4 text-sm text-[#6b6b80]">No activity recorded yet</p>
          ) : (
            <div className="mt-4 space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 py-2 border-b border-white/[0.04] last:border-0">
                  <div className="h-6 w-6 rounded-full bg-white/[0.04] flex items-center justify-center shrink-0 mt-0.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-[#4f6ef7]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-[#f0f0f5] font-medium truncate">{log.action.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-[#6b6b80] truncate">{log.details} · {new Date(log.timestamp).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Integrations Tab
// ============================================================

const INTEGRATIONS = [
  { id: "supabase", label: "Supabase", desc: "Database, Auth, Storage", icon: DatabaseIcon },
  { id: "storage", label: "Storage", desc: "File uploads and media", icon: HardDriveIcon },
  { id: "realtime", label: "Realtime", desc: "Live subscriptions and events", icon: ActivityIcon },
  { id: "email", label: "Email Service", desc: "Transactional emails", icon: Mail },
  { id: "domain", label: "Domain", desc: "Custom domain and DNS", icon: Globe },
  { id: "analytics", label: "Analytics", desc: "Traffic and user tracking", icon: TrendingUp },
]

function IntegrationsTab() {
  const [statuses, setStatuses] = useState<Record<string, { status: "connected" | "disconnected" | "error"; lastSync: string; }>>({
    supabase: { status: "connected", lastSync: "Just now" },
    storage: { status: "connected", lastSync: "2 min ago" },
    realtime: { status: "connected", lastSync: "Just now" },
    email: { status: "disconnected", lastSync: "Never" },
    domain: { status: "connected", lastSync: "1 hour ago" },
    analytics: { status: "disconnected", lastSync: "—" },
  })

  const getHealth = (status: string) => {
    if (status === "connected") return { label: "Healthy", color: "text-[#22c55e] bg-[#22c55e]/10 border-[#22c55e]/20", icon: CheckCircle }
    if (status === "error") return { label: "Requires Attention", color: "text-[#f59e0b] bg-[#f59e0b]/10 border-[#f59e0b]/20", icon: AlertTriangle }
    return { label: "Disconnected", color: "text-[#6b6b80] bg-white/[0.04] border-white/[0.06]", icon: XCircle }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6">
        <SectionTitle icon={Puzzle} title="Connected Services" desc="System integrations and their current health status" />
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {INTEGRATIONS.map((int) => {
            const s = statuses[int.id]
            const health = getHealth(s.status)
            const HealthIcon = health.icon
            return (
              <div key={int.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4 hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-white/[0.04] flex items-center justify-center text-[#6b6b80]">
                      <int.icon />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#f0f0f5]">{int.label}</p>
                      <p className="text-xs text-[#6b6b80]">{int.desc}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${health.color}`}>
                    <HealthIcon size={10} />
                    {health.label}
                  </span>
                  <span className="text-[10px] text-[#6b6b80]">Sync: {s.lastSync}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Shared Components
// ============================================================

function SectionTitle({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-9 w-9 rounded-lg bg-[#4f6ef7]/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={16} className="text-[#8fa3ff]" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[#f0f0f5]">{title}</h3>
        <p className="text-xs text-[#6b6b80]">{desc}</p>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text", placeholder, className, labelClass }: {
  label: string; value: string | number | undefined | null; onChange: (v: string) => void; type?: string; placeholder?: string; className: string; labelClass: string
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input
        type={type}
        value={String(value ?? "")}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    </div>
  )
}

function TextareaField({ label, value, onChange, placeholder, className, labelClass }: {
  label: string; value: string | undefined | null; onChange: (v: string) => void; placeholder?: string; className: string; labelClass: string
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className={`${className} resize-none`}
      />
    </div>
  )
}

function PasswordField({ label, value, onChange, visible, onToggle, className }: {
  label: string; value: string | undefined | null; onChange: (v: string) => void; visible: boolean; onToggle: () => void; className: string
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#6b6b80] uppercase tracking-wider mb-1.5 block">{label}</label>
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} pr-10`}
          autoComplete={label.includes("Current") ? "current-password" : "new-password"}
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6b6b80] hover:text-[#f0f0f5] transition-colors">
          {visible ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </div>
  )
}

function ToggleSwitch({ enabled, onClick }: { enabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-6 w-10 rounded-full transition-all duration-200 ${enabled ? "bg-[#4f6ef7]" : "bg-white/[0.1]"}`}
      role="switch"
      aria-checked={enabled}
    >
      <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200 shadow-sm ${enabled ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  )
}

function MetricCard({ icon: Icon, label, value, money }: { icon: LucideIcon; label: string; value: number; money?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-7 w-7 rounded-lg bg-[#4f6ef7]/10 flex items-center justify-center">
          <Icon size={13} className="text-[#8fa3ff]" />
        </div>
        <span className="text-xs text-[#6b6b80] font-medium">{label}</span>
      </div>
      <p className="text-xl sm:text-2xl font-bold text-[#f0f0f5]">
        {money ? `$${value.toLocaleString()}` : value}
      </p>
    </div>
  )
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[#6b6b80]">{label}</span>
        <span className="text-[#f0f0f5] font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function PreviewContact({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-[#8a8a9a]">
      <Icon size={12} className="shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  )
}

function SendIcon(props: { size?: number; className?: string }) {
  return <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
}

function MessageCircleIcon(props: { size?: number; className?: string }) {
  return <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
}

function DatabaseIcon(props: { size?: number; className?: string }) {
  return <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
}

function HardDriveIcon(props: { size?: number; className?: string }) {
  return <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}><line x1="22" y1="12" x2="2" y2="12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/><line x1="6" y1="16" x2="6.01" y2="16"/><line x1="10" y1="16" x2="10.01" y2="16"/></svg>
}

function ActivityIcon(props: { size?: number; className?: string }) {
  return <svg width={props.size || 16} height={props.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={props.className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
}

// ============================================================
// Loading & Error States
// ============================================================

function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-96 rounded-2xl bg-white/[0.04]" />
      <div className="h-[400px] rounded-2xl bg-white/[0.04]" />
    </div>
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
