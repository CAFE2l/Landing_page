import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import PageShell from "./PageShell";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase/client";
import {
  fetchConversationMessages,
  markConversationRead,
  sendDirectMessage,
  type DirectMessage,
} from "../data/feedbackServiceSupabase";

export default function ConversationPage() {
  const { conversationId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!conversationId || !user?.id) return;
    fetchConversationMessages(conversationId).then(setMessages);
    markConversationRead(conversationId, user.id);
  }, [conversationId, user?.id]);

  useEffect(() => {
    const client = supabase;
    if (!client || !conversationId) return;
    const channel = client
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          setMessages((current) => [
            ...current,
            {
              id: row.id as string,
              conversationId: row.conversation_id as string,
              senderId: row.sender_id as string,
              content: row.content as string,
              read: row.read as boolean,
              createdAt: row.created_at as string,
            },
          ]);
        },
      )
      .subscribe();
    return () => {
      client.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!conversationId || !user?.id || !content.trim()) return;
    const next = content.trim();
    setContent("");
    await sendDirectMessage(conversationId, user.id, next);
  };

  return (
    <PageShell
      eyebrow="Direct Message"
      title="Conversation"
      subtitle="Private chat with real-time message updates."
    >
      <div className="flex h-[68vh] flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-xl">
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {messages.map((message, index) => {
            const mine = message.senderId === user?.id;
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.015 }}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? "bg-[#2563EB] text-white" : "bg-white/[0.08] text-[#F0F0F5]"}`}>
                  {message.content}
                  <p className={`mt-1 text-[10px] ${mine ? "text-blue-100/70" : "text-[#8E8EA3]"}`}>
                    {new Date(message.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <form onSubmit={handleSend} className="flex gap-3 border-t border-white/[0.08] bg-black/20 p-3">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write a private message..."
            className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white outline-none focus:border-[#4F6EF7]/50"
          />
          <button className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#8B5CF6] text-white">
            <Send size={18} />
          </button>
        </form>
      </div>
    </PageShell>
  );
}
