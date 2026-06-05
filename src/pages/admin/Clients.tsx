import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Check, Copy, Eye, Mail, MoreVertical, Plus, Search, Users } from "lucide-react"
import toast from "react-hot-toast"
import type { Client } from "../../lib/types"
import { getInitials, formatDate } from "../../lib/utils"
import { fetchAdminClients, getSupabaseClient } from "../../data/adminServiceSupabase"

export default function Clients() {
  const [search, setSearch] = useState("")
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const signupLink = `${window.location.origin}/auth?mode=signup`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signupLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy link")
    }
  }

  const loadClients = async () => {
    const data = await fetchAdminClients()
    setClients(data)
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => loadClients())
    const client = getSupabaseClient()
    if (!client) return

    const channel = client
      .channel("admin-client-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadClients()
      })
      .subscribe()

    return () => {
      client.removeChannel(channel)
    }
  }, [])

  const filtered = clients.filter((client) => {
    const q = search.toLowerCase()
    return client.name.toLowerCase().includes(q) || client.email.toLowerCase().includes(q) || (client.company || "").toLowerCase().includes(q)
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative min-w-[220px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-[#f0f0f5] outline-none transition-all placeholder:text-[#6b6b80] focus:border-[#4f6ef7]/50"
          />
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6b85ff]"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        <div className="hidden grid-cols-[1.3fr_1.2fr_1fr_0.45fr_0.55fr_0.7fr_0.85fr] gap-4 border-b border-white/5 bg-white/[0.02] px-5 py-3.5 text-xs font-medium uppercase tracking-wider text-white/40 lg:grid">
          <span>Avatar + Name</span>
          <span>Email</span>
          <span>Company</span>
          <span>Orders</span>
          <span>Services</span>
          <span>Joined</span>
          <span>Actions</span>
        </div>

        {loading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid gap-4 border-b border-white/5 px-5 py-4 lg:grid-cols-[1.3fr_1.2fr_1fr_0.45fr_0.55fr_0.7fr_0.85fr]">
              {Array.from({ length: 7 }).map((__, cell) => (
                <div key={cell} className="h-4 animate-pulse rounded bg-white/[0.05]" />
              ))}
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/40">
              <Users size={32} />
            </div>
            <h2 className="text-lg font-semibold text-[#f0f0f5]">No clients yet</h2>
            <p className="mt-1 max-w-sm text-sm text-white/30">Invite a client or wait for new signups to appear here in realtime.</p>
            <button onClick={() => setInviteOpen(true)} className="mt-5 flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6b85ff]">
              <Plus size={16} />
              Add Client
            </button>
          </div>
        ) : (
          filtered.map((client, i) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.025 }}
              className="grid gap-4 border-b border-white/5 px-5 py-4 transition-colors last:border-0 hover:bg-white/5 lg:grid-cols-[1.3fr_1.2fr_1fr_0.45fr_0.55fr_0.7fr_0.85fr] lg:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4f6ef7] to-[#8b5cf6] text-xs font-bold text-white">
                  {client.avatarUrl ? <img src={client.avatarUrl} alt="" className="h-full w-full object-cover" /> : getInitials(client.name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#f0f0f5]">{client.name}</p>
                  <p className="text-xs text-[#6b6b80] lg:hidden">{client.email}</p>
                </div>
              </div>
              <div className="truncate text-sm text-[#6b6b80]">{client.email || "—"}</div>
              <div className="text-sm text-[#6b6b80]">{client.company || "—"}</div>
              <div className="text-sm font-semibold text-[#f0f0f5]">{client.projectsCount}</div>
              <div className="text-sm font-semibold text-[#f0f0f5]">{client.servicesCount || 0}</div>
              <div className="text-xs text-[#6b6b80]">{formatDate(client.createdAt, "MMM dd, yyyy")}</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => setSelectedClient(client)} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#f0f0f5] transition-colors hover:bg-white/[0.06]">
                  <Eye size={13} /> View
                </button>
                <button onClick={() => { navigator.clipboard.writeText(client.email); toast.success("Email copied") }} className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-[#f0f0f5] transition-colors hover:bg-white/[0.06]">
                  <Mail size={13} /> Message
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6b6b80] transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]">
                  <MoreVertical size={14} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {inviteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setInviteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#050508] p-6 shadow-2xl"
            >
              <h2 className="text-lg font-semibold text-[#f0f0f5]">Invite client</h2>
              <p className="mt-1 text-sm text-[#6b6b80]">Compartilhe o link abaixo com seu cliente:</p>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] p-3">
                <span className="flex-1 truncate text-sm text-white/70">{signupLink}</span>
                <button
                  onClick={handleCopy}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#6b6b80] transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]"
                >
                  {copied ? <Check size={15} className="text-green-400" /> : <Copy size={15} />}
                </button>
              </div>
              <div className="mt-5 flex justify-end">
                <button onClick={() => { setInviteOpen(false); setCopied(false) }} className="rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-[#6b6b80] hover:text-[#f0f0f5]">Fechar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedClient(null)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          >
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#050508]/95 shadow-[-20px_0_60px_rgba(0,0,0,0.4)] backdrop-blur-xl"
            >
              <div className="border-b border-white/[0.08] px-6 py-5">
                <p className="text-lg font-semibold text-[#f0f0f5]">{selectedClient.name}</p>
                <p className="text-sm text-[#6b6b80]">{selectedClient.email}</p>
              </div>
              <div className="grid gap-4 p-6 sm:grid-cols-2">
                <Info label="Company" value={selectedClient.company || "—"} />
                <Info label="Client since" value={formatDate(selectedClient.createdAt, "MMM dd, yyyy")} />
                <Info label="Orders" value={String(selectedClient.projectsCount)} />
                <Info label="Services" value={String(selectedClient.servicesCount || 0)} />
                <Info label="Feedbacks" value={String(selectedClient.feedbackCount)} />
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
      <p className="text-xs text-[#6b6b80]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#f0f0f5]">{value}</p>
    </div>
  )
}
