import { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Users,
  UserPlus,
  MessageCircle,
  Search,
  X,
  Plus,
  Calendar,
  Clock,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Loader2,
  Send,
  Trash2,
  Check,
  Copy,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Client, ClientNote, ClientStatus } from "../../lib/types/client";
import { formatPhoneDisplay } from "../../components/ui/PhoneInput";
import { formatDate, timeAgo } from "../../lib/utils";
import UserAvatar from "../../components/ui/UserAvatar";
import { useAuth } from "../../contexts/AuthContext";
import { getSupabaseClient } from "../../data/adminServiceSupabase";
import {
  fetchEnhancedClients,
  fetchClientSummary,
  fetchClientNotes,
  createClientNote,
  deleteClientNote,
  deleteClient,
  type ClientSummary,
} from "../../lib/adminClientService";
import { createOrGetConversation } from "../../lib/chatService";
import { useChatStore } from "../../lib/store/chatStore";
import { fetchFollowCounts, isFollowing } from "../../lib/socialService";
import FollowButton from "../../components/ui/FollowButton";
import { AvatarUpload } from "../../components/profile/AvatarUpload";

type SortField =
  | "name"
  | "createdAt"
  | "projectsCount"
  | "feedbackCount"
  | "lastActivity";
type SortDir = "asc" | "desc";
type FilterStatus = "all" | "active" | "new" | "inactive";

export default function Clients() {
  const { user: authUser } = useAuth();
  const adminId = authUser?.id;

  const [clients, setClients] = useState<Client[]>([]);
  const [summary, setSummary] = useState<ClientSummary>({
    total: 0,
    active: 0,
    newThisMonth: 0,
    pendingMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const signupLink = `${window.location.origin}/auth?mode=signup`;

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [clientsData, summaryData] = await Promise.all([
      fetchEnhancedClients(),
      fetchClientSummary(),
    ]);
    setClients(clientsData);
    setSummary(summaryData);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    const client = getSupabaseClient();
    if (!client) return;
    const channel = client
      .channel("admin-client-profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          loadAll();
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [loadAll]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(signupLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleDelete = async (client: Client) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${client.name}? This cannot be undone.`,
    );
    if (!confirmed) return;
    const ok = await deleteClient(client.id);
    if (ok) {
      toast.success(`${client.name} deleted`);
      loadAll();
    } else {
      toast.error("Failed to delete client");
    }
  };

  const handleMessageClient = async (client: Client) => {
    if (!adminId || !client.id) {
      toast.error("You must be logged in to send messages");
      return;
    }
    const convId = await createOrGetConversation(adminId, client.id);
    if (!convId) {
      toast.error("Failed to create conversation");
      return;
    }
    useChatStore.getState().setOpenWithTarget({
      conversationId: convId,
      otherUserId: client.id,
      otherUserName: client.name,
      otherUserAvatar: client.avatarUrl || null,
    });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filtered = clients
    .filter((c) => {
      if (filterStatus !== "all" && c.status !== filterStatus) return false;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") return a.name.localeCompare(b.name) * dir;
      if (sortField === "createdAt")
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          dir
        );
      if (sortField === "projectsCount")
        return (a.projectsCount - b.projectsCount) * dir;
      if (sortField === "feedbackCount")
        return (a.feedbackCount - b.feedbackCount) * dir;
      if (sortField === "lastActivity")
        return (
          ((a.lastActivity ? new Date(a.lastActivity).getTime() : 0) -
            (b.lastActivity ? new Date(b.lastActivity).getTime() : 0)) *
          dir
        );
      return 0;
    });

  const statCards = [
    {
      label: "Total Clients",
      value: summary.total,
      icon: Users,
      accent: "#4f6ef7",
    },
    {
      label: "Active",
      value: summary.active,
      icon: UserPlus,
      accent: "#22c55e",
    },
    {
      label: "New this Month",
      value: summary.newThisMonth,
      icon: Calendar,
      accent: "#f59e0b",
    },
    {
      label: "Unread Messages",
      value: summary.pendingMessages,
      icon: MessageCircle,
      accent: "#ef4444",
      pulse: summary.pendingMessages > 0,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#f0f0f5]">Clients</h1>
        <p className="text-sm text-[#6b6b80]">
          Manage client accounts, conversations and service history
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.06,
              duration: 0.4,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.14] hover:bg-white/[0.045] hover:shadow-[0_18px_50px_rgba(79,110,247,0.12)]"
          >
            <div className="flex items-start justify-between">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04]"
                style={{
                  backgroundColor: `${stat.accent}15`,
                  color: stat.accent,
                }}
              >
                <stat.icon size={18} />
              </div>
              {stat.pulse && (
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: stat.accent }}
                />
              )}
            </div>
            <div className="mt-3 text-[28px] font-bold text-[#f0f0f5] leading-none tracking-tight">
              {stat.value}
            </div>
            <div className="mt-1 text-sm text-[#6b6b80]">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Search + Filters + Add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6b6b80]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, company..."
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-9 pr-3 text-sm text-[#f0f0f5] outline-none transition-all placeholder:text-[#6b6b80] focus:border-[#4f6ef7]/50"
          />
        </div>
        <div className="mobile-scroll-x flex w-full gap-1.5 sm:w-auto">
          {(["all", "active", "new", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`min-h-10 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filterStatus === s
                  ? "bg-[#4f6ef7] text-white"
                  : "border border-white/[0.08] text-[#6b6b80] hover:border-white/[0.15] hover:text-[#f0f0f5]"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6b85ff] sm:w-auto"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-sm">
        {/* Table header */}
        <div className="hidden border-b border-white/5 bg-white/[0.02] px-5 py-3 text-xs font-medium uppercase tracking-wider text-white/40 lg:grid lg:grid-cols-[2fr_1.3fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr_0.8fr_1fr]">
          <button
            onClick={() => toggleSort("name")}
            className="flex items-center gap-1 text-left"
          >
            Client {sortField === "name" && <SortArrow dir={sortDir} />}
          </button>
          <span>Email</span>
          <span>Company</span>
          <button
            onClick={() => toggleSort("projectsCount")}
            className="flex items-center gap-1"
          >
            Orders{" "}
            {sortField === "projectsCount" && <SortArrow dir={sortDir} />}
          </button>
          <span>Services</span>
          <button
            onClick={() => toggleSort("feedbackCount")}
            className="flex items-center gap-1"
          >
            Feedback{" "}
            {sortField === "feedbackCount" && <SortArrow dir={sortDir} />}
          </button>
          <span>Msg</span>
          <button
            onClick={() => toggleSort("lastActivity")}
            className="flex items-center gap-1"
          >
            Activity{" "}
            {sortField === "lastActivity" && <SortArrow dir={sortDir} />}
          </button>
          <span className="text-center">Actions</span>
        </div>

        {loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState onAdd={() => setInviteOpen(true)} />
        ) : (
          <div>
            {/* Desktop rows */}
            <div className="hidden lg:block">
              {filtered.map((client, i) => (
                <ClientRow
                  key={client.id}
                  client={client}
                  index={i}
                  onView={() => setSelectedClient(client)}
                  onMessage={() => handleMessageClient(client)}
                  onDelete={() => handleDelete(client)}
                />
              ))}
            </div>
            {/* Mobile cards */}
            <div className="space-y-2 p-3 lg:hidden">
              {filtered.map((client, i) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  index={i}
                  onView={() => setSelectedClient(client)}
                  onMessage={() => handleMessageClient(client)}
                  onDelete={() => handleDelete(client)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {inviteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setInviteOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="safe-bottom w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-white/[0.08] bg-[#050508] p-6 shadow-2xl"
            >
              <h2 className="text-lg font-semibold text-[#f0f0f5]">
                Invite client
              </h2>
              <p className="mt-1 text-sm text-[#6b6b80]">
                Share this signup link with your client:
              </p>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] p-3">
                <span className="flex-1 truncate text-sm text-white/70">
                  {signupLink}
                </span>
                <button
                  onClick={handleCopy}
                  className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#6b6b80] transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]"
                >
                  {copied ? (
                    <Check size={15} className="text-green-400" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => {
                    setInviteOpen(false);
                    setCopied(false);
                  }}
                  className="touch-target rounded-xl border border-white/[0.08] px-4 py-2 text-sm text-[#6b6b80] hover:text-[#f0f0f5]"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Client Detail Drawer */}
      <AnimatePresence>
        {selectedClient && (
          <ClientDrawer
            client={selectedClient}
            adminId={adminId}
            onClose={() => setSelectedClient(null)}
            onMessage={() => handleMessageClient(selectedClient)}
            onClientUpdate={loadAll}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ========== Sub-components ==========

function SortArrow({ dir }: { dir: SortDir }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="text-[#4f6ef7]">
      {dir === "asc" ? (
        <path d="M5 2l3 5H2z" fill="currentColor" />
      ) : (
        <path d="M5 8L2 3h6z" fill="currentColor" />
      )}
    </svg>
  );
}

function StatusBadge({ status }: { status?: ClientStatus }) {
  const map: Record<
    string,
    { label: string; bg: string; text: string; dot: string }
  > = {
    active: {
      label: "Active",
      bg: "bg-green-500/10",
      text: "text-green-400",
      dot: "bg-green-400",
    },
    new: {
      label: "New",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      dot: "bg-blue-400",
    },
    inactive: {
      label: "Inactive",
      bg: "bg-gray-500/10",
      text: "text-gray-400",
      dot: "bg-gray-400",
    },
  };
  const s = map[status || "inactive"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.bg} ${s.text}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function ClientRow({
  client,
  index,
  onView,
  onMessage,
  onDelete,
}: {
  client: Client;
  index: number;
  onView: () => void;
  onMessage: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.02 }}
      className="grid grid-cols-[2fr_1.3fr_1fr_0.6fr_0.6fr_0.6fr_0.6fr_0.8fr_1fr] gap-4 border-b border-white/5 px-5 py-3.5 transition-colors last:border-0 hover:bg-white/[0.04] items-center"
    >
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar user={client} size="md" ring={false} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-[#f0f0f5]">
              {client.name}
            </p>
            <StatusBadge status={client.status} />
          </div>
        </div>
      </div>
      <div className="truncate text-sm text-[#6b6b80]" title={client.email}>
        {client.email || "—"}
      </div>
      <div className="truncate text-sm text-[#6b6b80]" title={client.company}>
        {client.company || "—"}
      </div>
      <div className="text-sm font-semibold text-[#f0f0f5]">
        {client.projectsCount}
      </div>
      <div className="text-sm text-[#6b6b80]">{client.servicesCount || 0}</div>
      <div className="text-sm text-[#6b6b80]">{client.feedbackCount}</div>
      <div className="relative flex items-center">
        {client.unreadMessagesCount && client.unreadMessagesCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4f6ef7] px-1 text-[9px] font-bold text-white">
            {client.unreadMessagesCount > 9 ? "9+" : client.unreadMessagesCount}
          </span>
        ) : (
          <span className="text-xs text-[#3a3a4a]">—</span>
        )}
      </div>
      <div className="text-xs text-[#6b6b80]">
        {client.lastActivity ? timeAgo(client.lastActivity) : "—"}
      </div>
      <div className="flex items-center justify-center gap-1">
        <button
          onClick={onView}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6b80] transition-colors hover:bg-white/[0.06] hover:text-[#f0f0f5]"
          title="View details"
        >
          <FileText size={13} />
        </button>
        <button
          onClick={onMessage}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6b80] transition-colors hover:bg-[#4f6ef7]/10 hover:text-[#4f6ef7]"
          title="Send message"
        >
          <MessageCircle size={13} />
        </button>
        <button
          onClick={onDelete}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6b6b80] transition-colors hover:bg-red-500/10 hover:text-red-400"
          title="Delete client"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

function ClientCard({
  client,
  index,
  onView,
  onMessage,
  onDelete,
}: {
  client: Client;
  index: number;
  onView: () => void;
  onMessage: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="min-w-0 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={client} size="md" ring={false} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium text-[#f0f0f5]">
                {client.name}
              </p>
              <StatusBadge status={client.status} />
            </div>
            <p className="truncate text-xs text-[#6b6b80]">{client.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onView}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-[#6b6b80] hover:text-[#f0f0f5]"
            aria-label={`View ${client.name}`}
          >
            <FileText size={13} />
          </button>
          <button
            onClick={onMessage}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-[#6b6b80] hover:text-[#4f6ef7]"
            aria-label={`Message ${client.name}`}
          >
            <MessageCircle size={13} />
          </button>
          <button
            onClick={onDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.06] text-[#6b6b80] hover:border-red-500/20 hover:text-red-400"
            aria-label={`Delete ${client.name}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center">
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-xs font-semibold text-[#f0f0f5]">
            {client.projectsCount}
          </p>
          <p className="text-[9px] text-[#6b6b80]">Orders</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-xs font-semibold text-[#f0f0f5]">
            {client.servicesCount || 0}
          </p>
          <p className="text-[9px] text-[#6b6b80]">Services</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-xs font-semibold text-[#f0f0f5]">
            {client.feedbackCount}
          </p>
          <p className="text-[9px] text-[#6b6b80]">Feedback</p>
        </div>
        <div className="rounded-lg bg-white/[0.03] p-2">
          <p className="text-xs font-semibold text-[#f0f0f5]">
            {client.unreadMessagesCount || 0}
          </p>
          <p className="text-[9px] text-[#6b6b80]">Msgs</p>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-[#4a4a5a]">
        <span className="min-w-0 truncate">{client.company || "No company"}</span>
        <span className="shrink-0">{client.lastActivity ? timeAgo(client.lastActivity) : "—"}</span>
      </div>
    </motion.div>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-white/5 px-5 py-4"
        >
          <div className="h-9 w-9 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-white/[0.04]" />
          </div>
          <div className="h-3 w-16 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3 w-10 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3 w-10 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3 w-10 animate-pulse rounded bg-white/[0.04]" />
          <div className="h-3 w-14 animate-pulse rounded bg-white/[0.04]" />
          <div className="flex gap-2">
            <div className="h-7 w-7 animate-pulse rounded-lg bg-white/[0.04]" />
            <div className="h-7 w-7 animate-pulse rounded-lg bg-white/[0.04]" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] text-white/40">
        <Users size={32} />
      </div>
      <h2 className="text-lg font-semibold text-[#f0f0f5]">No clients yet</h2>
      <p className="mt-1 max-w-sm text-sm text-white/30">
        Invite a client or wait for new signups to appear here.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 flex items-center gap-2 rounded-xl bg-[#4f6ef7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#6b85ff]"
      >
        <Plus size={16} />
        Add Client
      </button>
    </div>
  );
}

// ========== Client Detail Drawer ==========

function ClientDrawer({
  client,
  adminId,
  onClose,
  onMessage,
  onClientUpdate,
}: {
  client: Client;
  adminId?: string;
  onClose: () => void;
  onMessage: () => void;
  onClientUpdate: () => void;
}) {
  const [avatarUrl, setAvatarUrl] = useState(client.avatarUrl || "");
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);
  const [notesLoading, setNotesLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [socialCounts, setSocialCounts] = useState({
    followers: 0,
    following: 0,
  });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setAvatarUrl(client.avatarUrl || "");
  }, [client.avatarUrl, client.id]);

  useEffect(() => {
    if (!adminId || !client.id) return;
    isFollowing(adminId, client.id).then(setFollowing);
    fetchFollowCounts(client.id).then(setSocialCounts);
  }, [adminId, client.id]);

  const loadNotes = useCallback(async () => {
    setNotesLoading(true);
    const data = await fetchClientNotes(client.id);
    setNotes(data);
    setNotesLoading(false);
  }, [client.id]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const handleAddNote = async () => {
    if (!noteInput.trim() || !adminId) return;
    setSavingNote(true);
    const note = await createClientNote(client.id, adminId, noteInput.trim());
    setSavingNote(false);
    if (note) {
      setNotes((prev) => [note, ...prev]);
      setNoteInput("");
      toast.success("Note added");
    } else {
      toast.error("Failed to add note");
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    setDeletingNote(noteId);
    const ok = await deleteClientNote(noteId);
    setDeletingNote(null);
    if (ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success("Note deleted");
    } else {
      toast.error("Failed to delete note");
    }
  };

  const infoSections = [
    { icon: Mail, label: "Email", value: client.email },
    {
      icon: Phone,
      label: "Phone",
      value: client.phone ? formatPhoneDisplay(client.phone) : "—",
    },
    { icon: MapPin, label: "Location", value: client.location || "—" },
    { icon: Briefcase, label: "Company", value: client.company || "—" },
    { icon: FileText, label: "Bio", value: client.bio || "—" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-stretch sm:justify-end"
    >
      <motion.aside
        initial={isMobile ? { y: "100%" } : { x: "100%" }}
        animate={isMobile ? { y: 0 } : { x: 0 }}
        exit={isMobile ? { y: "100%" } : { x: "100%" }}
        transition={{ type: "spring", stiffness: 400, damping: 40 }}
        onClick={(e) => e.stopPropagation()}
        className="safe-bottom relative z-50 flex w-full flex-col overflow-hidden rounded-t-2xl border border-white/[0.08] bg-[#050508]/95 shadow-[-20px_0_60px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:fixed sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-[480px] sm:rounded-none sm:border-l"
      >
        {/* Fixed close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-black/50 text-white/60 hover:text-white transition-colors"
        >
          <X size={16} />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
          {/* Profile header with clickable avatar */}
          <div className="relative px-6 pt-12 pb-6 text-center">
            <motion.div
              className="absolute inset-0 -z-10 scale-150 rounded-full bg-[#2563eb]/10 blur-3xl"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative mx-auto flex flex-col items-center">
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                userId={client.id}
                onUploadComplete={(url) => {
                  setAvatarUrl(url);
                  onClientUpdate();
                }}
              />
              <h2 className="mt-4 text-xl font-bold text-[#f0f0f5]">
                {client.name}
              </h2>
              <p className="text-sm text-[#6b6b80]">{client.email}</p>
              <div className="mt-3 flex items-center gap-2">
                <StatusBadge status={client.status} />
                <span className="rounded-full border border-[#4f6ef7]/25 bg-[#4f6ef7]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#9BA7FF]">
                  Client
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 space-y-5">
            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={onMessage}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_20px_rgba(37,99,235,0.25)] hover:shadow-[0_0_32px_rgba(37,99,235,0.4)] transition-all"
              >
                <MessageCircle size={16} />
                Send Message
              </button>
              {adminId && client.id && (
                <FollowButton
                  currentUserId={adminId}
                  targetUserId={client.id}
                  targetUserName={client.name}
                  initialFollowing={following}
                  onStateChange={(nowFollowing) => {
                    setFollowing(nowFollowing);
                    setSocialCounts((prev) => ({
                      ...prev,
                      followers: nowFollowing
                        ? prev.followers + 1
                        : Math.max(0, prev.followers - 1),
                    }));
                  }}
                  className="flex-1"
                />
              )}
            </div>

            {/* Stats cards — extended with social */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Orders", value: client.projectsCount },
                { label: "Services", value: client.servicesCount || 0 },
                { label: "Feedback", value: client.feedbackCount },
                { label: "Messages", value: client.unreadMessagesCount || 0 },
                { label: "Followers", value: socialCounts.followers },
                { label: "Following", value: socialCounts.following },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 text-center"
                >
                  <p className="bg-gradient-to-r from-[#60a5fa] to-[#a78bfa] bg-clip-text text-base font-bold text-transparent">
                    {stat.value}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider text-white/30">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 text-xs text-[#4a4a5a]">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> Client since{" "}
                {formatDate(client.createdAt, "MMM yyyy")}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> Last{" "}
                {timeAgo(client.lastActivity || client.createdAt)}
              </span>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* Client Information */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b80]">
                Client Information
              </h3>
              <div className="space-y-2">
                {infoSections.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5"
                  >
                    <s.icon size={14} className="shrink-0 text-[#4a4a5a]" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-wider text-[#4a4a5a]">
                        {s.label}
                      </p>
                      <p className="truncate text-sm text-[#f0f0f5]">
                        {s.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

            {/* Admin Notes */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6b6b80]">
                Admin Notes
              </h3>
              <div className="flex gap-2">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAddNote();
                    }
                  }}
                  placeholder="Add a private note..."
                  className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-sm text-[#f0f0f5] outline-none placeholder:text-[#4a4a5a] focus:border-[#4f6ef7]/50 transition-all"
                />
                <button
                  onClick={handleAddNote}
                  disabled={savingNote || !noteInput.trim() || !adminId}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4f6ef7] text-white disabled:opacity-40 hover:bg-[#6b85ff] transition-colors"
                >
                  {savingNote ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Send size={15} />
                  )}
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {notesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2
                      size={16}
                      className="animate-spin text-[#4f6ef7]"
                    />
                  </div>
                ) : notes.length === 0 ? (
                  <p className="py-3 text-center text-xs text-[#4a4a5a]">
                    No notes yet
                  </p>
                ) : (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="group rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-[#9BA7FF]">
                              {note.adminName || "Admin"}
                            </span>
                            <span className="text-[9px] text-[#4a4a5a]">
                              {timeAgo(note.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[#c0c0d0] whitespace-pre-wrap">
                            {note.note}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          disabled={deletingNote === note.id}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg p-1.5 text-[#4a4a5a] hover:text-red-400 hover:bg-red-500/10"
                        >
                          {deletingNote === note.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.aside>
    </motion.div>
  );
}
