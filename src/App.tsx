import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { RootLayout } from "./layouts/RootLayout";
import HomePage from "./pages/HomePage";
import ImportFilePage from "./pages/ImportFilePage";
import { AuthProvider } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ProfilePage from "./pages/ProfilePage";
import { AdminRoute } from "./components/admin/AdminRoute";
import { AdminLayout } from "./layouts/AdminLayout";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminMembersPage from "./pages/admin/AdminMembersPage";
import AdminFeedbackPage from "./pages/admin/AdminFeedbackPage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<RootLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/bhxh-1-lan" element={<HomePage />} />
            <Route path="/luong-huu" element={<HomePage />} />
            <Route path="/bhtn" element={<HomePage />} />
            <Route path="/thai-san" element={<HomePage />} />
            <Route path="/import" element={<ImportFilePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<AdminRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin" element={<Navigate to="/admin/members" replace />} />
              <Route path="/admin/members" element={<AdminMembersPage />} />
              <Route path="/admin/feedback" element={<AdminFeedbackPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
