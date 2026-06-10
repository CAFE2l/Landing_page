import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import { useSearchParams, useParams, useNavigate } from "react-router-dom"
import {
  MessageCircle, Loader2, Search, Hash,
  Send, X, Camera, ChevronLeft, Heart, MessageSquare,
  ExternalLink, Plus, AlertCircle, RefreshCw,
  FileText, Download, Film, ImageIcon, Music,
  MoreVertical, Edit3, Trash2, Reply, Copy, Forward,
  Users, UserPlus, Check, CheckCheck, Settings, LogOut, UserMinus, Save, ChevronDown,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import FloatingOrbs from "../components/landing/FloatingOrbs"
import Navbar from "../components/landing/Navbar"
import { useAuth } from "../contexts/AuthContext"
import { loadCurrentUser } from "../data/feedbackStore"
import { supabase } from "../lib/supabase/client"
import {
  fetchConversations, fetchMessages, markMessagesAsRead, subscribeToMessages,
  uploadChatMedia, subscribeToConversationUpdates, createOrGetConversation,
  editMessage, softDeleteMessage, clearConversationMessages, forwardMessage,
  createGroup, fetchUserGroups, fetchGroupMessages, sendGroupMessage,
  subscribeToGroupMessages, fetchProfilesByIds, updateGroupDetails,
  addGroupMembers, removeGroupMember, leaveGroup, updateGroupMemberRole, deleteGroup,
} from "../lib/chatService"
import {
  fetchSocialPosts, createSocialPost, toggleSocialLike, addPostComment,
  fetchPostComments, toggleFollow, isFollowing,
} from "../lib/socialService"
import {
  canQuerySocialFollows,
  markSocialFollowsError,
} from "../lib/socialFollowsHealth"
import MessageComposer from "../components/chat/MessageComposer"
import BotNotificationCard, { parseBotNotification } from "../components/chat/BotNotificationCard"
import FollowButton from "../components/ui/FollowButton"
import { getUserDisplayName } from "../lib/utils"
import UserAvatar from "../components/ui/UserAvatar"
import { useUserProfile } from "../hooks/useUserProfile"
import { useBotNotifications } from "../hooks/useBotNotifications"
import type {
  ChatConversation as ChatConv, ChatMessage, SocialPost,
  Group,
} from "../data/feedbackStore"
import toast from "react-hot-toast"

type Tab = "conversations" | "status" | "groups"
type GroupMemberOption = {
  id: string
  full_name: string | null
  username: string | null
  avatar_url: string | null
  email: string | null
}

export default function MessagesPage() {
  const { user: supabaseUser } = useAuth()
  const localUser = loadCurrentUser()
  const currentUser = supabaseUser || localUser
  const userProfile = currentUser as unknown as {
    id?: string; uid?: string; name?: string; email?: string; photoUrl?: string; photoURL?: string;
    avatarUrl?: string | null; avatar_url?: string | null; full_name?: string | null; username?: string | null;
  } | null
  const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id
  const BOT_ID = "00000000-0000-0000-0000-000000000001"
  const { profile: currentProfile } = useUserProfile()
  const canClearBotChat =
    currentProfile?.role === "admin" ||
    currentProfile?.role === "owner" ||
    supabaseUser?.app_metadata?.role === "admin" ||
    supabaseUser?.app_metadata?.role === "owner"
  useBotNotifications(uid)
  const composerUser = useMemo(() => ({
    ...userProfile,
    id: uid,
    full_name: currentProfile?.full_name || userProfile?.full_name || userProfile?.name || null,
    name: currentProfile?.full_name || userProfile?.name || null,
    username: currentProfile?.username || userProfile?.username || null,
    email: currentProfile?.email || userProfile?.email || supabaseUser?.email || null,
    avatar_url: currentProfile?.avatar_url || userProfile?.avatar_url || userProfile?.avatarUrl || null,
    avatarUrl: currentProfile?.avatar_url || userProfile?.avatarUrl || userProfile?.avatar_url || null,
    photoUrl: userProfile?.photoUrl || supabaseUser?.user_metadata?.avatar_url || supabaseUser?.user_metadata?.picture || null,
  }), [currentProfile, supabaseUser, uid, userProfile])

  const [searchParams, setSearchParams] = useSearchParams()
  const { conversationId: urlConversationId } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>("conversations")
  const [conversations, setConversations] = useState<ChatConv[]>([])
  const [convLoading, setConvLoading] = useState(true)
  const [convError, setConvError] = useState<string | null>(null)
  const [activeConv, setActiveConv] = useState<ChatConv | null>(null)
  const isActiveConvBot = !!(activeConv && (activeConv.participantA === BOT_ID || activeConv.participantB === BOT_ID))
  const getBotFixedUser = (conv: typeof activeConv) =>
    conv && (conv.participantA === BOT_ID || conv.participantB === BOT_ID)
      ? { ...conv.otherUser, avatarUrl: conv.otherUser.avatarUrl || "/imgs/bot/bot.jpeg" }
      : conv?.otherUser
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const [mobileView, setMobileView] = useState<"list" | "chat">("list")

  // Conversation messages
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [msgLoading, setMsgLoading] = useState(false)
  const [msgError, setMsgError] = useState<string | null>(null)
  const [clearingChat, setClearingChat] = useState(false)

  // Status feed
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)
  const [postInput, setPostInput] = useState("")
  const [posting, setPosting] = useState(false)
  const [postMediaUrl, setPostMediaUrl] = useState<string | null>(null)
  const [postMediaType, setPostMediaType] = useState<"image" | "video" | "audio" | null>(null)
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [commenting, setCommenting] = useState<Record<string, boolean>>({})
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  // Profile drawer
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null)
  const [drawerProfile, setDrawerProfile] = useState<{
    id: string; name: string; avatarUrl: string | null; username: string | null; bio: string | null;
    followers: number; following: number; postsCount: number; following_: boolean;
  } | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Message actions state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState("")
  const [dropdownMsgId, setDropdownMsgId] = useState<string | null>(null)
  const [forwardMsg, setForwardMsg] = useState<ChatMessage | null>(null)
  const [forwardTargets, setForwardTargets] = useState<{ id: string; name: string; type: "conversation" | "group"; otherUserId?: string }[]>([])
  const [forwarding, setForwarding] = useState(false)
  const [forwardSelectedId, setForwardSelectedId] = useState<string | null>(null)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDesc, setGroupDesc] = useState("")
  const [groupAvatar, setGroupAvatar] = useState<File | null>(null)
  const [groupSearch, setGroupSearch] = useState("")
  const [groupSearchResults, setGroupSearchResults] = useState<GroupMemberOption[]>([])
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [selectedMemberProfiles, setSelectedMemberProfiles] = useState<Record<string, GroupMemberOption>>({})
  const [groupMembersOpen, setGroupMembersOpen] = useState(false)
  const [groupMembersLoading, setGroupMembersLoading] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)

  // Group state
  const [groups, setGroups] = useState<Group[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [groupMessages, setGroupMessages] = useState<ChatMessage[]>([])
  const [groupMsgLoading, setGroupMsgLoading] = useState(false)
  const [profilesCache, setProfilesCache] = useState<Record<string, { name: string; avatarUrl: string | null; username: string | null }>>({})
  const [groupMenuOpen, setGroupMenuOpen] = useState(false)
  const [groupListMenuId, setGroupListMenuId] = useState<string | null>(null)
  const [showGroupSettings, setShowGroupSettings] = useState(false)
  const [manageGroupName, setManageGroupName] = useState("")
  const [manageGroupDesc, setManageGroupDesc] = useState("")
  const [manageGroupAvatar, setManageGroupAvatar] = useState<File | null>(null)
  const [manageMemberSearch, setManageMemberSearch] = useState("")
  const [manageMemberResults, setManageMemberResults] = useState<GroupMemberOption[]>([])
  const [manageSelectedMembers, setManageSelectedMembers] = useState<string[]>([])
  const [manageSelectedProfiles, setManageSelectedProfiles] = useState<Record<string, GroupMemberOption>>({})
  const [savingGroup, setSavingGroup] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Close dropdown on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownMsgId(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // ========== Load conversations ==========
  const loadConversations = useCallback(async () => {
    if (!uid) return
    setConvLoading(true)
    setConvError(null)
    try {
      const convs = await fetchConversations(uid)
      setConversations(convs)
    } catch {
      setConvError("Failed to load conversations")
    }
    setConvLoading(false)
  }, [uid])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    if (!uid) return
    const cleanup = subscribeToConversationUpdates(uid, loadConversations)
    return cleanup
  }, [uid, loadConversations])

  // ========== URL param auto-select ==========
  useEffect(() => {
    const convId = searchParams.get("conversationId") || urlConversationId
    if (!convId || conversations.length === 0 || activeConv) return
    const found = conversations.find((c) => c.id === convId)
    if (found) {
      setActiveConv(found)
      setMobileView("chat")
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, urlConversationId, conversations])

  // ========== Load messages for active conversation ==========
  const loadMessages = useCallback(async () => {
    if (!activeConv) return
    setMsgLoading(true)
    setMsgError(null)
    try {
      const msgs = await fetchMessages(activeConv.id)
      setMessages(msgs)
      await markMessagesAsRead(activeConv.id, uid)
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConv.id ? { ...c, unreadCount: 0 } : c,
        ),
      )
    } catch {
      setMsgError("Failed to load messages")
    }
    setMsgLoading(false)
  }, [activeConv, uid])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  // Realtime subscription for active conversation
  useEffect(() => {
    if (!activeConv) return
    const cleanup = subscribeToMessages(
      activeConv.id,
      (msg) => {
        setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
        if (msg.senderId !== uid) {
          markMessagesAsRead(activeConv.id, uid)
        }
      },
      undefined,
      (msg) => {
        setMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m))
      },
    )
    return cleanup
  }, [activeConv, uid])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, groupMessages.length])

  // ========== Handle select conversation ==========
  const handleSelectConversation = (conv: ChatConv) => {
    setActiveConv(conv)
    setActiveGroup(null)
    setMobileView("chat")
    setReplyTo(null)
    setDropdownMsgId(null)
  }

  const handleBack = () => {
    setActiveConv(null)
    setActiveGroup(null)
    setMobileView("list")
    loadConversations()
    setReplyTo(null)
    setDropdownMsgId(null)
  }

  // ========== Load status feed ==========
  const loadPosts = useCallback(async (mode: "all" | "following") => {
    if (!uid) return
    setPostsLoading(true)
    setPostError(null)
    try {
      const data = await fetchSocialPosts(mode, uid)
      setPosts(data)
    } catch {
      setPostError("Failed to load status updates")
    }
    setPostsLoading(false)
  }, [uid])

  useEffect(() => {
    if (tab === "status") loadPosts("all")
  }, [tab, loadPosts])

  // ========== Create status ==========
  const handleCreatePost = async () => {
    if ((!postInput.trim() && !postMediaUrl) || !uid || posting) return
    setPosting(true)
    const post = await createSocialPost(uid, postInput.trim(), postMediaUrl || undefined, postMediaType || undefined)
    setPosting(false)
    if (post) {
      setPosts((prev) => [post, ...prev])
      setPostInput("")
      setPostMediaUrl(null)
      setPostMediaType(null)
    } else {
      toast.error("Failed to publish status")
    }
  }

  // ========== Like post ==========
  const handleLike = async (postId: string) => {
    if (!uid) { toast.error("Login to like"); return }
    const liked = await toggleSocialLike(postId, uid)
    if (liked) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked: !p.liked, likesCount: p.liked ? p.likesCount - 1 : p.likesCount + 1 }
            : p,
        ),
      )
    }
  }

  // ========== Comment ==========
  const toggleComments = async (postId: string) => {
    if (expandedComments.has(postId)) {
      setExpandedComments((prev) => { const n = new Set(prev); n.delete(postId); return n })
      return
    }
    const comments = await fetchPostComments(postId)
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comments } : p))
    setExpandedComments((prev) => { const n = new Set(prev); n.add(postId); return n })
  }

  const handleComment = async (postId: string) => {
    const text = commentInput[postId]?.trim()
    if (!text || !uid) return
    setCommenting((prev) => ({ ...prev, [postId]: true }))
    const comment = await addPostComment(postId, uid, text)
    if (comment) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, comments: [...p.comments, comment], commentsCount: p.commentsCount + 1 }
            : p,
        ),
      )
      setCommentInput((prev) => ({ ...prev, [postId]: "" }))
    }
    setCommenting((prev) => ({ ...prev, [postId]: false }))
  }

  // ========== Profile drawer ==========
  const openProfile = async (userId: string) => {
    if (!userId || userId === BOT_ID || userId === "cafe_bot") return
    setDrawerUserId(userId)
    setDrawerLoading(true)
    try {
      const { data: profile } = await supabase!.from("profiles").select("*").eq("id", userId).maybeSingle()
      const row = (profile || {}) as Record<string, unknown>
      const [followersRes, followingRes, { count: postsCount }, following_] = await Promise.all([
        canQuerySocialFollows()
          ? supabase!.from("social_follows").select("*", { count: "exact", head: true }).eq("following_id", userId)
          : Promise.resolve({ count: 0, error: null }),
        canQuerySocialFollows()
          ? supabase!.from("social_follows").select("*", { count: "exact", head: true }).eq("follower_id", userId)
          : Promise.resolve({ count: 0, error: null }),
        supabase!.from("social_posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
        uid ? isFollowing(uid, userId) : Promise.resolve(false),
      ])
      markSocialFollowsError("count drawer followers", followersRes.error)
      markSocialFollowsError("count drawer following", followingRes.error)
      setDrawerProfile({
        id: userId,
        name: (row.full_name as string) || (row.username as string) || (row.email as string)?.split("@")[0] || "Unknown user",
        avatarUrl: (row.avatar_url as string) || null,
        username: (row.username as string) || null,
        bio: (row.bio as string) || null,
        followers: followersRes.error ? 0 : followersRes.count || 0,
        following: followingRes.error ? 0 : followingRes.count || 0,
        postsCount: postsCount || 0,
        following_,
      })
    } catch {
      toast.error("Failed to load profile")
    }
    setDrawerLoading(false)
  }

  // ========== Groups ==========
  const loadGroups = useCallback(async () => {
    if (!uid) return
    setGroupsLoading(true)
    try {
      const data = await fetchUserGroups()
      setGroups(data)
    } catch {
      toast.error("Failed to load groups")
    }
    setGroupsLoading(false)
  }, [uid])

  useEffect(() => {
    if (tab === "groups") loadGroups()
  }, [tab, loadGroups])

  const handleSelectGroup = (group: Group) => {
    setActiveGroup(group)
    setActiveConv(null)
    setMobileView("chat")
    setGroupMessages([])
    loadGroupMessages(group.id)
    loadProfilesForGroup(group.id)
  }

  const loadGroupMessages = async (groupId: string) => {
    setGroupMsgLoading(true)
    try {
      const msgs = await fetchGroupMessages(groupId)
      setGroupMessages(msgs)
    } catch {
      toast.error("Failed to load group messages")
    }
    setGroupMsgLoading(false)
  }

  const loadProfilesForGroup = async (groupId: string) => {
    const group = groups.find((g) => g.id === groupId) || activeGroup
    if (!group) return
    const memberIds = group.members.map((m) => m.userId)
    const uniqueIds = [...new Set(memberIds)]
    const profiles = await fetchProfilesByIds(uniqueIds)
    setProfilesCache((prev) => ({ ...prev, ...profiles }))
  }

  // Realtime subscription for active group
  useEffect(() => {
    if (!activeGroup) return
    const cleanup = subscribeToGroupMessages(
      activeGroup.id,
      (msg) => {
        setGroupMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
        if (msg.senderId !== uid) {
          setGroups((prev) => prev.map((g) => g.id === activeGroup.id ? { ...g, unreadCount: g.unreadCount + 1 } : g))
        }
      },
      (msg) => {
        setGroupMessages((prev) => prev.map((m) => m.id === msg.id ? msg : m))
      },
    )
    return cleanup
  }, [activeGroup, uid])

  // Load profiles for group messages when they arrive
  useEffect(() => {
    const senderIds = [...new Set(groupMessages.map((m) => m.senderId))]
    const missing = senderIds.filter((id) => !profilesCache[id])
    if (missing.length > 0) {
      fetchProfilesByIds(missing).then((profiles) => {
        setProfilesCache((prev) => ({ ...prev, ...profiles }))
      })
    }
  }, [groupMessages.length])

  // ========== Message Actions ==========
  const handleEdit = async (msg: ChatMessage) => {
    if (msg.senderId !== uid) return
    setEditingMsgId(msg.id)
    setEditingContent(msg.content || "")
    setDropdownMsgId(null)
  }

  const handleSaveEdit = async (msgId: string) => {
    if (!editingContent.trim()) return
    const ok = await editMessage(msgId, editingContent.trim())
    if (ok) {
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: editingContent.trim(), editedAt: new Date().toISOString() } : m))
      setGroupMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content: editingContent.trim(), editedAt: new Date().toISOString() } : m))
    }
    setEditingMsgId(null)
    setEditingContent("")
  }

  const handleCancelEdit = () => {
    setEditingMsgId(null)
    setEditingContent("")
  }

  const handleDelete = async (msg: ChatMessage) => {
    if (msg.senderId !== uid) return
    if (!window.confirm("Delete this message? This action cannot be undone.")) return
    const ok = await softDeleteMessage(msg.id)
    if (ok) {
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: "[deleted]", deletedAt: new Date().toISOString() } : m))
      setGroupMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, content: "[deleted]", deletedAt: new Date().toISOString() } : m))
    }
    setDropdownMsgId(null)
  }

  const handleReply = (msg: ChatMessage) => {
    setReplyTo(msg)
    setDropdownMsgId(null)
  }

  const handleCopy = async (msg: ChatMessage) => {
    const text = msg.content || msg.caption || ""
    if (text) {
      try {
        await navigator.clipboard.writeText(text)
        toast.success("Copied to clipboard")
      } catch {
        toast.error("Failed to copy")
      }
    }
    setDropdownMsgId(null)
  }

  const handleForward = (msg: ChatMessage) => {
    setForwardMsg(msg)
    setForwardSelectedId(null)
    // Build targets from conversations + groups, excluding active
    const convTargets = conversations
      .filter((c) => !activeConv || c.id !== activeConv.id)
      .map((c) => ({
        id: c.id,
        name: c.otherUser.name,
        type: "conversation" as const,
        otherUserId: c.participantA === uid ? c.participantB : c.participantA,
      }))
    const groupTargets = groups
      .filter((g) => !activeGroup || g.id !== activeGroup.id)
      .map((g) => ({
        id: g.id,
        name: g.name,
        type: "group" as const,
      }))
    setForwardTargets([...convTargets, ...groupTargets])
    setDropdownMsgId(null)
  }

  const handleForwardSubmit = async () => {
    if (!forwardMsg || !forwardSelectedId || !uid || forwarding) return
    setForwarding(true)
    const target = forwardTargets.find((t) => t.id === forwardSelectedId)
    if (!target) { setForwarding(false); return }
    if (target.type === "conversation" && target.otherUserId) {
      const result = await forwardMessage(forwardMsg, target.id, target.otherUserId, uid)
      if (result) toast.success("Message forwarded")
    } else {
      const content = forwardMsg.content || forwardMsg.caption || ""
      const msg = await sendGroupMessage(target.id, uid, content, forwardMsg.messageType, forwardMsg.mediaUrl || undefined, forwardMsg.caption || undefined, forwardMsg.mediaMimeType || undefined, forwardMsg.mediaSize || undefined, forwardMsg.mediaDuration || undefined, forwardMsg.fileName || undefined)
      if (msg) toast.success("Message forwarded to group")
    }
    setForwarding(false)
    setForwardMsg(null)
    setForwardSelectedId(null)
  }

  // ========== Group creation ==========
  const loadGroupCandidates = useCallback(async (query = "") => {
    if (!supabase) return
    const term = query.trim().replace(/[%,]/g, "")
    setGroupMembersLoading(true)
    try {
      let request = supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, email")
        .limit(12)

      if (uid) request = request.neq("id", uid)
      if (term) {
        request = request.or(`full_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`)
      } else {
        request = request.order("full_name", { ascending: true, nullsFirst: false })
      }

      const { data, error } = await request
      if (error) throw error
      setGroupSearchResults((data || []) as GroupMemberOption[])
    } catch {
      setGroupSearchResults([])
    } finally {
      setGroupMembersLoading(false)
    }
  }, [uid])

  useEffect(() => {
    if (!showCreateGroup) return
    setGroupMembersOpen(true)
    loadGroupCandidates("")
  }, [showCreateGroup, loadGroupCandidates])

  const handleGroupSearch = useCallback((query: string) => {
    setGroupSearch(query)
    setGroupMembersOpen(true)
    loadGroupCandidates(query)
  }, [loadGroupCandidates])

  const getCandidateName = (user: GroupMemberOption) => user.full_name || user.username || user.email || "Unnamed user"

  const handleAddMember = (user: GroupMemberOption) => {
    if (!selectedMembers.includes(user.id)) {
      setSelectedMembers((prev) => [...prev, user.id])
      setSelectedMemberProfiles((prev) => ({ ...prev, [user.id]: user }))
    }
    setGroupSearch("")
    setGroupMembersOpen(true)
    loadGroupCandidates("")
  }

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers((prev) => prev.filter((id) => id !== userId))
    setSelectedMemberProfiles((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !uid || creatingGroup) return
    setCreatingGroup(true)
    let avatarUrl: string | null = null
    if (groupAvatar) {
      const uploaded = await uploadChatMedia(groupAvatar, uid)
      avatarUrl = uploaded?.url || null
    }
    const groupId = await createGroup(groupName.trim(), groupDesc.trim() || null, [...new Set(selectedMembers)], avatarUrl)
    setCreatingGroup(false)
    if (groupId) {
      toast.success("Group created")
      setShowCreateGroup(false)
      setGroupName("")
      setGroupDesc("")
      setGroupAvatar(null)
      setGroupSearch("")
      setGroupSearchResults([])
      setSelectedMembers([])
      setSelectedMemberProfiles({})
      setGroupMembersOpen(false)
      loadGroups()
    } else {
      toast.error("Failed to create group")
    }
  }

  const openGroupSettings = (group = activeGroup) => {
    if (!group) return
    setActiveGroup(group)
    setManageGroupName(group.name)
    setManageGroupDesc(group.description || "")
    setManageGroupAvatar(null)
    setManageMemberSearch("")
    setManageMemberResults([])
    setManageSelectedMembers([])
    setManageSelectedProfiles({})
    setShowGroupSettings(true)
    setGroupMenuOpen(false)
  }

  const searchManageMembers = useCallback(async (query: string) => {
    if (!supabase || !activeGroup) return
    const term = query.trim().replace(/[%,]/g, "")
    setManageMemberSearch(query)
    setGroupMembersLoading(true)
    try {
      let request = supabase
        .from("profiles")
        .select("id, full_name, username, avatar_url, email")
        .limit(12)

      const existingIds = new Set(activeGroup.members.map((member) => member.userId))
      if (uid) existingIds.add(uid)
      if (existingIds.size > 0) request = request.not("id", "in", `(${[...existingIds].join(",")})`)
      if (term) {
        request = request.or(`full_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`)
      } else {
        request = request.order("full_name", { ascending: true, nullsFirst: false })
      }

      const { data, error } = await request
      if (error) throw error
      setManageMemberResults((data || []) as GroupMemberOption[])
    } catch {
      setManageMemberResults([])
    } finally {
      setGroupMembersLoading(false)
    }
  }, [activeGroup, uid])

  const handleSelectManageMember = (user: GroupMemberOption) => {
    if (!manageSelectedMembers.includes(user.id)) {
      setManageSelectedMembers((prev) => [...prev, user.id])
      setManageSelectedProfiles((prev) => ({ ...prev, [user.id]: user }))
    }
    setManageMemberSearch("")
    searchManageMembers("")
  }

  const handleRemoveManageSelected = (userId: string) => {
    setManageSelectedMembers((prev) => prev.filter((id) => id !== userId))
    setManageSelectedProfiles((prev) => {
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }

  const isGroupAdmin = (group: Group | null) =>
    !!group?.members.some((member) => member.userId === uid && member.role === "admin")

  const handleSaveGroupSettings = async () => {
    if (!activeGroup || !manageGroupName.trim() || savingGroup || !uid) return
    setSavingGroup(true)

    let avatarUrl: string | null | undefined = undefined
    if (manageGroupAvatar) {
      const uploaded = await uploadChatMedia(manageGroupAvatar, uid)
      if (uploaded) avatarUrl = uploaded.url
    }

    const detailsOk = await updateGroupDetails(activeGroup.id, {
      name: manageGroupName.trim(),
      description: manageGroupDesc.trim() || null,
      avatarUrl,
    })
    const membersOk = manageSelectedMembers.length > 0
      ? await addGroupMembers(activeGroup.id, manageSelectedMembers)
      : true

    setSavingGroup(false)
    if (!detailsOk || !membersOk) return

    toast.success("Group updated")
    setShowGroupSettings(false)
    await loadGroups()
    setActiveGroup((prev) => prev ? {
      ...prev,
      name: manageGroupName.trim(),
      description: manageGroupDesc.trim() || null,
      avatarUrl: avatarUrl === undefined ? prev.avatarUrl : avatarUrl,
    } : prev)
  }

  const handleRemoveMemberFromActiveGroup = async (userId: string) => {
    if (!activeGroup) return
    await handleRemoveMemberFromGroup(activeGroup, userId)
  }

  const handleRemoveMemberFromGroup = async (group: Group, userId: string) => {
    if (!uid) return
    const removingSelf = userId === uid
    if (!window.confirm(removingSelf ? `Leave ${group.name}?` : "Remove this member from the group?")) return
    const ok = userId === uid
      ? await leaveGroup(group.id)
      : await removeGroupMember(group.id, userId)
    if (!ok) return
    setActiveGroup((prev) => prev ? { ...prev, members: prev.members.filter((member) => member.userId !== userId) } : prev)
    setGroups((prev) => prev.map((item) => item.id === group.id ? { ...item, members: item.members.filter((member) => member.userId !== userId) } : item))
    toast.success(userId === uid ? "You left the group" : "Member removed")
    if (userId === uid) {
      setShowGroupSettings(false)
      if (activeGroup?.id === group.id) handleBack()
      loadGroups()
    }
  }

  const handleUpdateActiveMemberRole = async (userId: string, role: "admin" | "member") => {
    if (!activeGroup || !uid || !isGroupAdmin(activeGroup)) return
    const ok = await updateGroupMemberRole(activeGroup.id, userId, role)
    if (!ok) return

    const updateRole = (group: Group) => ({
      ...group,
      members: group.members.map((member) => member.userId === userId ? { ...member, role } : member),
    })
    setActiveGroup((prev) => prev ? updateRole(prev) : prev)
    setGroups((prev) => prev.map((group) => group.id === activeGroup.id ? updateRole(group) : group))
    toast.success(role === "admin" ? "Member promoted to admin" : "Member changed to member")
  }

  const handleDeleteActiveGroup = async () => {
    if (!activeGroup) return
    await handleDeleteGroup(activeGroup)
  }

  const handleDeleteGroup = async (group: Group) => {
    if (!isGroupAdmin(group)) return
    if (!window.confirm(`Delete ${group.name}? This cannot be undone.`)) return
    const ok = await deleteGroup(group.id)
    if (!ok) return
    toast.success("Group deleted")
    setShowGroupSettings(false)
    if (activeGroup?.id === group.id) handleBack()
    loadGroups()
  }

  const handleClearChat = async () => {
    if (!activeConv) return
    const label = isActiveConvBot ? "CAFÉ Bot chat cleared" : "Chat cleared"
    const confirmed = window.confirm(`Clear all messages from this ${isActiveConvBot ? "CAFÉ Bot " : ""}chat? This removes the visible conversation history.`)
    if (!confirmed) return

    setClearingChat(true)
    const ok = await clearConversationMessages(activeConv.id, label)
    setClearingChat(false)

    if (!ok) return
    setMessages([])
    toast.success(label)
    await loadConversations()
  }

  // ========== Filtered conversations ==========
  const filtered = useMemo(() => {
    let list = conversations
    if (search) {
      list = list.filter((c) => c.otherUser.name.toLowerCase().includes(search.toLowerCase()))
    }
    if (filter === "unread") {
      list = list.filter((c) => c.unreadCount > 0)
    }
    return list
  }, [conversations, search, filter])

  const getMessageSnippet = (msg: ChatMessage) => {
    if (msg.deletedAt) return "[deleted]"
    if (msg.content) return msg.content
    if (msg.caption) return msg.caption
    if (msg.messageType === "image") return "Photo"
    if (msg.messageType === "video") return "Video"
    if (msg.messageType === "audio") return "Audio"
    if (msg.messageType === "file") return msg.fileName || "File"
    if (msg.messageType === "sticker") return "Sticker"
    return "Message"
  }

  const getMessageSenderName = (msg: ChatMessage) => {
    if (msg.senderId === uid) return "You"
    if (activeConv) return getUserDisplayName(activeConv.otherUser)
    return profilesCache[msg.senderId]?.name || "Member"
  }

  const scrollToMessage = (messageId: string | null) => {
    if (!messageId) return
    const node = messageRefs.current[messageId]
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "center" })
    node.classList.add("ring-2", "ring-[#4F6EF7]/60")
    window.setTimeout(() => node.classList.remove("ring-2", "ring-[#4F6EF7]/60"), 1200)
  }

  // ========== Render message with actions ==========
  const renderMessage = (msg: ChatMessage, isOwn: boolean, showSender = false, senderName?: string) => {
    const isDeleted = !!msg.deletedAt
    const botPayload = !isOwn && msg.senderId === BOT_ID ? parseBotNotification(msg.content || "") : null
    if (botPayload) {
      return (
        <div
          key={msg.id}
          ref={(node) => { messageRefs.current[msg.id] = node }}
          id={`message-${msg.id}`}
        >
          <BotNotificationCard payload={botPayload} timestamp={msg.createdAt} />
        </div>
      )
    }
    const isEditing = editingMsgId === msg.id
    const showDropdown = dropdownMsgId === msg.id
    const displayContent = isDeleted ? "[deleted]" : msg.content
    const messageList = activeGroup ? groupMessages : messages
    const repliedMessage = msg.replyTo ? messageList.find((item) => item.id === msg.replyTo) : null
    const forwardedMessage = msg.forwardedFrom ? messageList.find((item) => item.id === msg.forwardedFrom) : null
    const replyPreview = msg.replyPreview || (repliedMessage ? {
      id: repliedMessage.id,
      content: getMessageSnippet(repliedMessage),
      senderId: repliedMessage.senderId,
      senderName: getMessageSenderName(repliedMessage),
      messageType: repliedMessage.messageType,
    } : null)
    const forwardedPreview = msg.forwardedPreview || (forwardedMessage ? {
      id: forwardedMessage.id,
      content: getMessageSnippet(forwardedMessage),
      senderId: forwardedMessage.senderId,
      senderName: getMessageSenderName(forwardedMessage),
      messageType: forwardedMessage.messageType,
    } : null)

    return (
      <div
        key={msg.id}
        ref={(node) => { messageRefs.current[msg.id] = node }}
        id={`message-${msg.id}`}
        className={`group relative flex mb-3 ${isOwn ? "justify-end" : "justify-start"}`}
      >
        <div className={`relative max-w-[86%] break-words rounded-2xl px-3.5 py-2.5 pr-8 text-sm leading-relaxed transition-shadow sm:max-w-[75%] sm:px-4 ${
          isOwn
            ? "bg-gradient-to-br from-[#2563EB] to-[#6D28D9] text-white rounded-br-md"
            : "bg-white/[0.06] text-[#F0F0F5] rounded-bl-md"
        }`}>
          {showSender && senderName && !isOwn && (
            <p className="text-[10px] font-semibold text-[#4F6EF7] mb-1">{senderName}</p>
          )}

          {/* Reply preview */}
          {replyPreview && (
            <button
              type="button"
              onClick={() => scrollToMessage(replyPreview.id)}
              className={`touch-target mb-1.5 block w-full rounded-lg p-2 text-left text-xs border-l-2 transition-all hover:bg-white/[0.1] ${
              isOwn ? "bg-white/[0.08] border-white/30" : "bg-white/[0.04] border-[#4F6EF7]/50"
            }`}>
              <p className="font-semibold opacity-80">{replyPreview.senderName}</p>
              <p className="opacity-60 truncate">{replyPreview.content}</p>
            </button>
          )}

          {/* Forwarded preview */}
          {forwardedPreview && (
            <div className="mb-1.5 flex items-center gap-1 text-[10px] opacity-60">
              <Forward size={10} />
              <span>Forwarded from {forwardedPreview.senderName}</span>
            </div>
          )}

          {msg.messageType === "image" || msg.messageType === "video" ? (
            <div className="max-w-[90vw] sm:max-w-full">
              {msg.mediaUrl && (
                msg.messageType === "video"
                  ? <video src={msg.mediaUrl} controls preload="metadata" playsInline className="max-h-56 w-full rounded-lg object-contain sm:max-h-60" />
                  : <img src={msg.mediaUrl} alt="" loading="lazy" decoding="async" className="max-h-56 w-full rounded-lg object-cover sm:max-h-60" />
              )}
              {msg.caption && (
                <>
                  <div className="mx-1 mt-2 h-px bg-white/[0.12]" />
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.caption}
                  </p>
                </>
              )}
            </div>
          ) : msg.messageType === "audio" ? (
            <audio src={msg.mediaUrl!} controls preload="metadata" className="h-10 max-w-full" />
          ) : msg.messageType === "sticker" ? (
            <img src={msg.mediaUrl!} alt="Sticker" className="w-24 h-24 object-contain" />
          ) : msg.messageType === "file" && msg.mediaUrl ? (
            <div>
              <a
                href={msg.mediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`touch-target flex items-center gap-3 rounded-xl p-3 transition-all ${
                  isOwn
                    ? "bg-white/[0.08] hover:bg-white/[0.12]"
                    : "bg-white/[0.04] hover:bg-white/[0.08]"
                }`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  isOwn ? "bg-white/[0.1]" : "bg-[#4F6EF7]/10"
                } text-[#4F6EF7]`}>
                  {msg.mediaMimeType?.startsWith("image/") ? <ImageIcon size={20} /> :
                   msg.mediaMimeType?.startsWith("video/") ? <Film size={20} /> :
                   msg.mediaMimeType?.startsWith("audio/") ? <Music size={20} /> :
                   <FileText size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{msg.fileName || msg.mediaUrl.split("/").pop()?.split("?")[0] || "File"}</p>
                  <p className="text-xs opacity-60 mt-0.5">
                    {msg.mediaMimeType?.split("/").pop()?.toUpperCase() || "FILE"}
                    {msg.mediaSize ? ` — ${msg.mediaSize < 1024 ? `${msg.mediaSize} B` : msg.mediaSize < 1024 * 1024 ? `${(msg.mediaSize / 1024).toFixed(1)} KB` : `${(msg.mediaSize / (1024 * 1024)).toFixed(1)} MB`}` : ""}
                  </p>
                </div>
                <Download size={16} className="shrink-0 opacity-60" />
              </a>
              {msg.caption && (
                <>
                  <div className="mx-1 mt-2 h-px bg-white/[0.12]" />
                  <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.caption}
                  </p>
                </>
              )}
            </div>
          ) : isEditing ? (
            <div className="flex flex-col gap-2">
              <input
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full rounded-lg border border-white/[0.2] bg-white/[0.08] px-3 py-1.5 text-sm text-white outline-none focus:border-[#4F6EF7]/50"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveEdit(msg.id) } if (e.key === "Escape") handleCancelEdit() }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleSaveEdit(msg.id)}
                  className="touch-target flex items-center gap-1 rounded-md bg-[#4F6EF7] px-2.5 py-1 text-[10px] font-medium text-white"
                  aria-label="Save edit"
                >
                  <Check size={12} /> Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="touch-target flex items-center gap-1 rounded-md bg-white/[0.08] px-2.5 py-1 text-[10px] font-medium text-white/70 hover:text-white"
                  aria-label="Cancel edit"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : displayContent ? (
            displayContent
          ) : null}

          {/* Timestamp + edited + read indicators */}
          <div className={`text-[10px] mt-1 flex items-center gap-1.5 ${isOwn ? "text-white/50 justify-end" : "text-[#4A4A5A]"}`}>
            <span>{new Date(msg.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
            {msg.editedAt && <span className="italic opacity-60">(edited)</span>}
            {isOwn && (
              <span className="ml-0.5 inline-flex items-center">
                {!msg.deliveredAt ? (
                  <Loader2 size={10} className="animate-spin text-white/40" />
                ) : !msg.readAt ? (
                  <CheckCheck size={12} className="text-blue-300/60" />
                ) : (
                  <CheckCheck size={12} className="text-blue-400" />
                )}
              </span>
            )}
            {msg.forwardedFrom && <Forward size={10} className="opacity-40" />}
          </div>

          {/* Actions dropdown trigger */}
          {!isDeleted && !isEditing && (
            <div className="absolute right-1 top-1 flex opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
              <button
                onClick={(e) => { e.stopPropagation(); setDropdownMsgId(showDropdown ? null : msg.id) }}
                className="touch-target flex h-7 w-7 items-center justify-center rounded-lg text-white/55 hover:text-white hover:bg-white/[0.12] transition-all"
                aria-label="Message actions"
                aria-expanded={showDropdown}
              >
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          {/* Dropdown */}
          <AnimatePresence>
          {showDropdown && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.14 }}
              className={`absolute z-50 ${isOwn ? "right-1" : "right-1"} top-8 min-w-40 rounded-xl border border-white/[0.08] bg-[#12121A] shadow-xl py-1`}
              role="menu"
            >
              {msg.senderId === uid && (
                <>
                  <button
                    onClick={() => handleEdit(msg)}
                    className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-xs text-[#D0D0E0] hover:bg-white/[0.06] transition-all"
                    role="menuitem"
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(msg)}
                    className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-white/[0.06] transition-all"
                    role="menuitem"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
              <button
                onClick={() => handleReply(msg)}
                className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-xs text-[#D0D0E0] hover:bg-white/[0.06] transition-all"
                role="menuitem"
              >
                <Reply size={14} /> Reply
              </button>
              <button
                onClick={() => handleCopy(msg)}
                className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-xs text-[#D0D0E0] hover:bg-white/[0.06] transition-all"
                role="menuitem"
              >
                <Copy size={14} /> Copy
              </button>
              <button
                onClick={() => handleForward(msg)}
                className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-xs text-[#D0D0E0] hover:bg-white/[0.06] transition-all"
                role="menuitem"
              >
                <Forward size={14} /> Forward
              </button>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  // ========== SIDEBAR ==========
  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Tabs - horizontally scrollable on mobile */}
      <div className="mobile-scroll-x flex border-b border-white/[0.06] shrink-0">
        <div className="flex min-w-full sm:min-w-0">
          {([
            { key: "conversations" as Tab, label: "Conversations", icon: MessageCircle },
            { key: "groups" as Tab, label: "Groups", icon: Users },
            { key: "status" as Tab, label: "Status", icon: Hash },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => {
                if (key === "status") {
                  navigate("/dashboard/status")
                  return
                }
                setTab(key)
                setActiveConv(null)
                setActiveGroup(null)
                setMobileView("list")
              }}
              className={`touch-target flex-1 flex items-center justify-center gap-1.5 px-4 py-3 text-xs font-medium transition-all whitespace-nowrap ${
                tab === key
                  ? "text-[#4F6EF7] border-b-2 border-[#4F6EF7] bg-[#4F6EF7]/5"
                  : "text-[#6B6B80] hover:text-[#F0F0F5] hover:bg-white/[0.02]"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "conversations" && (
        <>
          {/* Search + filters */}
          <div className="border-b border-white/[0.06] px-3 py-2 shrink-0 space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A5A]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations..."
                className="touch-target w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/30 transition-all"
              />
            </div>
            <div className="flex gap-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`touch-target px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === f
                      ? "bg-[#4F6EF7]/15 text-[#4F6EF7]"
                      : "text-[#6B6B80] hover:bg-white/[0.04]"
                  }`}
                >
                  {f === "all" ? "All" : "Unread"}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
            {convLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
              </div>
            ) : convError ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <AlertCircle size={28} className="text-red-400 mb-3" />
                <p className="text-sm text-[#6B6B80] mb-3">{convError}</p>
                <button
                  onClick={loadConversations}
                  className="touch-target flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#4F6EF7]/90 transition-all"
                >
                  <RefreshCw size={13} />
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <MessageCircle size={32} className="text-[#4A4A5A] mb-3" />
                <p className="text-sm text-[#6B6B80]">No conversations</p>
                <p className="text-xs text-[#4A4A5A] mt-1">Visit someone's profile to start one</p>
              </div>
            ) : (
              <div className="py-1">
                {filtered.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`touch-target flex w-full items-center gap-3 px-4 py-3.5 transition-all text-left ${
                      activeConv?.id === conv.id
                        ? "bg-[#4F6EF7]/10 border-l-2 border-[#4F6EF7] shadow-[inset_0_0_20px_rgba(79,110,247,0.04)]"
                        : "hover:bg-white/[0.03] border-l-2 border-transparent"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <UserAvatar user={conv.participantA === BOT_ID || conv.participantB === BOT_ID ? { ...conv.otherUser, avatarUrl: conv.otherUser.avatarUrl || "/imgs/bot/bot.jpeg" } : conv.otherUser} size="md" className="ring-1 ring-white/[0.06]" />
                      {conv.participantA === BOT_ID || conv.participantB === BOT_ID
                        ? <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0A0A0F] bg-[#6D28D9] text-[8px]">🤖</span>
                        : <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A0A0F] bg-[#22C55E]" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white truncate">{getUserDisplayName(conv.otherUser)}</p>
                        <p className="text-[10px] text-[#4A4A5A] shrink-0 ml-2">
                          {new Date(conv.lastMessageAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-[#6B6B80] truncate">{conv.lastMessage || "Start a conversation"}</p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4F6EF7] px-1.5 text-[9px] font-bold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "groups" && (
        <>
          {/* Create Group button */}
          <div className="border-b border-white/[0.06] px-3 py-2 shrink-0">
            <button
              onClick={() => setShowCreateGroup(true)}
              className="touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] px-4 py-2.5 text-xs font-semibold text-white hover:shadow-[0_0_16px_rgba(37,99,235,0.3)] transition-all"
            >
              <UserPlus size={16} />
              Create Group
            </button>
          </div>

          {/* Group list */}
          <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
            {groupsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
              </div>
            ) : groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <Users size={32} className="text-[#4A4A5A] mb-3" />
                <p className="text-sm text-[#6B6B80]">No groups yet</p>
                <p className="text-xs text-[#4A4A5A] mt-1">Create a group to get started</p>
              </div>
            ) : (
              <div className="py-1">
                {groups.map((group) => {
                  const userIsAdmin = group.members.some((member) => member.userId === uid && member.role === "admin")
                  return (
                    <div
                      key={group.id}
                      className={`group/item relative flex w-full items-center gap-1 px-2 py-1 transition-all ${
                        activeGroup?.id === group.id
                          ? "bg-[#4F6EF7]/10 border-l-2 border-[#4F6EF7] shadow-[inset_0_0_20px_rgba(79,110,247,0.04)]"
                          : "hover:bg-white/[0.03] border-l-2 border-transparent"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectGroup(group)}
                        className="touch-target flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2.5 text-left"
                      >
                        <div className="relative shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#4F6EF7]/30 to-[#8B5CF6]/20 text-sm font-bold text-[#4F6EF7] ring-1 ring-white/[0.06]">
                            {group.avatarUrl ? (
                              <img src={group.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
                            ) : (
                              group.name[0]?.toUpperCase() || "G"
                            )}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="truncate text-sm font-semibold text-white">{group.name}</p>
                            <p className="ml-2 shrink-0 text-[10px] text-[#4A4A5A]">
                              {group.lastMessage ? new Date(group.lastMessage.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" }) : ""}
                            </p>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between">
                            <p className="truncate text-xs text-[#6B6B80]">
                              {group.lastMessage
                                ? (group.lastMessage.messageType === "text" ? group.lastMessage.content : `${group.lastMessage.messageType} message`)
                                : "No messages yet"}
                            </p>
                            {group.unreadCount > 0 && (
                              <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#4F6EF7] px-1.5 text-[9px] font-bold text-white">
                                {group.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            setGroupListMenuId((current) => current === group.id ? null : group.id)
                          }}
                          className="touch-target flex h-9 w-9 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/[0.06] hover:text-white"
                          aria-label={`Options for ${group.name}`}
                          aria-expanded={groupListMenuId === group.id}
                        >
                          <MoreVertical size={16} />
                        </button>
                        <AnimatePresence>
                          {groupListMenuId === group.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.98 }}
                              transition={{ duration: 0.14 }}
                              className="absolute right-0 top-10 z-40 min-w-48 rounded-xl border border-white/[0.08] bg-[#12121A] py-1 shadow-xl"
                              role="menu"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setGroupListMenuId(null)
                                  setActiveGroup(group)
                                  openGroupSettings(group)
                                }}
                                className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-[#D0D0E0] transition-all hover:bg-white/[0.06]"
                                role="menuitem"
                              >
                                <Settings size={14} /> Manage Group
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setGroupListMenuId(null)
                                  setActiveGroup(group)
                                  handleRemoveMemberFromGroup(group, uid!)
                                }}
                                className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-[#D0D0E0] transition-all hover:bg-white/[0.06]"
                                role="menuitem"
                              >
                                <LogOut size={14} /> Leave Group
                              </button>
                              {userIsAdmin && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGroupListMenuId(null)
                                    setActiveGroup(group)
                                    handleDeleteGroup(group)
                                  }}
                                  className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-red-400 transition-all hover:bg-white/[0.06]"
                                  role="menuitem"
                                >
                                  <Trash2 size={14} /> Delete Group
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {tab === "status" && (
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/[0.08]">
          {/* Create status input */}
          <div className="border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(79,110,247,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] p-4">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4F6EF7]">Community Status</p>
              <h2 className="mt-1 text-lg font-semibold text-white">Share what inspires your day</h2>
              <p className="mt-1 text-xs leading-5 text-[#8A8A9E]">
                Status is for lifestyle moments, behind-the-scenes progress, places, routines and ideas that help everyone get inspired.
              </p>
            </div>
            <div className="flex gap-3 rounded-lg border border-white/[0.08] bg-[#0A0A0F]/70 p-3 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
              <UserAvatar user={composerUser} size="md" />
              <div className="flex-1">
                <textarea
                  value={postInput}
                  onChange={(e) => setPostInput(e.target.value)}
                  placeholder="Share a moment, routine, place, lesson or inspiration..."
                  rows={2}
                  className="w-full resize-none bg-transparent text-sm text-white placeholder:text-[#4A4A5A] outline-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleCreatePost() } }}
                />
                {postMediaUrl && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-white/[0.04] p-2">
                    <span className="text-xs text-[#6B6B80] truncate flex-1">{postMediaType === "video" ? "Video attached" : "Photo attached"}</span>
                    <button onClick={() => { setPostMediaUrl(null); setPostMediaType(null) }} className="touch-target text-[#4A4A5A] hover:text-white">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <label className="touch-target flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[#4A4A5A] hover:text-[#4F6EF7] hover:bg-white/[0.06] transition-all">
                    <Camera size={15} />
                    <input type="file" accept="image/*,video/*" className="hidden" aria-label="Attach photo or video to status" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      const result = await uploadChatMedia(file, uid!)
                      if (result) {
                        setPostMediaUrl(result.url)
                        setPostMediaType(result.mimeType.startsWith("video") ? "video" : "image")
                      }
                      e.target.value = ""
                    }} />
                  </label>
                  <button
                    onClick={handleCreatePost}
                    disabled={(!postInput.trim() && !postMediaUrl) || posting}
                    className="touch-target inline-flex items-center gap-1.5 rounded-xl bg-[#4F6EF7] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-[#6B85FF] transition-all"
                  >
                    {posting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    Share Status
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Status feed - single column */}
          {postsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
            </div>
          ) : postError ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <p className="text-sm text-red-400">{postError}</p>
              <button onClick={() => loadPosts("all")} className="touch-target mt-3 text-xs text-[#4F6EF7] hover:underline">Retry</button>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <Hash size={32} className="text-[#4A4A5A] mb-3" />
              <p className="text-sm text-[#6B6B80]">No status updates yet</p>
              <p className="text-xs text-[#4A4A5A] mt-1">Share a photo, video or thought to inspire the community</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {posts.map((post) => (
                <div key={post.id} className="p-3 hover:bg-white/[0.01] transition-colors">
                  <div className="flex gap-3">
                    <button onClick={() => openProfile(post.userId)} className="shrink-0 touch-target">
                      <UserAvatar user={post.user} size="md" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openProfile(post.userId)} className="touch-target text-sm font-semibold text-white hover:text-[#4F6EF7] transition-colors">
                          {getUserDisplayName(post.user)}
                        </button>
                        {post.user?.username && (
                          <span className="text-[11px] text-[#4A4A5A]">@{post.user.username}</span>
                        )}
                        <span className="text-[10px] text-[#4A4A5A] ml-auto">
                          {new Date(post.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                      {post.content && (
                        <p className="mt-1 text-sm leading-6 text-[#C4C4D4] whitespace-pre-line">{post.content}</p>
                      )}
                      {post.mediaUrl && (
                        <div className="mt-3 overflow-hidden rounded-lg border border-white/[0.08] bg-black/20 shadow-[0_16px_42px_rgba(0,0,0,0.28)]">
                          {post.mediaType === "video" ? (
                            <video src={post.mediaUrl} controls preload="metadata" playsInline className="max-h-72 w-full object-contain sm:max-h-80" />
                          ) : (
                            <img src={post.mediaUrl} alt="Status media" loading="lazy" decoding="async" className="max-h-72 w-full object-cover sm:max-h-80" />
                          )}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-4">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`touch-target flex items-center gap-1.5 text-xs transition-all ${
                            post.liked ? "text-[#4F6EF7]" : "text-[#4A4A5A] hover:text-[#F0F0F5]"
                          }`}
                        >
                          <Heart size={16} className={post.liked ? "fill-[#4F6EF7]" : ""} />
                          {post.likesCount > 0 && post.likesCount}
                        </button>
                        <button
                          onClick={() => toggleComments(post.id)}
                          className="touch-target flex items-center gap-1.5 text-xs text-[#4A4A5A] hover:text-[#F0F0F5] transition-all"
                        >
                          <MessageSquare size={16} />
                          {post.commentsCount > 0 && post.commentsCount}
                        </button>
                        <button
                          onClick={() => openProfile(post.userId)}
                          className="touch-target flex items-center gap-1.5 text-xs text-[#4A4A5A] hover:text-[#F0F0F5] transition-all"
                        >
                          <ExternalLink size={16} />
                        </button>
                        {uid && post.userId !== uid && (
                          <button
                            onClick={async () => {
                              const result = await toggleFollow(uid, post.userId)
                              if (result) {
                                setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p } : p))
                              }
                            }}
                            className="touch-target ml-auto text-[10px] text-[#4F6EF7] hover:underline"
                          >
                            Follow
                          </button>
                        )}
                      </div>

                      {/* Comments */}
                      <AnimatePresence>
                        {expandedComments.has(post.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 space-y-2 overflow-hidden"
                          >
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2 pl-2">
                                <UserAvatar user={comment.user} size="sm" />
                                <div className="flex-1">
                                  <span className="text-[11px] font-semibold text-white">{getUserDisplayName(comment.user)}</span>
                                  <span className="text-[11px] text-[#A0A0B5] ml-1">{comment.content}</span>
                                </div>
                              </div>
                            ))}
                            <div className="flex gap-2 pl-2">
                              <input
                                value={commentInput[post.id] || ""}
                                onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => { if (e.key === "Enter") handleComment(post.id) }}
                                placeholder="Reply to this status..."
                                className="touch-target flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-white placeholder:text-[#4A4A5A] outline-none focus:border-[#4F6EF7]/30 transition-all"
                              />
                              <button
                                onClick={() => handleComment(post.id)}
                                disabled={!commentInput[post.id]?.trim() || commenting[post.id]}
                                className="touch-target flex h-10 w-10 items-center justify-center rounded-lg bg-[#4F6EF7]/10 text-[#4F6EF7] disabled:opacity-30"
                              >
                                {commenting[post.id] ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ========== EMPTY STATE (no conversation selected) ==========
  const emptyState = (
    <div className="flex h-full flex-col items-center justify-center text-center px-4">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03] mb-5">
        <MessageCircle size={32} className="text-[#4A4A5A]" />
      </div>
      <p className="text-lg font-semibold text-white mb-1">Your Messages</p>
      <p className="text-sm text-[#6B6B80] max-w-xs">
        Select a conversation to start chatting or go to Status to see community updates
      </p>
    </div>
  )

  // ========== STATUS PANEL ==========
  const statusPanel = tab === "status" ? (
    <div className="mobile-panel flex h-full flex-col overflow-hidden bg-[#08080D]">
      <div className="shrink-0 border-b border-white/[0.06] bg-[radial-gradient(circle_at_top_left,rgba(79,110,247,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] px-6 py-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#4F6EF7]">Community showcase</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Stories, progress and inspiration</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#8A8A9E]">
              A visual feed for clients and community members to share routines, wins, behind-the-scenes work and quick ideas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })}
            className="touch-target inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-xs font-semibold text-[#D8D8E8] transition-all hover:bg-white/[0.06] hover:text-white"
          >
            <Plus size={14} />
            Share from sidebar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin scrollbar-thumb-white/[0.08]">
        {postsLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
          </div>
        ) : postError ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <AlertCircle size={28} className="mb-3 text-red-400" />
            <p className="text-sm text-[#B8B8C8]">{postError}</p>
            <button onClick={() => loadPosts("all")} className="touch-target mt-3 text-xs font-semibold text-[#4F6EF7] hover:underline">Retry</button>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/[0.06] bg-white/[0.03]">
              <Hash size={30} className="text-[#4F6EF7]" />
            </div>
            <p className="text-lg font-semibold text-white">No stories yet</p>
            <p className="mt-1 max-w-sm text-sm text-[#6B6B80]">Create the first community status from the mobile status screen.</p>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-5xl gap-4 xl:grid-cols-2">
            {posts.map((post) => (
              <article key={post.id} className="overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.025] shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
                {post.mediaUrl && (
                  <div className="border-b border-white/[0.06] bg-black/30">
                    {post.mediaType === "video" ? (
                      <video src={post.mediaUrl} controls preload="metadata" playsInline className="aspect-video w-full object-cover" />
                    ) : (
                      <img src={post.mediaUrl} alt="Status media" loading="lazy" decoding="async" className="aspect-video w-full object-cover" />
                    )}
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => openProfile(post.userId)} className="shrink-0 touch-target">
                      <UserAvatar user={post.user} size="md" />
                    </button>
                    <div className="min-w-0 flex-1">
                      <button type="button" onClick={() => openProfile(post.userId)} className="touch-target truncate text-sm font-semibold text-white hover:text-[#4F6EF7]">
                        {getUserDisplayName(post.user)}
                      </button>
                      <p className="text-[11px] text-[#5F5F73]">
                        {new Date(post.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {post.content && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#D8D8E8]">{post.content}</p>
                  )}

                  <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-3">
                    <button
                      type="button"
                      onClick={() => handleLike(post.id)}
                      className={`touch-target inline-flex items-center gap-1.5 text-xs font-semibold transition-all ${post.liked ? "text-[#4F6EF7]" : "text-[#6B6B80] hover:text-white"}`}
                    >
                      <Heart size={16} className={post.liked ? "fill-[#4F6EF7]" : ""} />
                      {post.likesCount || "Like"}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleComments(post.id)}
                      className="touch-target inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6B80] transition-all hover:text-white"
                    >
                      <MessageSquare size={16} />
                      {post.commentsCount || "Comment"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openProfile(post.userId)}
                      className="touch-target ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6B80] transition-all hover:text-white"
                    >
                      <ExternalLink size={14} />
                      Profile
                    </button>
                  </div>

                  <AnimatePresence>
                    {expandedComments.has(post.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-3 space-y-2 overflow-hidden"
                      >
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-2 rounded-lg bg-white/[0.025] p-2">
                            <UserAvatar user={comment.user} size="sm" />
                            <p className="min-w-0 text-xs leading-5 text-[#A0A0B5]">
                              <span className="font-semibold text-white">{getUserDisplayName(comment.user)}</span>{" "}
                              {comment.content}
                            </p>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            value={commentInput[post.id] || ""}
                            onChange={(e) => setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleComment(post.id) }}
                            placeholder="Write a quick reply..."
                            className="touch-target min-w-0 flex-1 rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-xs text-white outline-none placeholder:text-[#4A4A5A] focus:border-[#4F6EF7]/30"
                          />
                          <button
                            type="button"
                            onClick={() => handleComment(post.id)}
                            disabled={!commentInput[post.id]?.trim() || commenting[post.id]}
                            className="touch-target flex h-10 w-10 items-center justify-center rounded-lg bg-[#4F6EF7]/10 text-[#4F6EF7] disabled:opacity-30"
                          >
                            {commenting[post.id] ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </article>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  ) : null

  // ========== CHAT PANEL (conversation) ==========
  const chatPanel = activeConv ? (
    <div className="mobile-panel flex h-full min-h-0 flex-col">
      {/* Header - compact */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0A0A0F]/80 px-2 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <button onClick={handleBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-all hover:bg-white/[0.06] hover:text-white" aria-label="Back to conversations">
          <ChevronLeft size={20} />
        </button>
        <div
          onClick={() => !isActiveConvBot && navigate(`/profile/${activeConv.otherUser.username || activeConv.otherUser.id}`)}
          className={`flex items-center gap-3 flex-1 min-w-0 transition ${!isActiveConvBot ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
          title={isActiveConvBot ? "CAF\u00c9 Bot" : "View profile"}
        >
          <div className="relative shrink-0">
            <UserAvatar user={getBotFixedUser(activeConv) ?? activeConv.otherUser} size="md" className="ring-1 ring-white/[0.06]" />
            {isActiveConvBot
              ? <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#0A0A0F] bg-[#6D28D9] text-[8px]">🤖</span>
              : <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0A0A0F] bg-[#22C55E]" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white truncate">{getUserDisplayName(activeConv.otherUser)}</p>
              {!isActiveConvBot && <><span className="h-2 w-2 rounded-full bg-[#22C55E]" /><span className="text-[10px] text-[#22C55E]">Online</span></>}
            </div>
            {activeConv.otherUser.username && (
              <p className="text-[11px] text-[#4A4A5A]">@{activeConv.otherUser.username}</p>
            )}
          </div>
        </div>
        {(canClearBotChat || !isActiveConvBot) && (
          <button
            type="button"
            onClick={handleClearChat}
            disabled={clearingChat || messages.length === 0}
            className="touch-target inline-flex h-10 items-center gap-2 rounded-xl border border-red-400/20 bg-red-400/10 px-3 text-xs font-semibold text-red-200 transition-all hover:bg-red-400/15 disabled:cursor-not-allowed disabled:opacity-45"
            title="Clear chat"
          >
            {clearingChat ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            <span className="hidden sm:inline">Clear chat</span>
          </button>
        )}
        {!isActiveConvBot && (
          <button
            onClick={() => openProfile(activeConv.otherUser.id)}
            className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-white/40 transition-all hover:bg-white/[0.06] hover:text-white"
            aria-label="Open profile"
          >
            <ExternalLink size={16} />
          </button>
        )}
      </div>

      {/* Messages area - full width */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/[0.08] sm:px-4 sm:py-4">
        {msgLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
          </div>
        ) : msgError ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-red-400">{msgError}</p>
            <button onClick={loadMessages} className="touch-target mt-3 text-xs text-[#4F6EF7] hover:underline">Retry</button>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-4">
              <MessageCircle size={24} className="text-[#4F6EF7]" />
            </div>
            <p className="text-sm text-[#6B6B80]">No messages yet</p>
            <p className="text-xs text-[#4A4A5A] mt-1">Send your first message below</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.senderId === uid
            return renderMessage(msg, isOwn)
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-3 border-t border-white/[0.06] bg-[#1A1A24]/90 px-4 py-2 backdrop-blur-md shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[#4F6EF7]">
              Replying to {getMessageSenderName(replyTo)}
            </p>
            <p className="text-xs text-[#6B6B80] truncate">
              {(replyTo.content || replyTo.caption || "").slice(0, 80)}
            </p>
          </div>
          <button
            onClick={() => { setReplyTo(null) }}
            className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <MessageComposer
        conversationId={activeConv.id}
        currentUserId={uid!}
        otherUserId={activeConv.participantA === uid ? activeConv.participantB : activeConv.participantA}
        otherUserName={activeConv.otherUser.name}
        replyToMessageId={replyTo?.id || null}
        onMessageSent={(msg) => {
          setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
          setReplyTo(null)
        }}
      />
    </div>
  ) : null

  // ========== GROUP CHAT PANEL ==========
  const groupChatPanel = activeGroup ? (
    <div className="mobile-panel flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-white/[0.06] bg-[#0A0A0F]/80 px-2 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
        <button onClick={handleBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-white/50 transition-all hover:bg-white/[0.06] hover:text-white" aria-label="Back to groups">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#4F6EF7]/30 to-[#8B5CF6]/20 text-sm font-bold text-[#4F6EF7] ring-1 ring-white/[0.06]">
              {activeGroup.avatarUrl ? (
                <img src={activeGroup.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                activeGroup.name[0]?.toUpperCase() || "G"
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{activeGroup.name}</p>
            <p className="text-[11px] text-[#4A4A5A]">{activeGroup.members.length} members</p>
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setGroupMenuOpen((open) => !open)}
            className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-white/45 transition-all hover:bg-white/[0.06] hover:text-white"
            aria-label="Group options"
            aria-expanded={groupMenuOpen}
          >
            <MoreVertical size={17} />
          </button>
          <AnimatePresence>
            {groupMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="absolute right-0 top-11 z-40 min-w-48 rounded-xl border border-white/[0.08] bg-[#12121A] py-1 shadow-xl"
                role="menu"
              >
                <button
                  type="button"
                  onClick={() => openGroupSettings()}
                  className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-[#D0D0E0] transition-all hover:bg-white/[0.06]"
                  role="menuitem"
                >
                  <Settings size={14} /> Manage Group
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveMemberFromActiveGroup(uid!)}
                  className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-[#D0D0E0] transition-all hover:bg-white/[0.06]"
                  role="menuitem"
                >
                  <LogOut size={14} /> Leave Group
                </button>
                {isGroupAdmin(activeGroup) && (
                  <button
                    type="button"
                    onClick={handleDeleteActiveGroup}
                    className="touch-target flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-red-400 transition-all hover:bg-white/[0.06]"
                    role="menuitem"
                  >
                    <Trash2 size={14} /> Delete Group
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages area */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/[0.08] sm:px-4 sm:py-4">
        {groupMsgLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
          </div>
        ) : groupMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] mb-4">
              <Users size={24} className="text-[#4F6EF7]" />
            </div>
            <p className="text-sm text-[#6B6B80]">No messages yet</p>
            <p className="text-xs text-[#4A4A5A] mt-1">Send the first message in this group</p>
          </div>
        ) : (
          groupMessages.map((msg) => {
            const isOwn = msg.senderId === uid
            const senderProfile = profilesCache[msg.senderId]
            const senderName = senderProfile?.name || msg.senderId.slice(0, 8)
            return renderMessage(msg, isOwn, true, senderName)
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {replyTo && (
        <div className="flex items-center gap-3 border-t border-white/[0.06] bg-[#1A1A24]/90 px-4 py-2 backdrop-blur-md shrink-0">
          <button
            type="button"
            onClick={() => scrollToMessage(replyTo.id)}
            className="min-w-0 flex-1 text-left"
            aria-label="Scroll to quoted message"
          >
            <p className="text-[11px] font-semibold text-[#4F6EF7]">
              Replying to {getMessageSenderName(replyTo)}
            </p>
            <p className="text-xs text-[#6B6B80] truncate">
              {getMessageSnippet(replyTo).slice(0, 80)}
            </p>
          </button>
          <button
            onClick={() => { setReplyTo(null) }}
            className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-[#4A4A5A] hover:text-white hover:bg-white/[0.06] transition-all"
            aria-label="Cancel reply"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <MessageComposer
        groupId={activeGroup.id}
        currentUserId={uid!}
        otherUserName={activeGroup.name}
        replyToMessageId={replyTo?.id || null}
        onMessageSent={(msg) => {
          setGroupMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
          setReplyTo(null)
          setGroups((prev) => prev.map((g) => g.id === activeGroup.id ? { ...g, unreadCount: 0, lastMessage: {
            id: msg.id,
            content: msg.content,
            messageType: msg.messageType,
            mediaUrl: msg.mediaUrl,
            caption: msg.caption,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          } } : g))
        }}
      />
    </div>
  ) : null

  // ========== MAIN RENDER ==========
  return (
    <div className="mobile-page bg-[#050508]">
      <FloatingOrbs />
      <Navbar />
      <div
        className="flex overflow-hidden border-t border-white/[0.06]"
        style={{ height: "100dvh", paddingTop: "64px" }}
      >
        {/* Mobile: show list or chat with page transition */}
        <div className="flex min-w-0 w-full md:hidden">
          <AnimatePresence mode="popLayout">
            {mobileView === "list" ? (
              <motion.div
                key="list"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="mobile-panel border-r border-white/[0.06] bg-[#0A0A0F]"
              >
                {sidebar}
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 20, opacity: 0 }}
                className="mobile-panel bg-[#0A0A0F]"
              >
                {chatPanel || groupChatPanel || statusPanel || emptyState}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop: two columns */}
        <div className="hidden min-w-0 w-full md:flex">
          <div className="w-[380px] border-r border-white/[0.06] bg-[#0A0A0F] flex flex-col shrink-0">
            {sidebar}
          </div>
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#0A0A0F]">
            {chatPanel || groupChatPanel || statusPanel || emptyState}
          </div>
        </div>
      </div>

      {/* Forward Modal - bottom sheet on mobile */}
      <AnimatePresence>
        {forwardMsg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => { setForwardMsg(null); setForwardSelectedId(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="safe-bottom max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-[#0A0A0F] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-white">Forward Message</h3>
                <button
                  onClick={() => { setForwardMsg(null); setForwardSelectedId(null) }}
                  className="touch-target flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:text-white"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1 mb-4 scrollbar-thin scrollbar-thumb-white/[0.08]">
                {forwardTargets.length === 0 ? (
                  <p className="text-sm text-[#6B6B80] text-center py-8">No targets available</p>
                ) : (
                  forwardTargets.map((target) => (
                    <button
                      key={target.id}
                      onClick={() => setForwardSelectedId(target.id)}
                      className={`touch-target flex w-full items-center gap-3 rounded-xl px-3 py-3 transition-all text-left ${
                        forwardSelectedId === target.id
                          ? "bg-[#4F6EF7]/15 border border-[#4F6EF7]/30"
                          : "hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold ${
                        target.type === "group"
                          ? "bg-gradient-to-br from-[#4F6EF7]/30 to-[#8B5CF6]/20 text-[#4F6EF7]"
                          : "bg-white/[0.06] text-white"
                      }`}>
                        {target.type === "group" ? <Users size={16} /> : target.name[0]?.toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{target.name}</p>
                        <p className="text-[10px] text-[#4A4A5A]">{target.type === "group" ? "Group" : "Conversation"}</p>
                      </div>
                      {forwardSelectedId === target.id && (
                        <Check size={18} className="text-[#4F6EF7] shrink-0" />
                      )}
                    </button>
                  ))
                )}
              </div>

              <button
                onClick={handleForwardSubmit}
                disabled={!forwardSelectedId || forwarding}
                className="touch-target w-full rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] py-3 text-sm font-semibold text-white disabled:opacity-40 hover:shadow-[0_0_16px_rgba(37,99,235,0.3)] transition-all"
              >
                {forwarding ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Forward"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Creation Modal - bottom sheet on mobile */}
      <AnimatePresence>
        {showCreateGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setShowCreateGroup(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="safe-bottom max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-[#09090D] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-white/[0.06] bg-white/[0.025] px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4F6EF7]">New group</p>
                    <h3 className="mt-1 text-lg font-semibold text-white">Create a private group</h3>
                    <p className="mt-1 text-xs text-[#8A8A9E]">Add members now so they can send messages, stickers, media, audio and files.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateGroup(false)}
                    className="touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 transition-all hover:bg-white/[0.1] hover:text-white"
                    title="Close"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-5 overflow-y-auto p-4 sm:p-5 md:grid md:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4F6EF7]/30 to-[#8B5CF6]/20 text-lg font-bold text-[#7E95FF] ring-1 ring-white/[0.08]">
                      {groupAvatar ? (
                        <img src={URL.createObjectURL(groupAvatar)} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Users size={22} />
                      )}
                    </div>
                    <label className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-[#D8D8E8] transition-all hover:bg-white/[0.05]">
                      <Camera size={14} />
                      Group Avatar
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif"
                        className="hidden"
                        onChange={(event) => setGroupAvatar(event.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A9E]">Group name</label>
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Product team, VIP clients..."
                      className="touch-target w-full rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition-all placeholder:text-[#4A4A5A] focus:border-[#4F6EF7]/45 focus:bg-white/[0.05]"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A9E]">Description <span className="font-medium normal-case tracking-normal text-[#5B5B6E]">(optional)</span></label>
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      placeholder="What is this group for?"
                      rows={5}
                      className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition-all placeholder:text-[#4A4A5A] focus:border-[#4F6EF7]/45 focus:bg-white/[0.05]"
                    />
                  </div>

                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#D8D8E8]">
                      <Users size={15} className="text-[#4F6EF7]" />
                      {selectedMembers.length + 1} member{selectedMembers.length === 0 ? "" : "s"} including you
                    </div>
                    <p className="mt-1 text-[11px] leading-5 text-[#6B6B80]">Members added here receive group chat access immediately after creation.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A9E]">Add members</label>
                    <div className="relative">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5F73]" />
                      <input
                        value={groupSearch}
                        onChange={(e) => handleGroupSearch(e.target.value)}
                        onFocus={() => { setGroupMembersOpen(true); loadGroupCandidates(groupSearch) }}
                        placeholder="Search by name, username or email"
                        className="touch-target w-full rounded-lg border border-white/[0.08] bg-white/[0.035] py-3 pl-9 pr-3 text-sm text-white outline-none transition-all placeholder:text-[#4A4A5A] focus:border-[#4F6EF7]/45 focus:bg-white/[0.05]"
                      />
                      {groupMembersOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#111118] shadow-[0_18px_55px_rgba(0,0,0,0.45)]">
                          {groupMembersLoading ? (
                            <div className="flex items-center justify-center py-8 text-[#6B6B80]">
                              <Loader2 size={18} className="animate-spin" />
                            </div>
                          ) : groupSearchResults.length === 0 ? (
                            <div className="px-4 py-6 text-center text-xs text-[#6B6B80]">No users found</div>
                          ) : (
                            groupSearchResults.map((user) => {
                              const selected = selectedMembers.includes(user.id)
                              return (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => handleAddMember(user)}
                                  disabled={selected}
                                  className="touch-target flex w-full items-center gap-3 px-3 py-3 text-left transition-all hover:bg-white/[0.055] disabled:cursor-default disabled:opacity-45"
                                >
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#4F6EF7]/14 text-xs font-bold text-[#7E95FF] ring-1 ring-white/[0.06]">
                                    {user.avatar_url ? (
                                      <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                                    ) : (
                                      getCandidateName(user)[0]?.toUpperCase() || "U"
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-white">{getCandidateName(user)}</p>
                                    <p className="truncate text-[11px] text-[#6B6B80]">{user.username ? `@${user.username}` : user.email || "Profile user"}</p>
                                  </div>
                                  {selected && <Check size={16} className="text-[#4F6EF7]" />}
                                </button>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="min-h-[148px] rounded-lg border border-white/[0.06] bg-white/[0.025] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold text-white">Selected members</p>
                      <span className="text-[11px] text-[#6B6B80]">{selectedMembers.length}</span>
                    </div>
                    {selectedMembers.length === 0 ? (
                      <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-white/[0.08] text-center text-xs text-[#5F5F73]">
                        Choose users from the dropdown list
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {selectedMembers.map((memberId) => {
                          const member = selectedMemberProfiles[memberId]
                          return (
                            <div key={memberId} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#4F6EF7]/14 text-[10px] font-bold text-[#7E95FF]">
                                {member?.avatar_url ? <img src={member.avatar_url} alt="" className="h-full w-full object-cover" /> : (member ? getCandidateName(member)[0]?.toUpperCase() : "U")}
                              </div>
                              <span className="min-w-0 flex-1 truncate text-xs font-medium text-[#E6E6F2]">{member ? getCandidateName(member) : memberId.slice(0, 8)}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(memberId)}
                                className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B80] transition-all hover:bg-white/[0.08] hover:text-white"
                                title="Remove member"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-white/[0.02] px-4 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-5">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="touch-target w-full rounded-lg border border-white/[0.08] px-4 py-3 text-sm font-semibold text-[#B8B8C8] transition-all hover:bg-white/[0.05] hover:text-white sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateGroup}
                  disabled={!groupName.trim() || creatingGroup}
                  className="touch-target w-full rounded-lg bg-gradient-to-br from-[#2563EB] to-[#6D28D9] px-4 py-3 text-sm font-semibold text-white transition-all hover:shadow-[0_0_18px_rgba(37,99,235,0.35)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {creatingGroup ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Create group"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Settings Modal - bottom sheet on mobile */}
      <AnimatePresence>
        {showGroupSettings && activeGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
            onClick={() => setShowGroupSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="safe-bottom max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-white/[0.08] bg-[#09090D] shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:rounded-lg"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Manage group"
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/[0.06] bg-white/[0.025] px-5 py-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#4F6EF7]">Group settings</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Manage Group</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupSettings(false)}
                  className="touch-target flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/50 transition-all hover:bg-white/[0.1] hover:text-white"
                  aria-label="Close group settings"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="flex flex-col gap-5 overflow-y-auto p-4 sm:p-5 md:grid md:grid-cols-[0.85fr_1.15fr]">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4F6EF7]/30 to-[#8B5CF6]/20 text-lg font-bold text-[#7E95FF] ring-1 ring-white/[0.08]">
                      {manageGroupAvatar ? (
                        <img src={URL.createObjectURL(manageGroupAvatar)} alt="" className="h-full w-full object-cover" />
                      ) : activeGroup.avatarUrl ? (
                        <img src={activeGroup.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        activeGroup.name[0]?.toUpperCase() || "G"
                      )}
                    </div>
                    <label className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-semibold text-[#D8D8E8] transition-all hover:bg-white/[0.05]">
                      <Camera size={14} />
                      Change Avatar
                      {isGroupAdmin(activeGroup) && (
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={(event) => setManageGroupAvatar(event.target.files?.[0] || null)}
                        />
                      )}
                    </label>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A9E]">Group Name</label>
                    <input
                      value={manageGroupName}
                      onChange={(e) => setManageGroupName(e.target.value)}
                      disabled={!isGroupAdmin(activeGroup)}
                      className="touch-target w-full rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition-all focus:border-[#4F6EF7]/45"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A9E]">Description</label>
                    <textarea
                      value={manageGroupDesc}
                      onChange={(e) => setManageGroupDesc(e.target.value)}
                      disabled={!isGroupAdmin(activeGroup)}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-white/[0.08] bg-white/[0.035] px-3.5 py-3 text-sm text-white outline-none transition-all focus:border-[#4F6EF7]/45"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {isGroupAdmin(activeGroup) && (
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8A8A9E]">Add Members</label>
                      <div className="relative">
                        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#5F5F73]" />
                        <input
                          value={manageMemberSearch}
                          onChange={(e) => searchManageMembers(e.target.value)}
                          onFocus={() => searchManageMembers(manageMemberSearch)}
                          placeholder="Search contacts"
                          className="touch-target w-full rounded-lg border border-white/[0.08] bg-white/[0.035] py-3 pl-9 pr-3 text-sm text-white outline-none transition-all placeholder:text-[#4A4A5A] focus:border-[#4F6EF7]/45"
                        />
                      </div>
                      {(manageMemberResults.length > 0 || groupMembersLoading) && (
                        <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-white/[0.08] bg-[#111118]">
                          {groupMembersLoading ? (
                            <div className="flex justify-center py-5 text-[#6B6B80]"><Loader2 size={16} className="animate-spin" /></div>
                          ) : manageMemberResults.map((user) => {
                            const selected = manageSelectedMembers.includes(user.id)
                            return (
                              <button
                                key={user.id}
                                type="button"
                                onClick={() => handleSelectManageMember(user)}
                                disabled={selected}
                                className="touch-target flex w-full items-center gap-3 px-3 py-2.5 text-left text-xs text-white transition-all hover:bg-white/[0.055] disabled:opacity-45"
                              >
                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4F6EF7]/14 text-[10px] font-bold text-[#7E95FF]">{getCandidateName(user)[0]?.toUpperCase() || "U"}</span>
                                <span className="min-w-0 flex-1 truncate">{getCandidateName(user)}</span>
                                {selected && <Check size={15} className="text-[#4F6EF7]" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {manageSelectedMembers.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-white">New members</p>
                      {manageSelectedMembers.map((memberId) => (
                        <div key={memberId} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2">
                          <span className="min-w-0 flex-1 truncate text-xs text-[#E6E6F2]">
                            {manageSelectedProfiles[memberId] ? getCandidateName(manageSelectedProfiles[memberId]) : memberId.slice(0, 8)}
                          </span>
                          <button type="button" onClick={() => handleRemoveManageSelected(memberId)} className="touch-target text-[#6B6B80] hover:text-white" aria-label="Remove selected member">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-xs font-semibold text-white">Members</p>
                    <div className="max-h-56 space-y-2 overflow-y-auto">
                      {activeGroup.members.map((member) => {
                        const canManageMembers = isGroupAdmin(activeGroup)
                        const canRemove = canManageMembers && member.userId !== uid
                        const canChangeRole = canManageMembers && member.userId !== uid
                        return (
                          <div key={member.userId} className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-2.5 py-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#4F6EF7]/14 text-[10px] font-bold text-[#7E95FF]">
                              {member.avatarUrl ? <img src={member.avatarUrl} alt="" className="h-full w-full object-cover" /> : member.name[0]?.toUpperCase() || "U"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-white">{member.name || "Member"}</p>
                              <p className="text-[10px] text-[#6B6B80]">{member.role === "admin" ? "Admin" : "Member"}</p>
                            </div>
                            {canChangeRole && (
                              <button
                                type="button"
                                onClick={() => handleUpdateActiveMemberRole(member.userId, member.role === "admin" ? "member" : "admin")}
                                className="touch-target rounded-lg border border-white/[0.08] px-2 py-1.5 text-[10px] font-semibold text-[#B8B8C8] transition-all hover:bg-white/[0.05] hover:text-white"
                              >
                                {member.role === "admin" ? "Make member" : "Make admin"}
                              </button>
                            )}
                            {canRemove && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMemberFromActiveGroup(member.userId)}
                                className="touch-target flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6B80] transition-all hover:bg-red-500/10 hover:text-red-300"
                                aria-label={`Remove ${member.name}`}
                              >
                                <UserMinus size={14} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-t border-white/[0.06] bg-white/[0.02] px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => handleRemoveMemberFromActiveGroup(uid!)}
                    className="touch-target w-full rounded-lg border border-white/[0.08] px-3 py-3 text-xs font-semibold text-[#B8B8C8] transition-all hover:bg-white/[0.05] hover:text-white sm:w-auto"
                  >
                    <LogOut size={14} className="inline mr-1" /> Leave Group
                  </button>
                  {isGroupAdmin(activeGroup) && (
                    <button
                      type="button"
                      onClick={handleDeleteActiveGroup}
                      className="touch-target w-full rounded-lg border border-red-500/20 px-3 py-3 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/10 sm:w-auto"
                    >
                      <Trash2 size={14} className="inline mr-1" /> Delete Group
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSaveGroupSettings}
                  disabled={!manageGroupName.trim() || savingGroup || !isGroupAdmin(activeGroup)}
                  className="touch-target w-full rounded-lg bg-gradient-to-br from-[#2563EB] to-[#6D28D9] px-4 py-3 text-sm font-semibold text-white transition-all hover:shadow-[0_0_18px_rgba(37,99,235,0.35)] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {savingGroup ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />}
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Drawer - bottom sheet on mobile */}
      <AnimatePresence>
        {drawerUserId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
            onClick={() => setDrawerUserId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="safe-bottom relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/[0.08] bg-[#0A0A0F] p-5 shadow-2xl sm:rounded-3xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {drawerLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
                </div>
              ) : drawerProfile ? (
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-[#4F6EF7]/20 to-[#8B5CF6]/10 text-2xl font-bold text-[#4F6EF7] ring-2 ring-white/[0.08]">
                    {drawerProfile.avatarUrl ? (
                      <img src={drawerProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      drawerProfile.name[0]?.toUpperCase()
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white">{drawerProfile.name}</h2>
                  {drawerProfile.username && (
                    <p className="text-sm text-[#4A4A5A]">@{drawerProfile.username}</p>
                  )}
                  {drawerProfile.bio && (
                    <p className="mt-2 text-sm text-[#6B6B80]">{drawerProfile.bio}</p>
                  )}
                  <div className="mt-4 flex justify-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{drawerProfile.postsCount}</p>
                      <p className="text-[10px] text-[#4A4A5A]">Status</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{drawerProfile.followers}</p>
                      <p className="text-[10px] text-[#4A4A5A]">Followers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{drawerProfile.following}</p>
                      <p className="text-[10px] text-[#4A4A5A]">Following</p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    {uid && drawerProfile.id !== uid && (
                      <>
                        <FollowButton
                          currentUserId={uid}
                          targetUserId={drawerProfile.id}
                          targetUserName={drawerProfile.name}
                          initialFollowing={drawerProfile.following_}
                          onStateChange={(nowFollowing) => {
                            setDrawerProfile((prev) => prev ? { ...prev, following_: nowFollowing, followers: nowFollowing ? prev.followers + 1 : Math.max(0, prev.followers - 1) } : prev)
                          }}
                          className="w-full sm:flex-1"
                        />
                        <button
                          onClick={async () => {
                            const convId = await createOrGetConversation(uid, drawerProfile.id)
                            if (convId) {
                              setDrawerUserId(null)
                              const convs = await fetchConversations(uid)
                              const found = convs.find((c) => c.id === convId)
                              if (found) {
                                setActiveConv(found)
                                setMobileView("chat")
                                setTab("conversations")
                              }
                            }
                          }}
                          className="touch-target w-full rounded-xl bg-gradient-to-br from-[#2563EB] to-[#6D28D9] py-3 text-sm font-semibold text-white sm:flex-1"
                        >
                          Message
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-[#6B6B80]">Profile not found</div>
              )}
              <button
                onClick={() => setDrawerUserId(null)}
                className="touch-target absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/50 hover:text-white"
              >
                <X size={16} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
