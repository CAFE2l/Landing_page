import { useEffect, useState } from "react"
import { supabase, supabaseConfigured } from "../lib/supabase/client"
import { useAuth } from "../contexts/AuthContext"

const SAVED_TABLE = "saved_feedbacks"

export function useSavedFeedback(postId: string) {
  const { user } = useAuth()
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user?.id || !supabase || !supabaseConfigured) return

    supabase
      .from(SAVED_TABLE)
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setSaved(!!data))
  }, [postId, user?.id])

  const toggleSave = async () => {
    if (!user?.id || loading || !supabase || !supabaseConfigured) return
    setLoading(true)

    if (saved) {
      await supabase
        .from(SAVED_TABLE)
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
      setSaved(false)
    } else {
      await supabase
        .from(SAVED_TABLE)
        .insert({ post_id: postId, user_id: user.id })
      setSaved(true)
    }
    setLoading(false)
  }

  return { saved, toggleSave, loading }
}
