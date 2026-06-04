import { useEffect, useState } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import { AuthProvider } from "./contexts/AuthContext"
import AdminPage from "./pages/AdminPage"
import AuthPage from "./pages/AuthPage"
import AuthCallback from "./pages/AuthCallback"
import FeedbackPage from "./pages/FeedbackPage"
import LandingPage from "./pages/LandingPage"
import MyDashboardPage from "./pages/MyDashboardPage"
import ProfilePage from "./pages/ProfilePage"
import AdminShell from "./components/admin/AdminShell"
import AdminLogin from "./pages/admin/Login"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminClients from "./pages/admin/Clients"
import AdminAnalytics from "./pages/admin/Analytics"
import AdminSettings from "./pages/admin/Settings"
import AdminFeedbackManagement from "./pages/admin/AdminFeedbackManagement"
import { ProtectedRoute } from "./components/auth/ProtectedRoute"
import { AdminRoute } from "./components/auth/AdminRoute"
import {
  loadCurrentUser,
  loadFeedbacks,
  saveFeedbacks,
  type FeedbackEntry,
  type UserProfile,
} from "./data/feedbackStore"
import { createFeedback, listPublicFeedbacks } from "./data/firestoreStore"

function App() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>(() => loadFeedbacks())
  const [user, setUser] = useState<UserProfile | null>(() => loadCurrentUser())

  useEffect(() => {
    listPublicFeedbacks().then(setFeedbacks).catch(() => setFeedbacks([]))
  }, [])

  const persistFeedbacks = (nextFeedbacks: FeedbackEntry[]) => {
    setFeedbacks(nextFeedbacks)
    saveFeedbacks(nextFeedbacks)
  }

  const addFeedback = async (feedback: FeedbackEntry) => {
    await createFeedback(feedback)
    persistFeedbacks([feedback, ...feedbacks])
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage feedbacks={feedbacks} />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<AuthPage mode="login" onAuth={setUser} />} />
          <Route path="/signup" element={<AuthPage mode="signup" onAuth={setUser} />} />
          <Route path="/my-account" element={<ProtectedRoute><MyDashboardPage /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage user={user} onSubmitFeedback={addFeedback} /></ProtectedRoute>} />
          <Route path="/perfil" element={<ProtectedRoute><ProfilePage user={user} onSubmitFeedback={addFeedback} /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage user={user} /></AdminRoute>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminRoute><AdminShell /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
          </Route>
          <Route path="/admin/feedback" element={<AdminRoute><AdminShell /></AdminRoute>}>
            <Route index element={<AdminFeedbackManagement />} />
          </Route>
          <Route path="/admin/clients" element={<AdminRoute><AdminShell /></AdminRoute>}>
            <Route index element={<AdminClients />} />
          </Route>
          <Route path="/admin/forum" element={<AdminRoute><AdminShell /></AdminRoute>}>
            <Route index element={<AdminForum />} />
          </Route>
          <Route path="/admin/analytics" element={<AdminRoute><AdminShell /></AdminRoute>}>
            <Route index element={<AdminAnalytics />} />
          </Route>
          <Route path="/admin/settings" element={<AdminRoute><AdminShell /></AdminRoute>}>
            <Route index element={<AdminSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
