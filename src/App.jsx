import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import BlogIndexPage from './pages/BlogIndexPage';
import BlogPostPage from './pages/BlogPostPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CheckEmailPage from './pages/CheckEmailPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AppPage from './pages/AppPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/blog" element={<BlogIndexPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/check-email" element={<CheckEmailPage />} />
        <Route path="/accept-invite" element={<AcceptInvitePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/app/*" element={<AppPage />} />
      </Routes>
    </AuthProvider>
  );
}
