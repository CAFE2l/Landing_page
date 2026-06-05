import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, PenLine } from "lucide-react";
import { Link } from "react-router-dom";
import { getInitials } from "../lib/utils";
import PageShell from "./PageShell";
import FeedbackFeed from "../components/feedback/FeedbackFeed";
import FeedbackSidebar from "../components/feedback/FeedbackSidebar";
import FeedbackDetail from "../components/feedback/FeedbackDetail";
import FeedbackForm, {
  type FeedbackFormData,
} from "../components/feedback/FeedbackForm";
import type { FeedbackPost, ServiceCategory } from "../data/feedbackStore";
import {
  searchFeedbackPosts,
  createFeedbackPost,
  toggleFeedbackVote,
  getUserFeedbackVote,
  getUserSavedPostIds,
  removeSavedFeedbackPost,
  saveFeedbackPost,
} from "../data/feedbackServiceSupabase";
import { useAuth } from "../contexts/AuthContext";
import { loadCurrentUser } from "../data/feedbackStore";
import toast from "react-hot-toast";

export default function FeedbackPage() {
  const { user: supabaseUser } = useAuth();
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

  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<
    "recent" | "rating" | "helpful" | "media" | "verified"
  >("recent");
  const [category, setCategory] = useState<ServiceCategory | "">("");
  const [rating, setRating] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [votes, setVotes] = useState<Map<string, "up" | "down">>(new Map());
  const [savedPosts, setSavedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<FeedbackPost | null>(null);
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
    if (uid) {
      const fetchVotes = async () => {
        const nextVotes = new Map<string, "up" | "down">();
        for (const p of posts) {
          const vote = await getUserFeedbackVote(p.id, uid);
          if (vote) nextVotes.set(p.id, vote);
        }
        setVotes(nextVotes);
      };
      fetchVotes();
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

  const applyVoteState = (
    postId: string,
    previousVote: "up" | "down" | undefined,
    nextVote: "up" | "down" | null,
  ) => {
    const updatePost = (p: FeedbackPost): FeedbackPost => {
      if (p.id !== postId) return p;
      const helpfulDelta =
        (nextVote === "up" ? 1 : 0) - (previousVote === "up" ? 1 : 0);
      const downvoteDelta =
        (nextVote === "down" ? 1 : 0) - (previousVote === "down" ? 1 : 0);
      return {
        ...p,
        helpfulCount: Math.max(0, p.helpfulCount + helpfulDelta),
        downvoteCount: Math.max(0, (p.downvoteCount || 0) + downvoteDelta),
      };
    };

    setPosts((prev) => prev.map(updatePost));
    setSelectedPost((prev) => (prev ? updatePost(prev) : prev));
  };

  const handleVote = async (postId: string, voteType: "up" | "down") => {
    const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id;
    if (!uid) {
      toast.error("Login to vote");
      return;
    }
    const previousVote = votes.get(postId);
    const result = await toggleFeedbackVote(postId, uid, voteType);
    setVotes((prev) => {
      const next = new Map(prev);
      if (result) next.set(postId, result);
      else next.delete(postId);
      return next;
    });
    applyVoteState(postId, previousVote, result);
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

    try {
      const id = await createFeedbackPost({
        userId: uid,
        userName:
          userProfile?.name || userProfile?.email?.split("@")[0] || "User",
        userAvatar: userProfile?.photoUrl || "",
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
        toast.success("Feedback publicado com sucesso!");
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#4F6EF7] overflow-hidden">
          {userProfile?.photoUrl ? (
            <img
              src={userProfile.photoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : userProfile?.name ? (
            getInitials(userProfile.name)
          ) : (
            "CS"
          )}
        </div>
        <button
          onClick={() => (uid ? setShowForm(true) : setShowLoginPrompt(true))}
          className="flex-1 rounded-xl border border-white/[0.08] bg-black/20 px-4 py-2.5 text-left text-sm text-[#6B6B80] transition-colors hover:border-[#4F6EF7]/30 hover:text-[#F0F0F5]"
        >
          Share your feedback...
        </button>
        <button
          onClick={() => (uid ? setShowForm(true) : setShowLoginPrompt(true))}
          className="inline-flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6B85FF] shadow-[0_0_20px_rgba(79,110,247,0.15)] transition-all"
        >
          <PenLine size={16} />
          <span className="hidden sm:inline">Share Your Feedback</span>
        </button>
      </div>

      <div className="flex gap-6">
        <FeedbackSidebar
          category={category}
          onCategoryChange={setCategory}
          rating={rating}
          onRatingChange={setRating}
          search={searchInput}
          onSearch={setSearchInput}
          categoryCounts={categoryCounts}
        />

        <FeedbackFeed
          posts={posts}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          onPostClick={setSelectedPost}
          onHelpful={(postId) => handleVote(postId, "up")}
          onVote={handleVote}
          votes={votes}
          onSave={handleSave}
          savedPosts={savedPosts}
          helpfulPosts={
            new Set(
              [...votes.entries()]
                .filter(([, vote]) => vote === "up")
                .map(([postId]) => postId),
            )
          }
          onCommentClick={setSelectedPost}
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
        onHelpful={(postId) => handleVote(postId, "up")}
        onVote={handleVote}
        vote={selectedPost ? votes.get(selectedPost.id) || null : null}
        helpful={selectedPost ? votes.get(selectedPost.id) === "up" : false}
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
