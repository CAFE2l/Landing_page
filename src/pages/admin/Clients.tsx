import { useState } from "react"
import { motion } from "framer-motion"
import { Search, Plus, Mail, ExternalLink } from "lucide-react"
import toast from "react-hot-toast"
import type { Client } from "../../lib/types"
import { getInitials, formatDate } from "../../lib/utils"

const mockClients: Client[] = Array.from({ length: 20 }, (_, i) => ({
  id: `client-${i}`,
  name: ["Maria Silva", "João Pereira", "Ana Luiza", "Carlos Mendes", "Julia Rocha", "Pedro Alves", "Lucas Costa", "Fernanda Santos"][i % 8],
  email: `user${i}@example.com`,
  company: i % 2 === 0 ? ["Tech Solutions", "Design Studio", "Web Agency", "Digital Corp"][i % 4] : undefined,
  avatarUrl: undefined,
  role: i === 0 ? "admin" : "client",
  projectsCount: Math.floor(Math.random() * 8),
  feedbackCount: Math.floor(Math.random() * 15),
  lastActivity: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
  createdAt: new Date(Date.now() - Math.random() * 90 * 86400000).toISOString(),
}))

export default function Clients() {
  const [search, setSearch] = useState("")
  const [clients] = useState<Client[]>(mockClients)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.company || "").toLowerCase().includes(q)
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="w-full h-9 rounded-lg border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-[#f0f0f5] placeholder:text-[#6b6b80] outline-none focus:border-[#4f6ef7]/50 transition-all"
          />
        </div>
        <button
          onClick={() => toast.success("Client invite sent!")}
          className="flex items-center gap-2 rounded-lg bg-[#4f6ef7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6b85ff] transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-[1fr_1fr_0.7fr_0.5fr_0.5fr_0.5fr_0.3fr] gap-4 border-b border-white/[0.08] bg-white/[0.02] px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-[#6b6b80]">
          <span>Name</span>
          <span>Email</span>
          <span>Company</span>
          <span>Projects</span>
          <span>Feedback</span>
          <span>Last Active</span>
          <span></span>
        </div>
        {filtered.map((client, i) => (
          <motion.div
            key={client.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => setSelectedClient(selectedClient?.id === client.id ? null : client)}
            className="grid lg:grid-cols-[1fr_1fr_0.7fr_0.5fr_0.5fr_0.5fr_0.3fr] gap-4 border-b border-white/[0.04] px-5 py-3.5 transition-colors hover:bg-white/[0.02] items-center cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] flex items-center justify-center text-xs font-bold text-white">
                {getInitials(client.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#f0f0f5] truncate">{client.name}</p>
                {client.company && <p className="text-xs text-[#6b6b80]">{client.company}</p>}
              </div>
            </div>
            <div className="text-sm text-[#6b6b80] truncate">{client.email}</div>
            <div className="text-sm text-[#6b6b80]">{client.company || "—"}</div>
            <div className="text-sm text-[#f0f0f5]">{client.projectsCount}</div>
            <div className="text-sm text-[#f0f0f5]">{client.feedbackCount}</div>
            <div className="text-xs text-[#6b6b80]">{client.lastActivity ? formatDate(client.lastActivity, "MMM dd") : "—"}</div>
            <div className="flex gap-1">
              <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(client.email); toast.success("Email copied!") }} className="rounded-lg p-1.5 text-[#6b6b80] hover:bg-white/[0.06] hover:text-[#f0f0f5] transition-colors">
                <Mail size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {selectedClient && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedClient(null)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 400, damping: 40 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#050508]/95 backdrop-blur-xl shadow-[-20px_0_60px_rgba(0,0,0,0.4)]"
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
              <h2 className="text-sm font-semibold text-[#f0f0f5]">Client Details</h2>
              <button onClick={() => setSelectedClient(null)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b6b80] hover:bg-white/[0.06] hover:text-[#f0f0f5] transition-colors">
                <ExternalLink size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#6b85ff] flex items-center justify-center text-lg font-bold text-white">
                  {getInitials(selectedClient.name)}
                </div>
                <div>
                  <p className="text-lg font-semibold text-[#f0f0f5]">{selectedClient.name}</p>
                  <p className="text-sm text-[#6b6b80]">{selectedClient.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-xs text-[#6b6b80]">Projects</p>
                  <p className="text-2xl font-bold text-[#f0f0f5]">{selectedClient.projectsCount}</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-xs text-[#6b6b80]">Feedback</p>
                  <p className="text-2xl font-bold text-[#f0f0f5]">{selectedClient.feedbackCount}</p>
                </div>
              </div>
              {selectedClient.company && (
                <div>
                  <p className="text-xs text-[#6b6b80]">Company</p>
                  <p className="text-sm text-[#f0f0f5]">{selectedClient.company}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-[#6b6b80]">Client since</p>
                <p className="text-sm text-[#f0f0f5]">{formatDate(selectedClient.createdAt, "MMM dd, yyyy")}</p>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </motion.div>
  )
}
