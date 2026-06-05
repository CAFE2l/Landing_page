import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Bookmark, Loader2, MessageCircle } from "lucide-react";
import toast from "react-hot-toast";
import PageShell from "./PageShell";
import FeedbackCard from "../components/feedback/FeedbackCard";
import FeedbackDetail from "../components/feedback/FeedbackDetail";
import { useAuth } from "../contexts/AuthContext";
import { loadCurrentUser } from "../data/feedbackStore";
import type { FeedbackPost } from "../data/feedbackStore";
import {
  fetchSavedFeedbackPosts,
  removeSavedFeedbackPost,
} from "../data/feedbackServiceSupabase";

export default function SavedPostsPage() {
  const { user: supabaseUser } = useAuth();
  const localUser = loadCurrentUser();
  const currentUser = supabaseUser || localUser;
  const userProfile = currentUser
    ? (currentUser as unknown as { uid?: string; id: string })
    : null;
  const uid = supabaseUser?.id || userProfile?.uid || userProfile?.id;

  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<FeedbackPost | null>(null);

  const savedIds = useMemo(() => new Set(posts.map((post) => post.id)), [posts]);

  useEffect(() => {
    if (!uid) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    fetchSavedFeedbackPosts(uid)
      .then(setPosts)
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [uid]);

  if (!currentUser) return <Navigate to="/login" replace />;

  const handleRemoveSaved = async (postId: string) => {
    if (!uid) return;
    const success = await removeSavedFeedbackPost(postId, uid);
    if (!success) {
      toast.error("Could not remove saved post");
      return;
    }
    setPosts((current) => current.filter((post) => post.id !== postId));
    setSelectedPost((current) => (current?.id === postId ? null : current));
    toast.success("Post removed from saved");
  };

  return (
    <PageShell
      eyebrow="Saved posts"
      title="Saved Feedback"
      subtitle="Posts you bookmarked from the feedback forum."
    >
      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02] py-20">
          <Loader2 size={24} className="animate-spin text-[#4F6EF7]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-white/[0.02] p-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#4F6EF7]/20 bg-[#4F6EF7]/5 text-[#4F6EF7]">
            <Bookmark size={24} />
          </div>
          <h2 className="mb-3 text-lg font-bold text-[#F0F0F5]">
            No saved posts yet
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[#6B6B80]">
            Use the bookmark button on feedback cards to keep useful posts here.
          </p>
          <Link
            to="/feedback"
            className="inline-flex items-center gap-2 rounded-xl bg-[#4F6EF7] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#6B85FF]"
          >
            <MessageCircle size={16} />
            Open feedback forum
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {posts.map((post, index) => (
            <FeedbackCard
              key={post.id}
              post={post}
              index={index}
              onClick={() => setSelectedPost(post)}
              onHelpful={() => undefined}
              onComment={() => setSelectedPost(post)}
              onSave={() => handleRemoveSaved(post.id)}
              helpful={false}
              saved={savedIds.has(post.id)}
            />
          ))}
        </div>
      )}

      <FeedbackDetail
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onHelpful={() => undefined}
        helpful={false}
      />
    </PageShell>
  );
}
