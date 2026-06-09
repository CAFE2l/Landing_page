import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import FeedbackPage from "./pages/FeedbackPage";
import LandingPage from "./pages/LandingPage";
import MyDashboardPage from "./pages/MyDashboardPage";
import ProfilePage from "./pages/ProfilePage";
import SavedPostsPage from "./pages/SavedPostsPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import MessagesPage from "./pages/MessagesPage";
import StatusPage from "./pages/StatusPage";
import AdminShell from "./components/admin/AdminShell";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminClients from "./pages/admin/Clients";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminSettings from "./pages/admin/Settings";
import AdminFeedbackManagement from "./pages/admin/AdminFeedbackManagement";
import HirePage from "./pages/HirePage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersDashboardPage from "./pages/OrdersDashboardPage";
import AdminServiceOrders from "./pages/admin/ServiceOrders";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { loadFeedbacks, type FeedbackEntry } from "./data/feedbackStore";
import { listPublicFeedbacks } from "./data/firestoreStore";
import { Toaster } from "react-hot-toast";
import ChatWidget from "./components/chat/ChatWidget";
import ChatErrorBoundary from "./components/chat/ChatErrorBoundary";
import NotificationsPage from "./pages/NotificationsPage";

function App() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>(() =>
    loadFeedbacks(),
  );

  useEffect(() => {
    listPublicFeedbacks()
      .then(setFeedbacks)
      .catch(() => setFeedbacks([]));
  }, []);

  return (
    <AuthProvider>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#0A0A0F",
            color: "#F0F0F5",
            border: "1px solid rgba(255,255,255,0.08)",
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage feedbacks={feedbacks} />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route
            path="/my-account"
            element={
              <ProtectedRoute>
                <MyDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/posts"
            element={
              <ProtectedRoute>
                <MyDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/saved"
            element={
              <ProtectedRoute>
                <SavedPostsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/messages"
            element={
              <ProtectedRoute>
                <ChatErrorBoundary>
                  <MessagesPage />
                </ChatErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/messages/:conversationId"
            element={
              <ProtectedRoute>
                <ChatErrorBoundary>
                  <MessagesPage />
                </ChatErrorBoundary>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/status"
            element={
              <ProtectedRoute>
                <StatusPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/orders"
            element={
              <ProtectedRoute>
                <OrdersDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/hire/:serviceSlug" element={<HirePage />} />
          <Route path="/checkout/:orderId" element={<CheckoutPage />} />
          <Route path="/profile/:userId" element={<PublicProfilePage />} />
          <Route path="/u/:username" element={<PublicProfilePage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
          </Route>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
          </Route>
          <Route
            path="/admin/feedback"
            element={
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            }
          >
            <Route index element={<AdminFeedbackManagement />} />
          </Route>
          <Route
            path="/admin/clients"
            element={
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            }
          >
            <Route index element={<AdminClients />} />
          </Route>
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            }
          >
            <Route index element={<AdminAnalytics />} />
          </Route>
          <Route
            path="/admin/settings"
            element={
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            }
          >
            <Route index element={<AdminSettings />} />
          </Route>
          <Route
            path="/admin/service-orders"
            element={
              <AdminRoute>
                <AdminShell />
              </AdminRoute>
            }
          >
            <Route index element={<AdminServiceOrders />} />
          </Route>
        </Routes>
        <ChatErrorBoundary>
          <ChatWidget />
        </ChatErrorBoundary>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
