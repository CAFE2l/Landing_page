import { useState } from "react"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import AdminPage from "./pages/AdminPage"
import AuthPage from "./pages/AuthPage"
import FeedbackPage from "./pages/FeedbackPage"
import LandingPage from "./pages/LandingPage"
import ProfilePage from "./pages/ProfilePage"
import {
  loadCurrentUser,
  loadFeedbacks,
  saveFeedbacks,
  type FeedbackEntry,
  type UserProfile,
} from "./data/feedbackStore"

function App() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>(() => loadFeedbacks())
  const [user, setUser] = useState<UserProfile | null>(() => loadCurrentUser())

  const persistFeedbacks = (nextFeedbacks: FeedbackEntry[]) => {
    setFeedbacks(nextFeedbacks)
    saveFeedbacks(nextFeedbacks)
  }

  const addFeedback = (feedback: FeedbackEntry) => {
    persistFeedbacks([feedback, ...feedbacks])
  }

  const updateApproval = (id: string, approved: boolean) => {
    persistFeedbacks(feedbacks.map((item) => (item.id === id ? { ...item, approved } : item)))
  }

  const deleteFeedback = (id: string) => {
    persistFeedbacks(feedbacks.filter((item) => item.id !== id))
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage feedbacks={feedbacks} />} />
        <Route path="/feedback" element={<FeedbackPage feedbacks={feedbacks} />} />
        <Route path="/login" element={<AuthPage mode="login" onAuth={setUser} />} />
        <Route path="/signup" element={<AuthPage mode="signup" onAuth={setUser} />} />
        <Route path="/profile" element={<ProfilePage user={user} onSubmitFeedback={addFeedback} />} />
        <Route path="/perfil" element={<ProfilePage user={user} onSubmitFeedback={addFeedback} />} />
        <Route
          path="/admin"
          element={
            <AdminPage
              user={user}
              feedbacks={feedbacks}
              onApprove={(id) => updateApproval(id, true)}
              onReject={(id) => updateApproval(id, false)}
              onDelete={deleteFeedback}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
