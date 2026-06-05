import { useEffect, useState } from "react"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import { useAuth } from "../contexts/AuthContext"

const VOTES_TABLE = "feedback_votes"

async function adjustCount(postId: string, voteType: "up" | "down", amount: 1 | -1) {
  if (!supabase || !supabaseConfigured) return
  const fn = amount > 0
    ? `increment_${voteType === "up" ? "helpful" : "downvote"}_count`
    : `decrement_${voteType === "up" ? "helpful" : "downvote"}_count`
  await supabase.rpc(fn, { post_id: postId })
}

export function useFeedbackVote(postId: string) {
  const { user } = useAuth()
  const [vote, setVote] = useState<"up" | "down" | null>(null)
  const [counts, setCounts] = useState({ up: 0, down: 0 })

  useEffect(() => {
    if (!supabase || !supabaseConfigured) return

    supabase
      .from(VOTES_TABLE)
      .select("vote_type")
      .eq("post_id", postId)
      .then(({ data }) => {
        setCounts({
          up: data?.filter((v) => v.vote_type === "up").length ?? 0,
          down: data?.filter((v) => v.vote_type === "down").length ?? 0,
        })
      })

    if (!user?.id) return

    supabase
      .from(VOTES_TABLE)
      .select("vote_type")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setVote((data?.vote_type as "up" | "down") ?? null))
  }, [postId, user?.id])

  const castVote = async (type: "up" | "down") => {
    if (!user?.id || !supabase || !supabaseConfigured) return

    if (vote === type) {
      await supabase
        .from(VOTES_TABLE)
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
      setVote(null)
      setCounts((prev) => ({ ...prev, [type]: prev[type] - 1 }))
      await adjustCount(postId, type, -1)
    } else {
      const wasOpposite = vote !== null

      await supabase.from(VOTES_TABLE).upsert(
        { post_id: postId, user_id: user.id, vote_type: type },
        { onConflict: "post_id,user_id" },
      )

      if (wasOpposite && vote) await adjustCount(postId, vote, -1)
      await adjustCount(postId, type, 1)

      setVote(type)
      setCounts((prev) => ({
        up: prev.up + (type === "up" ? 1 : 0) + (wasOpposite && vote === "up" ? -1 : 0),
        down: prev.down + (type === "down" ? 1 : 0) + (wasOpposite && vote === "down" ? -1 : 0),
      }))
    }
  }

  return { vote, counts, castVote }
}
