import { useState } from "react"
import { motion } from "framer-motion"
import { Save, Download, AlertTriangle } from "lucide-react"
import toast from "react-hot-toast"
import { useAdminStore } from "../../lib/store/adminStore"

const tabs = ["General", "Notifications", "Team", "Danger Zone"] as const
type Tab = typeof tabs[number]

const teamMembers = [
  { name: "Admin", email: "admin@cafeservices.com", role: "admin" as const },
  { name: "Manager", email: "manager@cafeservices.com", role: "admin" as const },
  { name: "Editor", email: "editor@cafeservices.com", role: "client" as const },
]

export default function Settings() {
  const [activeTab, setActiveTab] = useState<Tab>("General")
  const showConfirm = useAdminStore((s) => s.showConfirm)

  const renderTabContent = () => {
    switch (activeTab) {
      case "General":
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Site Name</label>
              <input defaultValue="Café Services" className="w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Description</label>
              <textarea defaultValue="Premium design and development services" rows={3} className="w-full max-w-lg rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Feedback Approval Mode</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="approval" defaultChecked className="accent-[#4f6ef7]" />
                  <span className="text-sm text-[#6b6b80]">Manual Review</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="approval" className="accent-[#4f6ef7]" />
                  <span className="text-sm text-[#6b6b80]">Auto-approve</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Max File Upload (MB)</label>
              <input type="range" min="1" max="50" defaultValue="10" className="w-full max-w-md accent-[#4f6ef7]" />
              <p className="text-xs text-[#6b6b80] mt-1">10 MB</p>
            </div>
            <button
              onClick={() => toast.success("Settings saved")}
              className="flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors"
            >
              <Save size={16} />
              Save Changes
            </button>
          </div>
        )
      case "Notifications":
        return (
          <div className="space-y-5">
            {[
              { label: "New submission", desc: "When a client submits new feedback" },
              { label: "Approval needed", desc: "When feedback requires review" },
              { label: "Weekly digest", desc: "Weekly summary of all activity" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                <div>
                  <p className="text-sm font-medium text-[#f0f0f5]">{item.label}</p>
                  <p className="text-xs text-[#6b6b80]">{item.desc}</p>
                </div>
                <label className="relative inline-flex h-6 w-11 cursor-pointer items-center">
                  <input type="checkbox" defaultChecked className="peer sr-only" />
                  <span className="absolute inset-0 rounded-full bg-white/[0.08] peer-checked:bg-[#4f6ef7] transition-colors" />
                  <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                </label>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-[#f0f0f5] mb-1.5">Notification Email</label>
              <input defaultValue="admin@cafeservices.com" className="w-full max-w-md rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50 transition-colors" />
            </div>
          </div>
        )
      case "Team":
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input placeholder="Email address" className="flex-1 max-w-xs rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 transition-colors" />
              <select className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-[#f0f0f5] outline-none focus:border-[#4f6ef7]/50">
                <option value="admin" className="bg-[#050508]">Admin</option>
                <option value="moderator" className="bg-[#050508]">Moderator</option>
              </select>
              <button
                onClick={() => toast.success("Invite sent!")}
                className="rounded-lg bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors"
              >
                Send Invite
              </button>
            </div>
            <div className="space-y-2 mt-6">
              {teamMembers.map((member) => (
                <div key={member.email} className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] flex items-center justify-center text-xs font-bold text-white">
                    {member.name[0]}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#f0f0f5]">{member.name}</p>
                    <p className="text-xs text-[#6b6b80]">{member.email}</p>
                  </div>
                  <span className="rounded-full bg-[#4f6ef7]/10 px-2.5 py-0.5 text-xs font-semibold text-[#4f6ef7] capitalize">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      case "Danger Zone":
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#f0f0f5]">Danger Zone</h3>
                  <p className="mt-1 text-xs text-[#6b6b80]">Destructive actions that cannot be undone. Proceed with caution.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#f0f0f5]">Clear all pending feedback</p>
                    <p className="text-xs text-[#6b6b80]">Reject all pending feedback submissions</p>
                  </div>
                  <button
                    onClick={() => showConfirm("Clear all pending?", "This will reject all pending feedback. This action cannot be undone.", () => toast.success("Pending feedback cleared"))}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[#f0f0f5]">Export all data</p>
                    <p className="text-xs text-[#6b6b80]">Download a complete data export as CSV</p>
                  </div>
                  <button
                    onClick={() => toast.success("Export started")}
                    className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-[#f0f0f5] hover:bg-white/[0.1] transition-colors"
                  >
                    <Download size={14} />
                    Export
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-1 w-fit mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`relative px-4 py-2 text-sm rounded-lg transition-all ${
              activeTab === tab
                ? "bg-white/[0.08] text-[#f0f0f5] border border-white/[0.06]"
                : "text-[#6b6b80] hover:text-[#f0f0f5]"
            } ${tab === "Danger Zone" ? "text-red-400 hover:text-red-300" : ""}`}
          >
            {tab === "Danger Zone" && <AlertTriangle size={14} className="inline mr-1.5 -mt-0.5" />}
            {tab}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl p-6">
        {renderTabContent()}
      </div>
    </motion.div>
  )
}
