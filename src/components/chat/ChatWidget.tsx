import { useState, useEffect, useCallback, useRef } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useIsMobile } from "../../hooks/useMobile"
import {
  MessageCircle, X, Minus, ExternalLink, Loader2,
  Bell, Users, ChevronLeft, RefreshCw,
  ClipboardList, FolderOpen, MessageSquare, FileUp,
  InfoIcon, Hash, AlertCircle,
} from "lucide-react"
import { useAuth } from "../../contexts/AuthContext"
import {
  fetchConversations, markMessagesAsRead, subscribeToConversationUpdates,
  fetchUserGroups, fetchGroupMessages, subscribeToGroupMessages,
} from "../../lib/chatService"
import { fetchNotifications, markNotificationsRead, subscribeToNotifications } from "../../lib/serviceOrdersService"
import { useChatStore } from "../../lib/store/chatStore"
import ChatConversation from "./ChatConversation"
import MessageComposer from "./MessageComposer"
import ChatMessageBubble from "./ChatMessageBubble"
import type { ChatConversation as ChatConv, ChatMessage, Group } from "../../data/feedbackStore"
import type { Notification } from "../../lib/types/serviceOrders"
import { getUserDisplayName } from "../../lib/utils"
import UserAvatar from "../ui/UserAvatar"

type Tab = "chats" | "notifications" | "groups"

const notificationIcon = (type: string) => {
  const t = type.toLowerCase()
  if (t.includes("payment") || t.includes("pay")) return <ClipboardList size={16} />
  if (t.includes("project") || t.includes("order")) return <FolderOpen size={16} />
  if (t.includes("file") || t.includes("upload")) return <FileUp size={16} />
  if (t.includes("feedback") || t.includes("review")) return <MessageSquare size={16} />
  if (t.includes("admin") || t.includes("info")) return <InfoIcon size={16} />
  return <Bell size={16} />
}

const notificationAction = (type: string, payload: unknown): { label: string; to?: string } | null => {
  const t = type.toLowerCase()
  if (t.includes("payment") || t.includes("pay")) return { label: "View Order" }
  if (t.includes("project") || t.includes("order")) {
    if (payload && typeof payload === "object" && "orderId" in payload) {
      return { label: "Open Project", to: `/admin/service-orders` }
    }
    return { label: "Open Project" }
  }
  if (t.includes("feedback")) return { label: "Open Chat" }
  if (t.includes("file")) return { label: "View File" }
  if (t.includes("admin")) return { label: "Open Chat" }
  return null
}

export default function ChatWidget() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>("chats")
  const [conversations, setConversations] = useState<ChatConv[]>([])
  const [convLoading, setConvLoading] = useState(false)
  const [convError, setConvError] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<ChatConv | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(false)
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([])
  const [groupMsgLoading, setGroupMsgLoading] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [notifUnread, setNotifUnread] = useState(0)
  const openWithTarget = useChatStore((s) => s.openWithTarget)
  const bottomRef = useRef<HTMLDivElement>(null)
  const loadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const uid = user?.id
  const isMessagesPage = location.pathname.startsWith("/dashboard/messages") || location.pathname === "/messages"

  // ===== Load conversations =====
  const loadConvs = useCallback(async () => {
    if (!uid) return
    setConvLoading(true)
    setConvError(null)
    try {
      const convs = await fetchConversations(uid)
      setConversations(convs)
      setTotalUnread(convs.reduce((s, c) => s + c.unreadCount, 0))
    } catch {
      setConvError("Could not load messages")
    }
    setConvLoading(false)
  }, [uid])

  // ===== Load notifications =====
  const loadNotifs = useCallback(async () => {
    setNotifLoading(true)
    try {
      const notifs = await fetchNotifications(10)
      setNotifications(notifs)
      setNotifUnread(notifs.filter((n) => !n.isRead).length)
    } catch {
      /* silent */
    }
    setNotifLoading(false)
  }, [])

  // ===== Load groups =====
  const loadGroups = useCallback(async () => {
    if (!uid) return
    setGroupsLoading(true)
    try {
      const data = await fetchUserGroups()
      setGroups(data)
    } catch {
      /* silent */
    }
    setGroupsLoading(false)
  }, [uid])

  useEffect(() => {
    if (!open) return
    loadConvs()
    loadNotifs()
    loadGroups()
  }, [open, loadConvs, loadNotifs, loadGroups])

  // Re-subscribe when tab changes
  useEffect(() => {
    if (!open || tab !== "groups") return
    loadGroups()
  }, [tab, open, loadGroups])

  useEffect(() => {
    if (!uid) return
    const cleanup = subscribeToConversationUpdates(uid, () => {
      if (loadTimer.current) clearTimeout(loadTimer.current)
      loadTimer.current = setTimeout(loadConvs, 500)
    })
    return cleanup
  }, [uid, loadConvs])

  useEffect(() => {
    const cleanup = subscribeToNotifications(() => {
      loadNotifs()
    })
    return cleanup
  }, [loadNotifs])

  useEffect(() => {
    return () => {
      if (loadTimer.current) clearTimeout(loadTimer.current)
    }
  }, [])

  // Open with target
  useEffect(() => {
    if (!uid || !openWithTarget) return
    if (isMessagesPage) {
      useChatStore.getState().clearOpenWithTarget()
      navigate(`/dashboard/messages?conversationId=${openWithTarget.conversationId}`, { replace: true })
      return
    }
    setOpen(true)
    setTab("chats")
    const virtualConv: ChatConv = {
      id: openWithTarget.conversationId,
      participantA: uid,
      participantB: openWithTarget.otherUserId,
      lastMessage: null,
      lastMessageAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      otherUser: {
        id: openWithTarget.otherUserId,
        name: openWithTarget.otherUserName,
        avatarUrl: openWithTarget.otherUserAvatar,
        username: null,
      },
      unreadCount: 0,
    }
    setActiveConv(virtualConv)
    useChatStore.getState().clearOpenWithTarget()
  }, [openWithTarget, uid, isMessagesPage, navigate])

  // Tab change resets active items
  const handleTabChange = (t: Tab) => {
    setTab(t)
    setActiveConv(null)
    setActiveGroup(null)
  }

  const handleSelectConversation = async (conv: ChatConv) => {
    if (isMessagesPage) {
      navigate(`/dashboard/messages?conversationId=${conv.id}`, { replace: true })
      setOpen(false)
      setActiveConv(null)
      return
    }
    setActiveConv(conv)
    setConversations((prev) =>
      prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c)),
    )
    await markMessagesAsRead(conv.id)
  }

  const handleSelectGroup = async (group: Group) => {
    setActiveGroup(group)
    setGroupMessages([])
    setGroupMsgLoading(true)
    try {
      const msgs = await fetchGroupMessages(group.id)
      setGroupMessages(msgs)
    } catch { /* silent */ }
    setGroupMsgLoading(false)
  }

  // Subscribe to active group messages
  useEffect(() => {
    if (!activeGroup) return
    const cleanup = subscribeToGroupMessages(
      activeGroup.id,
      (msg) => setGroupMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]),
      (msg) => setGroupMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m)),
    )
    return cleanup
  }, [activeGroup])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [groupMessages.length])

  const handleNotifMarkRead = async () => {
    await markNotificationsRead()
    setNotifications([])
    setNotifUnread(0)
  }

  if (!uid) return null

  const tabCount = tab === "chats" ? totalUnread : tab === "notifications" ? notifUnread : 0

  return (
    <>
      {!isMessagesPage && (
        <>
          {!open && (
            <button
              onClick={() => setOpen(true)}
              className="fixed bottom-5 right-5 z-[9998] flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white shadow-[0_4px_24px_rgba(37,99,235,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_32px_rgba(37,99,235,0.5)]"
              aria-label="Open quick communication center"
            >
              <MessageCircle size={24} />
              {totalUnread > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-lg"
                >
                  {totalUnread > 9 ? "9+" : totalUnread}
                </motion.span>
              )}
            </button>
          )}

          <AnimatePresence>
            {open && (
              <motion.div
                initial={isMobile ? false : { opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={isMobile ? undefined : { opacity: 0, y: 40, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className={`fixed z-[9999] flex flex-col overflow-hidden bg-[#0A0A0F] ${
                  isMobile
                    ? "inset-x-0 bottom-0 top-0 rounded-none border-0"
                    : "sm:inset-auto sm:bottom-5 sm:right-5 sm:h-[580px] sm:max-h-[calc(100vh-96px)] sm:w-[440px] sm:rounded-2xl sm:border sm:border-white/[0.08] sm:shadow-2xl sm:shadow-black/60"
                }`}
              >
                {/* ===== Compact Header ===== */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7]">
                      <MessageCircle size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Messages</p>
                      {totalUnread > 0 && tab === "chats" && (
                        <p className="text-[10px] text-[#4F6EF7]">{totalUnread} unread</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        navigate("/dashboard/messages")
                        setOpen(false)
                        setActiveConv(null)
                        setActiveGroup(null)
                      }}
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Open full Messages page"
                      aria-label="Open full Messages page"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={() => { setActiveConv(null); setActiveGroup(null) }}
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Minimize"
                      aria-label="Minimize"
                    >
                      <Minus size={14} />
                    </button>
                    <button
                      onClick={() => { setOpen(false); setActiveConv(null); setActiveGroup(null) }}
                      className="touch-target flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all"
                      title="Close"
                      aria-label="Close"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* ===== Tabs ===== */}
                {!activeConv && !activeGroup && (
                  <div className="flex gap-0.5 px-3 pt-2.5 pb-1.5 border-b border-white/[0.04] shrink-0">
                    {(["chats", "notifications", "groups"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => handleTabChange(t)}
                        className={`touch-target relative flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all flex-1 ${
                          tab === t
                            ? "text-white"
                            : "text-[#6B6B80] hover:text-white hover:bg-white/[0.04]"
                        }`}
                      >
                        {t === "chats" && <MessageCircle size={13} />}
                        {t === "notifications" && <Bell size={13} />}
                        {t === "groups" && <Users size={13} />}
                        <span className="capitalize">{t}</span>
                        {(t === "chats" && totalUnread > 0) && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-white ml-0.5">
                            {totalUnread > 9 ? "9+" : totalUnread}
                          </span>
                        )}
                        {(t === "notifications" && notifUnread > 0) && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ml-0.5">
                            {notifUnread}
                          </span>
                        )}
                        {tab === t && (
                          <div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[#4F6EF7]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* ===== Active DM Chat ===== */}
                {activeConv && (
                  <div className="flex-1 overflow-hidden">
                    <ChatConversation
                      conversation={activeConv}
                      currentUserId={uid}
                      onBack={() => setActiveConv(null)}
                    />
                  </div>
                )}

                {/* ===== Active Group Chat ===== */}
                {activeGroup && (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-white/[0.06] bg-[#0A0A0F]/80 backdrop-blur-md shrink-0">
                      <button
                        onClick={() => { setActiveGroup(null); setGroupMessages([]) }}
                        className="touch-target flex h-10 w-10 items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
                        aria-label="Back to groups"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <UserAvatar
                        user={{ id: activeGroup.id, name: activeGroup.name, avatarUrl: activeGroup.avatarUrl, username: null }}
                        size="md"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{activeGroup.name}</p>
                        <p className="text-[11px] text-[#6B6B80]">{activeGroup.members.length} members</p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-thumb-white/[0.08]">
                      {groupMsgLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 size={20} className="animate-spin text-[#4F6EF7]" />
                        </div>
                      ) : groupMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-3">
                            <Hash size={20} className="text-[#4F6EF7]" />
                          </div>
                          <p className="text-sm text-[#6B6B80]">No messages yet</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {groupMessages.map((msg) => (
                            <ChatMessageBubble
                              key={msg.id}
                              message={msg}
                              isOwn={msg.senderId === uid}
                              onImageClick={() => {}}
                            />
                          ))}
                        </div>
                      )}
                      <div ref={bottomRef} />
                    </div>

                    <MessageComposer
                      groupId={activeGroup.id}
                      currentUserId={uid}
                      otherUserName={activeGroup.name}
                      onMessageSent={(msg) => setGroupMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])}
                    />
                  </div>
                )}

                {/* ===== Chats Tab Content ===== */}
                {!activeConv && !activeGroup && tab === "chats" && (
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
                    {convLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 size={22} className="animate-spin text-[#4F6EF7]" />
                      </div>
                    ) : convError ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <AlertCircle size={26} className="text-red-400 mb-2" />
                        <p className="text-xs text-[#6B6B80] mb-3">{convError}</p>
                        <button
                          onClick={loadConvs}
                          className="touch-target flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-2 text-xs font-medium text-white hover:bg-[#4F6EF7]/90 transition-all"
                        >
                          <RefreshCw size={13} />
                          Retry
                        </button>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <MessageCircle size={30} className="text-[#4A4A5A] mb-3" />
                        <p className="text-sm text-[#6B6B80]">No conversations yet</p>
                        <p className="text-xs text-[#4A4A5A] mt-1">Start by visiting someone's profile</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        <AnimatePresence mode="popLayout">
                          {conversations.map((conv) => (
                            <motion.button
                              key={conv.id}
                              initial={isMobile ? false : { opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={isMobile ? undefined : { opacity: 0, y: -8 }}
                              transition={{ duration: 0.15 }}
                              onClick={() => handleSelectConversation(conv)}
                              className="flex w-full items-center gap-3 px-4 py-3 min-h-[48px] touch-target hover:bg-white/[0.03] transition-colors text-left"
                            >
                              <UserAvatar user={conv.otherUser} size="md" />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-white truncate">{getUserDisplayName(conv.otherUser)}</p>
                                  <p className="text-[10px] text-[#4A4A5A] shrink-0 ml-2">
                                    {new Date(conv.lastMessageAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                                <div className="flex items-center justify-between mt-0.5">
                                  <p className="text-xs text-[#6B6B80] truncate">{conv.lastMessage || "Start the conversation"}</p>
                                  {conv.unreadCount > 0 && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="ml-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-white"
                                    >
                                      {conv.unreadCount}
                                    </motion.span>
                                  )}
                                </div>
                              </div>
                            </motion.button>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== Notifications Tab Content ===== */}
                {!activeConv && !activeGroup && tab === "notifications" && (
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
                    {notifLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 size={22} className="animate-spin text-[#4F6EF7]" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <Bell size={30} className="text-[#4A4A5A] mb-3" />
                        <p className="text-sm text-[#6B6B80]">No notifications yet</p>
                        <p className="text-xs text-[#4A4A5A] mt-1">We'll notify you when something arrives</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {notifications.map((notif) => {
                          const action = notificationAction(notif.type, notif.payload)
                          return (
                            <motion.div
                              key={notif.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                              className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.03] last:border-0"
                            >
                              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4F6EF7]/10 text-[#4F6EF7]">
                                {notificationIcon(notif.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm font-medium text-white">{notif.title}</p>
                                  <p className="text-[10px] text-[#4A4A5A] shrink-0 whitespace-nowrap">
                                    {new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </p>
                                </div>
                                {notif.message && (
                                  <p className="text-xs text-[#6B6B80] mt-0.5 line-clamp-2">{notif.message}</p>
                                )}
                                {action && (
                                  <button
                                    onClick={() => {
                                      if (action.to) navigate(action.to)
                                    }}
                                    className="touch-target mt-2 flex items-center gap-1.5 rounded-lg bg-[#4F6EF7]/10 px-3 py-1.5 text-[11px] font-medium text-[#4F6EF7] hover:bg-[#4F6EF7]/20 transition-all"
                                  >
                                    {action.label}
                                  </button>
                                )}
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                    {notifications.length > 0 && (
                      <div className="px-4 py-3 border-t border-white/[0.04]">
                        <button
                          onClick={handleNotifMarkRead}
                          className="touch-target w-full rounded-xl bg-white/[0.04] py-2.5 text-xs font-medium text-[#6B6B80] hover:text-white hover:bg-white/[0.08] transition-all"
                        >
                          Mark all as read
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ===== Groups Tab Content ===== */}
                {!activeConv && !activeGroup && tab === "groups" && (
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
                    {groupsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 size={22} className="animate-spin text-[#4F6EF7]" />
                      </div>
                    ) : groups.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                        <Users size={30} className="text-[#4A4A5A] mb-3" />
                        <p className="text-sm text-[#6B6B80]">No groups yet</p>
                        <p className="text-xs text-[#4A4A5A] mt-1">Create a group in the Messages page</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {groups.map((group) => (
                          <motion.button
                            key={group.id}
                            initial={isMobile ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => handleSelectGroup(group)}
                            className="flex w-full items-center gap-3 px-4 py-3 min-h-[48px] touch-target hover:bg-white/[0.03] transition-colors text-left"
                          >
                            <div className="relative shrink-0">
                              <UserAvatar
                                user={{ id: group.id, name: group.name, avatarUrl: group.avatarUrl, username: null }}
                                size="md"
                              />
                              <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0A0A0F] bg-[#6D28D9]">
                                <Users size={7} className="text-white" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-white truncate">{group.name}</p>
                                <p className="text-[10px] text-[#4A4A5A] shrink-0 ml-2">
                                  {group.lastMessage
                                    ? new Date(group.lastMessage.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                    : ""}
                                </p>
                              </div>
                              <div className="flex items-center justify-between mt-0.5">
                                <p className="text-xs text-[#6B6B80] truncate">
                                  {group.lastMessage?.content || "No messages yet"}
                                </p>
                                <div className="flex items-center gap-1.5 ml-2">
                                  <span className="text-[10px] text-[#4A4A5A]">{group.members.length} members</span>
                                  {group.unreadCount > 0 && (
                                    <motion.span
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[#4F6EF7] px-1 text-[9px] font-bold text-white"
                                    >
                                      {group.unreadCount}
                                    </motion.span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </>
  )
}
