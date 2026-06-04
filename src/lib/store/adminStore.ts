import { create } from "zustand"
import type { FeedbackStatus, FeedbackChannel } from "../types"

interface AdminFilters {
  search: string
  status: FeedbackStatus | "all"
  channel: FeedbackChannel | "all"
  sort: "newest" | "oldest" | "upvoted"
  dateRange: [Date | null, Date | null]
}

interface UIState {
  sidebarCollapsed: boolean
  feedbackDrawerOpen: boolean
  selectedFeedbackId: string | null
  confirmModal: { open: boolean; title: string; message: string; onConfirm: () => void } | null
}

interface AdminStore {
  filters: AdminFilters
  setFilter: <K extends keyof AdminFilters>(key: K, value: AdminFilters[K]) => void
  resetFilters: () => void
  ui: UIState
  toggleSidebar: () => void
  openFeedbackDrawer: (id: string) => void
  closeFeedbackDrawer: () => void
  showConfirm: (title: string, message: string, onConfirm: () => void) => void
  hideConfirm: () => void
}

const defaultFilters: AdminFilters = {
  search: "",
  status: "all",
  channel: "all",
  sort: "newest",
  dateRange: [null, null],
}

export const useAdminStore = create<AdminStore>((set) => ({
  filters: { ...defaultFilters },
  setFilter: (key, value) => set((s) => ({ filters: { ...s.filters, [key]: value } })),
  resetFilters: () => set({ filters: { ...defaultFilters } }),
  ui: {
    sidebarCollapsed: false,
    feedbackDrawerOpen: false,
    selectedFeedbackId: null,
    confirmModal: null,
  },
  toggleSidebar: () => set((s) => ({ ui: { ...s.ui, sidebarCollapsed: !s.ui.sidebarCollapsed } })),
  openFeedbackDrawer: (id) => set((s) => ({ ui: { ...s.ui, feedbackDrawerOpen: true, selectedFeedbackId: id } })),
  closeFeedbackDrawer: () => set((s) => ({ ui: { ...s.ui, feedbackDrawerOpen: false, selectedFeedbackId: null } })),
  showConfirm: (title, message, onConfirm) => set((s) => ({ ui: { ...s.ui, confirmModal: { open: true, title, message, onConfirm } } })),
  hideConfirm: () => set((s) => ({ ui: { ...s.ui, confirmModal: null } })),
}))
