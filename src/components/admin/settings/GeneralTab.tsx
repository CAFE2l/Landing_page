import { useState, useRef, useEffect } from "react"
import { Save, Upload, X, ImageIcon } from "lucide-react"
import toast from "react-hot-toast"
import type { SiteSettings, SettingsValidationErrors } from "../../../lib/types/settings"
import { validateSettings, hasSettingsErrors } from "../../../lib/types/settings"
import { updateSettings, uploadLogo } from "../../../lib/services/settingsService"

const TIMEZONES = [
  "America/Sao_Paulo", "America/New_York", "America/Chicago",
  "America/Denver", "America/Los_Angeles", "America/Mexico_City",
  "America/Buenos_Aires", "America/Bogota", "America/Santiago",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Europe/Madrid", "Europe/Lisbon", "Europe/Rome",
  "Africa/Lagos", "Africa/Cairo", "Asia/Dubai",
  "Asia/Tokyo", "Asia/Shanghai", "Asia/Singapore",
  "Australia/Sydney", "Pacific/Auckland",
]

interface GeneralTabProps {
  settings: SiteSettings
  onSettingsChange: (settings: SiteSettings) => void
}

export default function GeneralTab({ settings, onSettingsChange }: GeneralTabProps) {
  const [form, setForm] = useState<SiteSettings>({ ...settings })
  const [errors, setErrors] = useState<SettingsValidationErrors>({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dirty, setDirty] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setForm({ ...settings })
  }, [settings])

  const update = (key: keyof SiteSettings, value: unknown) => {
    const next = { ...form, [key]: value }
    setForm(next)
    setDirty(true)
    setErrors(validateSettings(next))
  }

  const handleSave = async () => {
    const validation = validateSettings(form)
    setErrors(validation)
    if (hasSettingsErrors(validation)) {
      toast.error("Please fix the validation errors before saving")
      return
    }

    setSaving(true)
    try {
      const updated = await updateSettings(form)
      onSettingsChange(updated)
      setDirty(false)
      toast.success("Settings saved successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be under 5 MB")
      return
    }

    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast.error("Logo must be PNG, JPEG, WebP or SVG")
      return
    }

    setUploading(true)
    try {
      const url = await uploadLogo(file)
      update("logoUrl", url)
      toast.success("Logo uploaded")
    } catch (err) {
      toast.error("Failed to upload logo")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    update("maxUploadMb", Number(e.target.value))
  }

  const inputClass = (field: keyof SettingsValidationErrors) =>
    `w-full max-w-md rounded-lg border bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none transition-colors placeholder:text-[#6b6b80] ${
      errors[field]
        ? "border-red-500/50 focus:border-red-500"
        : "border-white/[0.08] focus:border-[#4f6ef7]/50"
    }`

  return (
    <div className="space-y-8">
      {/* Site Identity */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Site Identity</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Basic information about your business</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Logo */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Company Logo</label>
            <div className="flex items-center gap-4">
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] overflow-hidden">
                {form.logoUrl ? (
                  <>
                    <img src={form.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => update("logoUrl", null)}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors"
                      aria-label="Remove logo"
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <ImageIcon size={22} className="text-[#6b6b80]" />
                )}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#f0f0f5] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
                  aria-label="Upload logo"
                >
                  {uploading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4f6ef7] border-t-transparent" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {uploading ? "Uploading..." : "Upload Logo"}
                </button>
                <p className="mt-1 text-xs text-[#6b6b80]">PNG, JPEG, WebP or SVG. Max 5 MB.</p>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              className="hidden"
              aria-hidden="true"
            />
          </div>

          <div>
            <label htmlFor="siteName" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">
              Site Name <span className="text-red-400">*</span>
            </label>
            <input
              id="siteName"
              value={form.siteName}
              onChange={(e) => update("siteName", e.target.value)}
              className={inputClass("siteName")}
              placeholder="My Business"
              maxLength={100}
            />
            {errors.siteName && <p className="mt-1 text-xs text-red-400">{errors.siteName}</p>}
            <p className="mt-1 text-xs text-[#6b6b80]">{form.siteName.length}/100</p>
          </div>

          <div>
            <label htmlFor="siteUrl" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Site URL</label>
            <input
              id="siteUrl"
              value={form.siteUrl}
              onChange={(e) => update("siteUrl", e.target.value)}
              className={inputClass("siteUrl")}
              placeholder="https://mysite.com"
            />
            {errors.siteUrl && <p className="mt-1 text-xs text-red-400">{errors.siteUrl}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="siteDescription" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Short Description</label>
            <textarea
              id="siteDescription"
              value={form.siteDescription}
              onChange={(e) => update("siteDescription", e.target.value)}
              rows={3}
              className={`${inputClass("siteDescription")} resize-none max-w-lg`}
              placeholder="A short description of your business"
              maxLength={500}
            />
            {errors.siteDescription && <p className="mt-1 text-xs text-red-400">{errors.siteDescription}</p>}
            <p className="mt-1 text-xs text-[#6b6b80]">{form.siteDescription.length}/500</p>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Contact Information</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Public contact details displayed on your site</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="publicEmail" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">
              Public Email <span className="text-red-400">*</span>
            </label>
            <input
              id="publicEmail"
              type="email"
              value={form.publicEmail}
              onChange={(e) => update("publicEmail", e.target.value)}
              className={inputClass("publicEmail")}
              placeholder="contato@example.com"
            />
            {errors.publicEmail && <p className="mt-1 text-xs text-red-400">{errors.publicEmail}</p>}
          </div>

          <div>
            <label htmlFor="whatsapp" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">WhatsApp</label>
            <input
              id="whatsapp"
              value={form.whatsapp}
              onChange={(e) => update("whatsapp", e.target.value)}
              className={inputClass("whatsapp")}
              placeholder="5541996713782"
            />
            {errors.whatsapp && <p className="mt-1 text-xs text-red-400">{errors.whatsapp}</p>}
            <p className="mt-1 text-xs text-[#6b6b80]">Include country code (e.g. 554199999999)</p>
          </div>
        </div>
      </section>

      {/* Localization */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Localization</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Regional preferences</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label htmlFor="currency" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Currency</label>
            <select
              id="currency"
              value={form.currency}
              onChange={(e) => update("currency", e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            >
              <option value="BRL" className="bg-[#050508]">BRL (R$)</option>
              <option value="USD" className="bg-[#050508]">USD ($)</option>
              <option value="EUR" className="bg-[#050508]">EUR (€)</option>
            </select>
          </div>

          <div>
            <label htmlFor="language" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Language</label>
            <select
              id="language"
              value={form.language}
              onChange={(e) => update("language", e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            >
              <option value="pt-BR" className="bg-[#050508]">Português (BR)</option>
              <option value="en" className="bg-[#050508]">English</option>
            </select>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Timezone</label>
            <select
              id="timezone"
              value={form.timezone}
              onChange={(e) => update("timezone", e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz} className="bg-[#050508]">{tz.replace("_", " ")}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Feedback & Upload */}
      <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[#f0f0f5]">Feedback & Uploads</h3>
          <p className="mt-0.5 text-xs text-[#6b6b80]">Control how feedback and file uploads work</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Feedback Approval Mode</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="approval"
                  checked={form.feedbackApprovalMode === "manual"}
                  onChange={() => update("feedbackApprovalMode", "manual")}
                  className="accent-[#4f6ef7]"
                />
                <span className="text-sm text-[#6b6b80]">Manual Review</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="approval"
                  checked={form.feedbackApprovalMode === "auto"}
                  onChange={() => update("feedbackApprovalMode", "auto")}
                  className="accent-[#4f6ef7]"
                />
                <span className="text-sm text-[#6b6b80]">Auto-approve</span>
              </label>
            </div>
            <p className="mt-1 text-xs text-[#6b6b80]">
              {form.feedbackApprovalMode === "manual"
                ? "New feedback requires admin approval before being published"
                : "New feedback is published immediately without review"}
            </p>
          </div>

          <div>
            <label htmlFor="maxUploadMb" className="block text-sm font-medium text-[#f0f0f5] mb-1.5">
              Max Upload Size: <span className="text-[#4f6ef7] font-semibold">{form.maxUploadMb} MB</span>
            </label>
            <div className="flex items-center gap-4">
              <input
                id="maxUploadMb"
                type="range"
                min={1}
                max={100}
                value={form.maxUploadMb}
                onChange={handleSliderChange}
                className="flex-1 max-w-xs accent-[#4f6ef7]"
                aria-label="Maximum upload size in MB"
              />
              <input
                type="number"
                min={1}
                max={100}
                value={form.maxUploadMb}
                onChange={(e) => update("maxUploadMb", Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                className="w-20 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-[#f0f0f5] text-center outline-none focus:border-[#4f6ef7]/50 transition-colors"
                aria-label="Upload size number"
              />
            </div>
            {errors.maxUploadMb && <p className="mt-1 text-xs text-red-400">{errors.maxUploadMb}</p>}
          </div>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4 border-t border-white/[0.06] pt-6">
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
        {dirty && (
          <span className="text-xs text-yellow-400/80 bg-yellow-400/10 px-2.5 py-1 rounded-full">
            Unsaved changes
          </span>
        )}
      </div>
    </div>
  )
}
