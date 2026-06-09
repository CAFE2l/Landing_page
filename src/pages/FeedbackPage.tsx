import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, PenLine, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
import { getUserDisplayName, getUserAvatar } from "../lib/utils";
import UserAvatar from "../components/ui/UserAvatar";
import { useUserProfile } from "../hooks/useUserProfile";
import PageShell from "./PageShell";
import FeedbackFeed from "../components/feedback/FeedbackFeed";
import FeedbackSidebar from "../components/feedback/FeedbackSidebar";
import FeedbackDetail from "../components/feedback/FeedbackDetail";
import FeedbackForm, {
  type FeedbackFormData,
} from "../components/feedback/FeedbackForm";
import type { FeedbackPost, ServiceCategory, ReactionType } from "../data/feedbackStore";
import {
  searchFeedbackPosts,
  createFeedbackPost,
  toggleReaction,
  deleteFeedbackPost,
  fetchUserReactions,
  getUserSavedPostIds,
  removeSavedFeedbackPost,
  saveFeedbackPost,
} from "../data/feedbackServiceSupabase";
import { useAuth } from "../contexts/AuthContext";
import { loadCurrentUser } from "../data/feedbackStore";
import toast from "react-hot-toast";

export default function FeedbackPage() {
  const { user: supabaseUser, isAdmin } = useAuth();
  const localUser = loadCurrentUser();
  const currentUser = supabaseUser || localUser;
  const userProfile = currentUser
    ? (currentUser as unknown as {
        uid?: string;
        id: string;
        name?: string;
        email?: string;
        photoUrl?: string;
      })
    : null;
  const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id;
  const { profile: loggedProfile } = useUserProfile(uid);

  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<
    "recent" | "rating" | "helpful" | "media" | "verified"
  >("recent");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [rating, setRating] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [userReactions, setUserReactions] = useState<Map<string, ReactionType>>(new Map());
  const [reactionLoading, setReactionLoading] = useState<Set<string>>(new Set());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<FeedbackPost | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const result = await searchFeedbackPosts(search, category, rating, sort);
    setPosts(result.posts);
    setLoading(false);
  }, [search, category, rating, sort]);

  useEffect(() => {
    queueMicrotask(() => loadPosts());
  }, [loadPosts]);

  useEffect(() => {
    if (uid && posts.length > 0) {
      fetchUserReactions(
        posts.map((p) => p.id),
        uid,
      ).then(setUserReactions);
    } else if (!uid) {
      queueMicrotask(() => setUserReactions(new Map()));
    }
  }, [posts, uid]);

  useEffect(() => {
    if (!uid) {
      queueMicrotask(() => setSavedPosts(new Set()));
      return;
    }

    getUserSavedPostIds(uid).then(setSavedPosts).catch(() => setSavedPosts(new Set()));
  }, [uid]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(searchInput), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchInput]);

  const applyReactionState = (
    postId: string,
    previousReaction: ReactionType | undefined,
    nextReaction: ReactionType | null,
  ) => {
    const updatePost = (p: FeedbackPost): FeedbackPost => {
      if (p.id !== postId) return p;
      const likeDelta =
        (nextReaction === "like" ? 1 : 0) - (previousReaction === "like" ? 1 : 0);
      const dislikeDelta =
        (nextReaction === "dislike" ? 1 : 0) - (previousReaction === "dislike" ? 1 : 0);
      return {
        ...p,
        helpfulCount: Math.max(0, p.helpfulCount + likeDelta),
        downvoteCount: Math.max(0, (p.downvoteCount || 0) + dislikeDelta),
      };
    };

    setPosts((prev) => prev.map(updatePost));
    setSelectedPost((prev) => (prev ? updatePost(prev) : prev));
  };

  const handleReaction = async (postId: string, reactionType: ReactionType) => {
    const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id;
    if (!uid) {
      toast.error("Login to react");
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
      setPosts(previousPosts);
      setSelectedPost(previousSelectedPost);
      setUserReactions(previousReactions);
      toast.error("Could not update reaction");
      return;
    }

    setUserReactions((prev) => {
      const next = new Map(prev);
      if (result.reactionType) next.set(postId, result.reactionType);
      else next.delete(postId);
      return next;
    });

    const syncCounters = (p: FeedbackPost): FeedbackPost =>
      p.id === postId
        ? {
            ...p,
            helpfulCount: result.helpfulCount,
            downvoteCount: result.downvoteCount,
          }
        : p;
    setPosts((prev) => prev.map(syncCounters));
    setSelectedPost((prev) => (prev ? syncCounters(prev) : prev));
  };

  const handleDeletePost = async (postId: string) => {
    if (!isAdmin) return;
    if (!confirm("Delete this feedback permanently?")) return;
    const previousPosts = posts;
    const previousSelectedPost = selectedPost;
    setPosts((prev) => prev.filter((post) => post.id !== postId));
    if (selectedPost?.id === postId) setSelectedPost(null);
    const ok = await deleteFeedbackPost(postId);
    if (!ok) {
      setPosts(previousPosts);
      setSelectedPost(previousSelectedPost);
      toast.error("Could not delete feedback");
      return;
    }
    toast.success("Feedback deleted");
  };

  const handleCommentCountChange = (postId: string, delta: number) => {
    const updatePost = (post: FeedbackPost): FeedbackPost =>
      post.id === postId
        ? { ...post, commentCount: Math.max(0, (post.commentCount || 0) + delta) }
        : post;

    setPosts((prev) => prev.map(updatePost));
    setSelectedPost((prev) => (prev ? updatePost(prev) : prev));
  };

  const handleSave = async (postId: string) => {
    const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id;
    if (!uid) {
      toast.error("Login to save posts");
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

    toast.success(wasSaved ? "Post removed from saved" : "Post saved!");
  };

  const handleSubmitFeedback = async (data: FeedbackFormData) => {
    const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id;
    if (!uid) {
      toast.error("You must be logged in");
      return;
    }
    setSubmitting(true);

    const displayName = getUserDisplayName(loggedProfile || userProfile);
    const displayAvatar = getUserAvatar(loggedProfile || userProfile) || "";

    try {
      const id = await createFeedbackPost({
        userId: uid,
        userName: displayName,
        userAvatar: displayAvatar,
        serviceCategory: data.serviceCategory,
        projectTitle: data.projectTitle,
        projectUrl: data.projectUrl,
        rating: data.rating,
        title: data.title,
        content: data.content,
        media: data.media,
        serviceDate: data.serviceDate,
        status: "pending",
        isVerifiedClient: false,
        isVerifiedProject: false,
        isHighlighted: false,
        improvementSuggestion: data.improvementSuggestion,
      });

      if (id) {
        toast.success("Feedback published successfully!");
        setShowForm(false);
        loadPosts();
      } else {
        toast.error("Failed to submit feedback — check console for details");
      }
    } catch (e) {
      console.error("handleSubmitFeedback error", e);
      toast.error(
        `Failed to submit feedback: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
    setSubmitting(false);
  };

  const categoryCounts: Record<string, number> = {};
  for (const p of posts) {
    categoryCounts[p.serviceCategory] =
      (categoryCounts[p.serviceCategory] || 0) + 1;
  }

  return (
    <PageShell
      eyebrow="Client Reviews"
      title="Feedback Forum"
      subtitle="Real feedback from real clients. Share your experience with CAFÉ Services — your review helps us improve."
    >
      {/* CTA Bar */}
      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4">
        <UserAvatar user={loggedProfile || userProfile} size="md" />
        <button
          onClick={() => (uid ? setShowForm(true) : setShowLoginPrompt(true))}
          className="touch-target flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-3 text-left text-sm text-[#6B6B80] transition-colors hover:border-[#4F6EF7]/30 hover:text-[#F0F0F5]"
        >
          Share your feedback...
        </button>
        <button
          onClick={() => (uid ? setShowForm(true) : setShowLoginPrompt(true))}
          className="touch-target inline-flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-3 text-sm font-semibold text-white hover:bg-[#6B85FF] shadow-[0_0_20px_rgba(79,110,247,0.15)] transition-all"
        >
          <PenLine size={16} />
          <span className="hidden sm:inline">Share Your Feedback</span>
        </button>
      </div>

      {/* Mobile filter toggle */}
      <div className="mb-4 lg:hidden">
        <button
          onClick={() => setShowMobileFilters(!showMobileFilters)}
          className="touch-target flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]"
        >
          {showMobileFilters ? <X size={16} /> : <SlidersHorizontal size={16} />}
          {showMobileFilters ? "Close filters" : "Filters & search"}
        </button>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className={`${showMobileFilters ? 'block' : 'hidden'} lg:block lg:w-72 lg:shrink-0`}>
          <FeedbackSidebar
            category={category}
            onCategoryChange={(val) => { setCategory(val); setShowMobileFilters(false) }}
            rating={rating}
            onRatingChange={(val) => { setRating(val); setShowMobileFilters(false) }}
            search={searchInput}
            onSearch={setSearchInput}
            categoryCounts={categoryCounts}
          />
        </div>

        <FeedbackFeed
          posts={posts}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          onPostClick={setSelectedPost}
          onReaction={handleReaction}
          reactionLoading={reactionLoading}
          userReactions={userReactions}
          onSave={handleSave}
          savedPosts={savedPosts}
          onCommentClick={setSelectedPost}
          isAdmin={isAdmin}
          onDeletePost={handleDeletePost}
          category={category}
          rating={rating}
          search={search}
        />
      </div>

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

      {/* Feedback Form */}
      <FeedbackForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmitFeedback}
        isSubmitting={submitting}
      />

      {/* Login Prompt */}
      <AnimatePresence>
        {showLoginPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowLoginPrompt(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm rounded-3xl border border-white/[0.08] bg-[#0A0A0F] p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Star size={32} className="mx-auto mb-4 text-[#F59E0B]" />
              <h2 className="text-lg font-bold text-[#F0F0F5] mb-2">
                Share Your Experience
              </h2>
              <p className="text-sm text-[#6B6B80] mb-6">
                Login to submit your feedback and help us improve.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/login"
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-2.5 rounded-xl bg-[#4F6EF7] text-white text-sm font-semibold hover:bg-[#6B85FF] transition-all text-center block"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setShowLoginPrompt(false)}
                  className="w-full py-2.5 rounded-xl border border-white/[0.08] text-[#F0F0F5] text-sm font-medium hover:bg-white/[0.04] transition-all text-center block"
                >
                  Sign Up
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageShell>
  );
}
