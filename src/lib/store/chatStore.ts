import { create } from "zustand"

interface OpenTarget {
  conversationId: string
  otherUserId: string
  otherUserName: string
  otherUserAvatar: string | null
}

interface ChatStore {
  openWithTarget: OpenTarget | null
  setOpenWithTarget: (target: OpenTarget) => void
  clearOpenWithTarget: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  openWithTarget: null,
  setOpenWithTarget: (target) => set({ openWithTarget: target }),
  clearOpenWithTarget: () => set({ openWithTarget: null }),
}))
