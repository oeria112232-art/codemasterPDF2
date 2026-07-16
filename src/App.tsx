
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { LanguageHandler } from './components/LanguageHandler';
import { AuthProvider } from './contexts/AuthContext';
import { ScrollToTop } from './components/ScrollToTop';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const MergePage = lazy(() => import('./pages/MergePage').then(module => ({ default: module.MergePage })));
const CompressPage = lazy(() => import('./pages/CompressPage').then(module => ({ default: module.CompressPage })));
const ConvertPage = lazy(() => import('./pages/ConvertPage').then(module => ({ default: module.ConvertPage })));
const TranslatePage = lazy(() => import('./pages/TranslatePage').then(module => ({ default: module.default })));
const AIChatPage = lazy(() => import('./pages/AIChatPage').then(module => ({ default: module.default })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(module => ({ default: module.AboutPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(module => ({ default: module.ContactPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(module => ({ default: module.TermsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(module => ({ default: module.PrivacyPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(module => ({ default: module.SignupPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(module => ({ default: module.CategoryPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(module => ({ default: module.AdminDashboard })));
const ExamLanding = lazy(() => import('./pages/ExamGenerator/Home'));
const ExamDashboard = lazy(() => import('./pages/ExamGenerator/Dashboard'));
const ExamResults = lazy(() => import('./pages/ExamGenerator/Results'));
import { AdminLayout } from './components/AdminLayout';

function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm font-medium text-slate-400 animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <LanguageHandler />
          <ScrollToTop />
          <Layout>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                <Route element={<ProtectedRoute />}>
                  <Route path="/tools/:id" element={<CategoryPage />} />
                  <Route path="/merge" element={<MergePage />} />
                  <Route path="/split" element={<MergePage />} />
                  <Route path="/compress" element={<CompressPage />} />
                  <Route path="/watermark" element={<MergePage />} />
                  <Route path="/pdf-to-jpg" element={<ConvertPage />} />
                  <Route path="/jpg-to-pdf" element={<ConvertPage />} />
                  <Route path="/html-to-pdf" element={<ConvertPage />} />
                  <Route path="/pdf-to-word" element={<ConvertPage />} />
                  <Route path="/pdf-to-excel" element={<ConvertPage />} />
                  <Route path="/pdf-to-powerpoint" element={<ConvertPage />} />
                  <Route path="/word-to-pdf" element={<ConvertPage />} />
                  <Route path="/excel-to-pdf" element={<ConvertPage />} />
                  <Route path="/powerpoint-to-pdf" element={<ConvertPage />} />
                  <Route path="/protect" element={<MergePage />} />
                  <Route path="/unlock" element={<MergePage />} />
                  <Route path="/rotate" element={<MergePage />} />
                  <Route path="/page-numbers" element={<MergePage />} />
                  <Route path="/sign" element={<MergePage />} />
                  <Route path="/organize" element={<MergePage />} />
                  <Route path="/edit" element={<MergePage />} />
                  <Route path="/crop" element={<MergePage />} />
                  <Route path="/repair" element={<MergePage />} />
                  <Route path="/redact" element={<MergePage />} />
                  <Route path="/translate-pdf" element={<TranslatePage />} />
                  <Route path="/ai-chat" element={<AIChatPage />} />
                </Route>

                <Route path="/exam-generator" element={<ExamLanding />} />
                <Route path="/exam-generator/dashboard" element={<ExamDashboard />} />
                <Route path="/exam-generator/results/:id" element={<ExamResults />} />

                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Routes>
            </Suspense>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
