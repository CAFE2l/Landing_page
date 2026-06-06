import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Send,
  X,
  Camera,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Heart,
  MessageCircle,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import PageShell from "./PageShell";
import UserAvatar from "../components/ui/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchSocialPosts,
  createSocialPost,
  deleteSocialPost,
  toggleSocialLike,
  addPostComment,
} from "../lib/socialService";
import type { SocialPost } from "../data/feedbackStore";
import { uploadChatMedia } from "../lib/chatService";

interface StatusUser {
  id: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  posts: SocialPost[];
}

function groupByUser(posts: SocialPost[]): StatusUser[] {
  const map = new Map<string, SocialPost[]>();
  for (const post of posts) {
    const arr = map.get(post.userId) || [];
    arr.push(post);
    map.set(post.userId, arr);
  }
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const users: StatusUser[] = [];
  for (const [id, userPosts] of map) {
    const first = userPosts[0].user;
    if (!first) continue;
    const recent = userPosts.filter((p) => now - new Date(p.createdAt).getTime() < oneDay);
    if (recent.length === 0) continue;
    users.push({
      id,
      name: first.name,
      username: first.username,
      avatarUrl: first.avatarUrl,
      posts: recent.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    });
  }
  return users.sort((a, b) => new Date(b.posts[b.posts.length - 1].createdAt).getTime() - new Date(a.posts[a.posts.length - 1].createdAt).getTime());
}

export default function StatusPage() {
  const { user, isAdmin } = useAuth();
  const uid = user?.id;

  const [viewerUserIndex, setViewerUserIndex] = useState<number | null>(null);
  const [viewerPostIndex, setViewerPostIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const progressRef = useRef(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const [statusUsers, setStatusUsers] = useState<StatusUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [createText, setCreateText] = useState("");
  const [createMedia, setCreateMedia] = useState<{ url: string; type: "image" | "video" | "audio" } | null>(null);
  const [creating, setCreating] = useState(false);

  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);

  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const viewerUser = viewerUserIndex !== null ? statusUsers[viewerUserIndex] : null;
  const viewerPosts = viewerUser?.posts || [];

  const loadStatus = useCallback(async () => {
    setLoading(true);
    const posts = await fetchSocialPosts("all", uid);
    const groups = groupByUser(posts);
    setStatusUsers(groups);
    const liked = new Set<string>();
    for (const p of posts) {
      if (p.liked) liked.add(p.id);
    }
    setLikedPosts(liked);
    setLoading(false);
  }, [uid]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const startProgress = useCallback(() => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressRef.current = 0;
    setProgress(0);
    const post = viewerPosts[viewerPostIndex];
    if (!post) return;
    const duration = post.mediaType === "video" ? 8000 : 5000;
    const interval = 30;
    const step = (interval / duration) * 100;
    progressTimer.current = setInterval(() => {
      if (paused) return;
      progressRef.current += step;
      setProgress(progressRef.current);
      if (progressRef.current >= 100) {
        clearInterval(progressTimer.current!);
        goNext();
      }
    }, interval);
  }, [viewerPosts, viewerPostIndex, paused]);

  useEffect(() => {
    if (viewerUserIndex === null) {
      if (progressTimer.current) clearInterval(progressTimer.current);
      setPaused(false);
      return;
    }
    startProgress();
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [viewerUserIndex, viewerPostIndex, startProgress]);

  const goNext = useCallback(() => {
    if (viewerUserIndex === null) return;
    if (viewerPostIndex < viewerPosts.length - 1) {
      setViewerPostIndex((i) => i + 1);
    } else if (viewerUserIndex < statusUsers.length - 1) {
      setViewerUserIndex((i) => (i ?? 0) + 1);
      setViewerPostIndex(0);
    } else {
      setViewerUserIndex(null);
    }
  }, [viewerUserIndex, viewerPostIndex, viewerPosts.length, statusUsers.length]);

  const goPrev = useCallback(() => {
    if (viewerUserIndex === null) return;
    if (viewerPostIndex > 0) {
      setViewerPostIndex((i) => i - 1);
    } else if (viewerUserIndex > 0) {
      setViewerUserIndex((i) => (i ?? 0) - 1);
      const prevUser = statusUsers[viewerUserIndex - 1];
      setViewerPostIndex(prevUser.posts.length - 1);
    }
  }, [viewerUserIndex, viewerPostIndex, statusUsers]);

  const openViewer = (userIndex: number) => {
    setViewerUserIndex(userIndex);
    setViewerPostIndex(0);
    setPaused(false);
  };

  const handleCreatePost = async () => {
    if (!createText.trim() && !createMedia) {
      toast.error("Add some text or media to your status");
      return;
    }
    if (!uid) {
      toast.error("Login required to post status");
      return;
    }
    setCreating(true);
    const post = await createSocialPost(
      uid,
      createText.trim(),
      createMedia?.url,
      createMedia?.type,
    );
    setCreating(false);
    if (post) {
      toast.success("Status published!");
      setShowCreate(false);
      setCreateText("");
      setCreateMedia(null);
      loadStatus();
    } else {
      toast.error("Failed to publish status");
    }
  };

  const handleLike = async (postId: string) => {
    if (!uid) {
      toast.error("Login required to interact with feedback.");
      return;
    }
    const wasLiked = likedPosts.has(postId);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    const ok = await toggleSocialLike(postId, uid);
    if (!ok) {
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
    }
  };

  const handleComment = async (postId: string) => {
    if (!uid) {
      toast.error("Login required to interact with feedback.");
      return;
    }
    if (!commentText.trim()) return;
    setSendingComment(true);
    const comment = await addPostComment(postId, uid, commentText.trim());
    setSendingComment(false);
    if (comment) {
      setCommentText("");
      setStatusUsers((prev) =>
        prev.map((u) => ({
          ...u,
          posts: u.posts.map((p) =>
            p.id === postId ? { ...p, comments: [...p.comments, comment], commentsCount: p.commentsCount + 1 } : p,
          ),
        })),
      );
    } else {
      toast.error("Failed to send reply");
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;
    const result = await uploadChatMedia(file, uid);
    if (result) {
      setCreateMedia({
        url: result.url,
        type: result.mimeType.startsWith("video") ? "video" : "image",
      });
    }
    e.target.value = "";
  };

  const myUser = uid
    ? statusUsers.find((u) => u.id === uid)
    : null;

  return (
    <PageShell
      eyebrow="Social"
      title="Status"
      subtitle="See what everyone is sharing — post your own status, reply, and engage."
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stories Row */}
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/[0.08]">
            {/* My Status */}
            <button
              onClick={() => setShowCreate(true)}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[#4F6EF7]/50 bg-[#4F6EF7]/10">
                  <Plus size={24} className="text-[#4F6EF7]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4F6EF7] text-[10px] text-white shadow-lg">
                  <Plus size={12} />
                </span>
              </div>
              <span className="text-[10px] text-[#6B6B80]">Add Status</span>
            </button>

            {/* My existing posts as a ring */}
            {myUser && (
              <button
                onClick={() => {
                  const idx = statusUsers.findIndex((u) => u.id === uid);
                  if (idx >= 0) openViewer(idx);
                }}
                className="flex shrink-0 flex-col items-center gap-1.5"
              >
                <div className="rounded-full bg-gradient-to-br from-[#4F6EF7] to-[#8B5CF6] p-[2px]">
                  <div className="rounded-full bg-[#0A0A0F] p-[2px]">
                    <UserAvatar
                      user={{ name: myUser.name, avatarUrl: myUser.avatarUrl }}
                      size="lg"
                      className="h-14 w-14 rounded-full"
                    />
                  </div>
                </div>
                <span className="text-[10px] text-[#6B6B80] truncate max-w-[64px]">You</span>
              </button>
            )}

            {/* Other users */}
            {statusUsers
              .filter((u) => u.id !== uid)
              .map((user) => {
                const realIndex = statusUsers.findIndex((u) => u.id === user.id);
                return (
                  <button
                    key={user.id}
                    onClick={() => openViewer(realIndex)}
                    className="flex shrink-0 flex-col items-center gap-1.5"
                  >
                    <div className="rounded-full bg-gradient-to-br from-[#22C55E] to-[#0EA5E9] p-[2px]">
                      <div className="rounded-full bg-[#0A0A0F] p-[2px]">
                        <UserAvatar
                          user={{ name: user.name, avatarUrl: user.avatarUrl }}
                          size="lg"
                          className="h-14 w-14 rounded-full"
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-[#6B6B80] truncate max-w-[64px]">
                      {user.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
          </div>

          {/* Empty state */}
          {statusUsers.length === 0 && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
              <Users size={40} className="mx-auto mb-3 text-[#4A4A5A]" />
              <p className="text-sm text-[#6B6B80]">No status updates yet</p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-2 text-sm font-semibold text-white"
              >
                <Plus size={16} /> Be the first to share
              </button>
            </div>
          )}

          {/* Recent posts grid */}
          {statusUsers.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#F0F0F5]">
                <MessageCircle size={16} /> Recent status updates
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {statusUsers.slice(0, 9).map((su) =>
                  su.posts.slice(-1).map((post) => (
                    <button
                      key={post.id}
                      onClick={() => {
                        const idx = statusUsers.findIndex((u) => u.id === su.id);
                        openViewer(idx);
                      }}
                      className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 text-left transition-all hover:border-white/[0.12] hover:bg-white/[0.04]"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <UserAvatar
                          user={{ name: su.name, avatarUrl: su.avatarUrl }}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-[#F0F0F5]">{su.name}</p>
                          <p className="text-[10px] text-[#6B6B80]">
                            {new Date(post.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {post.mediaUrl && post.mediaType === "image" && (
                        <img
                          src={post.mediaUrl}
                          alt=""
                          className="mb-2 h-32 w-full rounded-xl object-cover"
                        />
                      )}
                      {post.mediaUrl && post.mediaType === "video" && (
                        <video
                          src={post.mediaUrl}
                          className="mb-2 h-32 w-full rounded-xl object-cover"
                          muted
                          playsInline
                        />
                      )}
                      <p className="line-clamp-2 text-xs text-[#A0A0B5]">{post.content}</p>
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-[#6B6B80]">
                        <span className="flex items-center gap-1">
                          <Heart size={10} className={likedPosts.has(post.id) ? "fill-red-400 text-red-400" : ""} />
                          {post.likesCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageCircle size={10} />
                          {post.commentsCount}
                        </span>
                      </div>
                    </button>
                  )),
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== Story Viewer Overlay ========== */}
      <AnimatePresence>
        {viewerUser !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl"
            onClick={() => setViewerUserIndex(null)}
          >
            <button
              onClick={() => setViewerUserIndex(null)}
              className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-colors hover:bg-white/20"
            >
              <X size={20} />
            </button>

            {/* Tap zones */}
            <div
              className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
            />
            <div
              className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
            />

            {/* Long press = pause */}
            <div
              className="relative z-0 flex h-full w-full items-center justify-center"
              onMouseDown={() => setPaused(true)}
              onMouseUp={() => setPaused(false)}
              onMouseLeave={() => setPaused(false)}
              onTouchStart={(e) => {
                touchStartX.current = e.touches[0].clientX;
                touchStartY.current = e.touches[0].clientY;
                setPaused(true);
              }}
              onTouchEnd={(e) => {
                setPaused(false);
                const dx = e.changedTouches[0].clientX - touchStartX.current;
                const dy = e.changedTouches[0].clientY - touchStartY.current;
                if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
                  if (dx < 0) goNext();
                  else goPrev();
                } else if (dy > 80) {
                  setViewerUserIndex(null);
                }
              }}
            >
              <div className="relative flex h-full w-full max-w-lg flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Progress bars */}
                <div className="absolute left-0 right-0 top-0 z-20 flex gap-1 p-2">
                  {viewerPosts.map((_, i) => (
                    <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-100 ease-linear"
                        style={{
                          width:
                            i < viewerPostIndex ? "100%" :
                            i === viewerPostIndex ? `${progress}%` :
                            "0%",
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Header */}
                <div className="absolute left-0 right-0 top-4 z-20 flex items-center gap-3 px-4 pt-4">
                  <UserAvatar
                    user={{ name: viewerUser.name, avatarUrl: viewerUser.avatarUrl }}
                    size="sm"
                    className="h-8 w-8 rounded-full border-2 border-white/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-white">{viewerUser.name}</p>
                    <p className="text-[10px] text-white/50">
                      {new Date(viewerPosts[viewerPostIndex]?.createdAt || "").toLocaleDateString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        const ok = await deleteSocialPost(viewerPosts[viewerPostIndex].id);
                        if (ok) {
                          toast.success("Status deleted");
                          setViewerUserIndex(null);
                          loadStatus();
                        }
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-black/30 text-white/60 backdrop-blur-md transition-colors hover:bg-red-500/30 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>

                {/* Content */}
                <div className="flex flex-1 items-center justify-center px-6 pb-24 pt-16">
                  {viewerPosts[viewerPostIndex]?.mediaUrl ? (
                    viewerPosts[viewerPostIndex].mediaType === "video" ? (
                      <video
                        key={viewerPosts[viewerPostIndex].id}
                        src={viewerPosts[viewerPostIndex].mediaUrl}
                        className="max-h-full max-w-full rounded-2xl object-contain"
                        autoPlay
                        playsInline
                        controls
                      />
                    ) : (
                      <img
                        key={viewerPosts[viewerPostIndex].id}
                        src={viewerPosts[viewerPostIndex].mediaUrl}
                        alt=""
                        className="max-h-full max-w-full rounded-2xl object-contain"
                      />
                    )
                  ) : (
                    <p className="max-w-md text-center text-lg leading-relaxed text-white">
                      {viewerPosts[viewerPostIndex]?.content}
                    </p>
                  )}
                </div>

                {/* Action bar */}
                <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/[0.06] bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleLike(viewerPosts[viewerPostIndex].id)}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-white transition-all hover:bg-white/10"
                    >
                      <Heart
                        size={18}
                        className={
                          likedPosts.has(viewerPosts[viewerPostIndex].id)
                            ? "fill-red-400 text-red-400"
                            : ""
                        }
                      />
                      <span>{viewerPosts[viewerPostIndex].likesCount}</span>
                    </button>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await handleComment(viewerPosts[viewerPostIndex].id);
                      }}
                      className="flex flex-1 items-center gap-2 rounded-2xl border border-white/[0.12] bg-white/[0.06] px-4 py-2"
                    >
                      <input
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Reply to this status..."
                        className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
                        maxLength={500}
                      />
                      <button
                        type="submit"
                        disabled={sendingComment || !commentText.trim()}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white disabled:opacity-30"
                      >
                        {sendingComment ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Send size={14} />
                        )}
                      </button>
                    </form>
                  </div>

                  {/* Recent comments */}
                  {viewerPosts[viewerPostIndex]?.commentsCount > 0 && (
                    <div className="mt-3 max-h-20 overflow-y-auto space-y-1.5">
                      {viewerPosts[viewerPostIndex].comments.slice(-3).map((c) => (
                        <p key={c.id} className="text-xs text-white/60">
                          <span className="font-semibold text-white/80">
                            {c.user?.name || "Someone"}
                          </span>
                          : {c.content}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Nav arrows */}
                {viewerUserIndex !== null && viewerUserIndex > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goPrev(); }}
                    className="absolute left-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/20 md:flex"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                {viewerUserIndex !== null && viewerUserIndex < statusUsers.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goNext(); }}
                    className="absolute right-2 top-1/2 z-20 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/20 md:flex"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== Create Status Modal ========== */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#0A0A0F] p-6 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Add Status</h2>
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.06] text-white/60 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <textarea
                value={createText}
                onChange={(e) => setCreateText(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-[#4A4A5A] transition-colors focus:border-[#4F6EF7]/50"
                maxLength={1000}
              />

              {createMedia && (
                <div className="mt-3 relative overflow-hidden rounded-xl border border-white/[0.08] bg-black/30">
                  {createMedia.type === "video" ? (
                    <video src={createMedia.url} className="max-h-48 w-full object-cover" controls />
                  ) : (
                    <img src={createMedia.url} alt="" className="max-h-48 w-full object-cover" />
                  )}
                  <button
                    onClick={() => setCreateMedia(null)}
                    className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-red-500"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between">
                <label className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-white/[0.08] text-[#6B6B80] transition-colors hover:border-[#4F6EF7]/30 hover:text-white">
                  <Camera size={18} />
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={handleMediaUpload}
                  />
                </label>

                <button
                  onClick={handleCreatePost}
                  disabled={creating || (!createText.trim() && !createMedia)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#4F6EF7] to-[#8B5CF6] px-6 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  {creating ? "Posting..." : "Share"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
