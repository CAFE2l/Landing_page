import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Edit3, MessageCircle, Users, Trash2, Loader2, Shield } from "lucide-react";
import toast from "react-hot-toast";
import PageShell from "./PageShell";
import FeedbackCard from "../components/feedback/FeedbackCard";
import FeedbackDetail from "../components/feedback/FeedbackDetail";
import FollowButton from "../components/ui/FollowButton";
import UserAvatar from "../components/ui/UserAvatar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchPublicProfile,
  fetchPublicProfileByUsername,
  getOrCreateConversation,
  toggleReaction,
  getUserSavedPostIds,
  saveFeedbackPost,
  removeSavedFeedbackPost,
  deleteFeedbackPost,
  type PublicProfileData,
} from "../data/feedbackServiceSupabase";
import type { FeedbackPost, ReactionType } from "../data/feedbackStore";
import { deleteClient } from "../lib/adminClientService";

function extractReactions(posts: FeedbackPost[]): Map<string, ReactionType> {
  const map = new Map<string, ReactionType>();
  for (const post of posts) {
    if (post.currentUserReaction) {
      map.set(post.id, post.currentUserReaction);
    }
  }
  return map;
}

export default function PublicProfilePage() {
  const { userId, username } = useParams();
  const resolvedUserId = userId || username;
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [userReactions, setUserReactions] = useState<Map<string, ReactionType>>(new Map());
  const [reactionLoading, setReactionLoading] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<FeedbackPost | null>(null);

  const isOwnProfile = !!user?.id && user.id === resolvedUserId;
  const uid = user?.id;
  const posts = profile?.posts || [];

  useEffect(() => {
    if (!resolvedUserId) return;
    queueMicrotask(() => setLoading(true));
    const fetchFn = username
      ? fetchPublicProfileByUsername(resolvedUserId, uid)
      : fetchPublicProfile(resolvedUserId, uid);
    fetchFn.then((data) => {
      setProfile(data);
      if (data) {
        setUserReactions(extractReactions(data.posts));
      }
    }).finally(() => setLoading(false));
  }, [resolvedUserId, username, uid]);

  useEffect(() => {
    if (!user?.id || !resolvedUserId || user.id === resolvedUserId) return;
    import("../lib/socialService").then(({ isFollowing }) =>
      isFollowing(user.id!, resolvedUserId!).then(setFollowing),
    );
  }, [user?.id, resolvedUserId]);

  useEffect(() => {
    if (!uid) {
      setSavedPosts(new Set());
      return;
    }
    getUserSavedPostIds(uid).then(setSavedPosts).catch(() => setSavedPosts(new Set()));
  }, [uid]);

  const applyReactionState = useCallback(
    (postId: string, previousReaction: ReactionType | undefined, nextReaction: ReactionType | null) => {
      const likeDelta =
        (nextReaction === "like" ? 1 : 0) - (previousReaction === "like" ? 1 : 0);
      const dislikeDelta =
        (nextReaction === "dislike" ? 1 : 0) - (previousReaction === "dislike" ? 1 : 0);

      const updatePost = (p: FeedbackPost): FeedbackPost => {
        if (p.id !== postId) return p;
        return {
          ...p,
          helpfulCount: Math.max(0, p.helpfulCount + likeDelta),
          downvoteCount: Math.max(0, (p.downvoteCount || 0) + dislikeDelta),
        };
      };

      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            totalLikesReceived: Math.max(0, prev.stats.totalLikesReceived + likeDelta),
          },
          posts: prev.posts.map(updatePost),
        };
      });
      setSelectedPost((prev) => (prev ? updatePost(prev) : prev));
    },
    [],
  );

  const handleReaction = async (postId: string, reactionType: ReactionType) => {
    if (!uid) {
      toast.error("Login required to interact with feedback.");
      return;
    }
    if (reactionLoading.has(postId)) return;

    const previousReaction = userReactions.get(postId);
    const optimisticReaction = previousReaction === reactionType ? null : reactionType;
    const previousPosts = posts;
    const previousSelectedPost = selectedPost;
    const previousReactions = userReactions;

    setReactionLoading((prev) => new Set(prev).add(postId));
    setUserReactions((prev) => {
      const next = new Map(prev);
      if (optimisticReaction) next.set(postId, optimisticReaction);
      else next.delete(postId);
      return next;
    });
    applyReactionState(postId, previousReaction, optimisticReaction);

    const result = await toggleReaction(postId, reactionType);
    setReactionLoading((prev) => {
      const next = new Set(prev);
      next.delete(postId);
      return next;
    });

    if (!result) {
      setUserReactions(previousReactions);
      setProfile((prev) =>
        prev ? { ...prev, posts: previousPosts } : prev,
      );
      setSelectedPost(previousSelectedPost);
      toast.error("Could not update reaction");
      return;
    }

    setUserReactions((prev) => {
      const next = new Map(prev);
      if (result.reactionType) next.set(postId, result.reactionType);
      else next.delete(postId);
      return next;
    });

    const oldPost = posts.find((p) => p.id === postId);
    const serverLikeDelta = result.helpfulCount - (oldPost?.helpfulCount ?? 0);

    const syncCounters = (p: FeedbackPost): FeedbackPost =>
      p.id === postId
        ? {
            ...p,
            helpfulCount: result.helpfulCount,
            downvoteCount: result.downvoteCount,
          }
        : p;
    setProfile((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          totalLikesReceived: Math.max(0, prev.stats.totalLikesReceived + serverLikeDelta),
        },
        posts: prev.posts.map(syncCounters),
      };
    });
    setSelectedPost((prev) => (prev ? syncCounters(prev) : prev));
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    const updatePost = (post: FeedbackPost): FeedbackPost =>
      post.id === postId
        ? { ...post, commentCount: Math.max(0, (post.commentCount || 0) + delta) }
        : post;

    setProfile((prev) =>
      prev ? { ...prev, posts: prev.posts.map(updatePost) } : prev,
    );
    setSelectedPost((prev) => (prev ? updatePost(prev) : prev));
  };

  const handleSave = async (postId: string) => {
    if (!uid) {
      toast.error("Login required to interact with feedback.");
      return;
    }

    const wasSaved = savedPosts.has(postId);
    setSavedPosts((prev) => {
      const next = new Set(prev);
      if (wasSaved) next.delete(postId);
      else next.add(postId);
      return next;
    });

    const success = wasSaved
      ? await removeSavedFeedbackPost(postId, uid)
      : await saveFeedbackPost(postId, uid);

    if (!success) {
      setSavedPosts((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.add(postId);
        else next.delete(postId);
        return next;
      });
      toast.error("Could not update saved post");
      return;
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!isAdmin) return;
    if (!confirm("Delete this feedback permanently?")) return;
    const previousPosts = posts;
    const previousSelectedPost = selectedPost;
    setProfile((prev) =>
      prev ? { ...prev, posts: prev.posts.filter((p) => p.id !== postId) } : prev,
    );
    if (selectedPost?.id === postId) setSelectedPost(null);
    const ok = await deleteFeedbackPost(postId);
    if (!ok) {
      setProfile((prev) =>
        prev ? { ...prev, posts: previousPosts } : prev,
      );
      setSelectedPost(previousSelectedPost);
      toast.error("Could not delete feedback");
      return;
    }
    toast.success("Feedback deleted");
  };

  const handleDeleteUser = async () => {
    if (!resolvedUserId || !profile) return
    setDeleting(true)
    const ok = await deleteClient(resolvedUserId)
    setDeleting(false)
    if (ok) {
      toast.success(`${profile.name} deleted`)
      setShowDeleteModal(false)
      navigate("/")
    } else {
      toast.error("Failed to delete user")
    }
  }

  const handleFollowStateChange = (nowFollowing: boolean) => {
    setFollowing(nowFollowing);
    setProfile((current) =>
      current
        ? {
            ...current,
            stats: {
              ...current.stats,
              followers: Math.max(
                0,
                current.stats.followers + (nowFollowing ? 1 : -1),
              ),
            },
          }
        : current,
    );
  };

  const handleMessage = async () => {
    if (!user?.id || !resolvedUserId) {
      toast.error("Login to send a message");
      return;
    }
    const conversationId = await getOrCreateConversation(user.id, resolvedUserId);
    if (conversationId) navigate(`/dashboard/messages/${conversationId}`);
  };

  return (
    <PageShell
      eyebrow="Public Profile"
      title={profile?.name || "Profile"}
      subtitle="Public feedback activity, followers, and direct contact."
    >
      {loading ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-[#8E8EA3]">
          Loading profile...
        </div>
      ) : !profile ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-[#8E8EA3]">
          Profile not found.
        </div>
      ) : (
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-6 shadow-[0_32px_64px_rgba(0,0,0,0.35)] backdrop-blur-xl"
          >
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <UserAvatar user={{ name: profile.name, username: profile.username, avatarUrl: profile.avatarUrl }} size="xl" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-white">{profile.name}</h2>
                    <span className="rounded-full border border-[#4F6EF7]/25 bg-[#4F6EF7]/10 px-2.5 py-1 text-xs text-[#9BA7FF]">
                      {profile.role}
                    </span>
                  </div>
                  {profile.username && <p className="text-sm text-[#8E8EA3]">@{profile.username}</p>}
                  {profile.bio && <p className="mt-2 max-w-xl text-sm text-[#A0A0B5]">{profile.bio}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {isOwnProfile ? (
                  <Link to="/dashboard/profile" className="inline-flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-2.5 text-sm font-semibold text-white">
                    <Edit3 size={16} /> Edit Profile
                  </Link>
                ) : (
                  <>
                    {user?.id && resolvedUserId && (
                      <FollowButton
                        currentUserId={user.id}
                        targetUserId={resolvedUserId}
                        targetUserName={profile?.name}
                        initialFollowing={following}
                        onStateChange={handleFollowStateChange}
                      />
                    )}
                    <button onClick={handleMessage} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#2563EB] to-[#8B5CF6] px-4 py-2.5 text-sm font-semibold text-white">
                      <MessageCircle size={16} /> Send Message
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              {[
                ["Posts", profile.stats.totalPosts],
                ["Likes", profile.stats.totalLikesReceived],
                ["Followers", profile.stats.followers],
                ["Following", profile.stats.following],
                ["Member", profile.memberSince ? new Date(profile.memberSince).toLocaleDateString("en-US") : "-"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/[0.06] bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-[#6B6B80]">{label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          </motion.section>

          {/* Admin Actions — only visible to admins */}
          {isAdmin && !isOwnProfile && (
            <motion.section
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-red-500/15 bg-red-500/[0.03] p-5 shadow-[0_0_30px_rgba(239,68,68,0.06)] backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-red-400" />
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Admin Actions</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleMessage}
                  className="flex items-center gap-2 rounded-xl border border-white/[0.1] px-3.5 py-2 text-xs font-medium text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <MessageCircle size={14} /> Send Message
                </button>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={14} /> Delete User
                </button>
              </div>
            </motion.section>
          )}

          <div className="flex items-center gap-2 text-sm font-semibold text-[#F0F0F5]">
            <Users size={16} /> Public feedback
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {profile.posts.map((post, index) => (
              <FeedbackCard
                key={post.id}
                post={post}
                index={index}
                onClick={() => uid ? setSelectedPost(post) : toast.error("Login required to interact with feedback.")}
                onReaction={(reactionType) => handleReaction(post.id, reactionType)}
                reactionLoading={reactionLoading.has(post.id)}
                onComment={() => uid ? setSelectedPost(post) : toast.error("Login required to interact with feedback.")}
                onSave={() => handleSave(post.id)}
                saved={savedPosts.has(post.id)}
                userReaction={userReactions.get(post.id) || null}
                isAdmin={isAdmin}
                onDelete={isAdmin ? () => handleDeletePost(post.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <FeedbackDetail
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onReaction={handleReaction}
        reactionLoading={selectedPost ? reactionLoading.has(selectedPost.id) : false}
        userReaction={selectedPost ? userReactions.get(selectedPost.id) || null : null}
        isAdmin={isAdmin}
        onCommentCountChange={handleCommentCountChange}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowDeleteModal(false); setDeleteConfirm("") }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-red-500/20 bg-[#0a0a0f] p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                  <Trash2 size={18} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Delete User</h2>
                  <p className="text-sm text-white/40">This action can be irreversible</p>
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 mb-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/40">Name</span>
                  <span className="text-white font-medium">{profile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Email</span>
                  <span className="text-white/70">{profile ? profile.posts[0]?.userName || resolvedUserId : resolvedUserId}</span>
                </div>
              </div>

              <p className="text-sm text-red-400/80 mb-3">
                Type <strong className="text-red-300">DELETE</strong> to confirm:
              </p>
              <input
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="Type DELETE"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-red-500/40 transition-colors mb-5"
              />

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirm("") }}
                  className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={deleteConfirm !== "DELETE" || deleting}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 hover:bg-red-500 transition-all"
                >
                  {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  {deleting ? "Deleting..." : "Delete User"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
