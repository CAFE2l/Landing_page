import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../contexts/AuthContext";
import { fetchConversations, type ConversationSummary } from "../data/feedbackServiceSupabase";

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetchConversations(user.id)
      .then(setConversations)
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <PageShell
      eyebrow="Messages"
      title="Private Messages"
      subtitle="Your direct conversations with CAFÉ Services clients."
    >
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.04] p-3 backdrop-blur-xl">
        {loading ? (
          <div className="p-8 text-[#8E8EA3]">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="p-10 text-center">
            <MessageCircle className="mx-auto mb-4 text-[#4F6EF7]" size={32} />
            <p className="text-sm text-[#8E8EA3]">No private messages yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conversation, index) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link
                  to={`/dashboard/messages/${conversation.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-black/20 p-4 transition-all hover:border-[#4F6EF7]/25 hover:bg-white/[0.04]"
                >
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#4F6EF7]/10 text-sm font-bold text-[#8EA0FF]">
                    {conversation.otherAvatar ? (
                      <img src={conversation.otherAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      conversation.otherName[0]?.toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{conversation.otherName}</p>
                    <p className="truncate text-sm text-[#8E8EA3]">{conversation.lastMessage || "Start the conversation"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#6B6B80]">{new Date(conversation.lastMessageAt).toLocaleDateString("en-US")}</p>
                    {conversation.unreadCount > 0 && (
                      <span className="mt-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}
