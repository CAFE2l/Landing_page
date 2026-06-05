import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Edit3, MessageCircle, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import PageShell from "./PageShell";
import FeedbackCard from "../components/feedback/FeedbackCard";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchPublicProfile,
  getOrCreateConversation,
  isFollowingProfile,
  toggleFollowProfile,
  type PublicProfileData,
} from "../data/feedbackServiceSupabase";

export default function PublicProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = !!user?.id && user.id === userId;

  useEffect(() => {
    if (!userId) return;
    queueMicrotask(() => setLoading(true));
    fetchPublicProfile(userId)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!user?.id || !userId || user.id === userId) return;
    isFollowingProfile(user.id, userId).then(setFollowing);
  }, [user?.id, userId]);

  const handleFollow = async () => {
    if (!user?.id || !userId) {
      toast.error("Login to follow users");
      return;
    }
    const next = await toggleFollowProfile(user.id, userId);
    setFollowing(next);
    setProfile((current) =>
      current
        ? {
            ...current,
            stats: {
              ...current.stats,
              followers: Math.max(
                0,
                current.stats.followers + (next ? 1 : -1),
              ),
            },
          }
        : current,
    );
  };

  const handleMessage = async () => {
    if (!user?.id || !userId) {
      toast.error("Login to send a message");
      return;
    }
    const conversationId = await getOrCreateConversation(user.id, userId);
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
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/[0.12] bg-[#4F6EF7]/10 text-2xl font-bold text-[#8EA0FF]">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    profile.name[0]?.toUpperCase()
                  )}
                </div>
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
                    <button onClick={handleFollow} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${following ? "bg-[#22C55E] text-[#05110A]" : "border border-white/[0.1] text-[#F0F0F5] hover:bg-white/[0.06]"}`}>
                      <UserPlus size={16} /> {following ? "Following" : "Follow"}
                    </button>
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

          <div className="flex items-center gap-2 text-sm font-semibold text-[#F0F0F5]">
            <Users size={16} /> Public feedback
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {profile.posts.map((post, index) => (
              <FeedbackCard
                key={post.id}
                post={post}
                index={index}
                onClick={() => undefined}
                onReaction={() => undefined}
                onComment={() => undefined}
              />
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
}
