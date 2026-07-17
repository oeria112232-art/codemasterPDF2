
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { LanguageHandler } from './components/LanguageHandler';
import { AuthProvider } from './contexts/AuthContext';
import { CreditsProvider } from './contexts/CreditsContext';
import { ScrollToTop } from './components/ScrollToTop';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Loader2 } from 'lucide-react';

const Home = lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const MergePage = lazy(() => import('./pages/MergePage').then(module => ({ default: module.MergePage })));
const CompressPage = lazy(() => import('./pages/CompressPage').then(module => ({ default: module.CompressPage })));
const ConvertPage = lazy(() => import('./pages/ConvertPage').then(module => ({ default: module.ConvertPage })));
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
const PdfChatPage = lazy(() => import('./pages/PdfChatPage').then(module => ({ default: module.PdfChatPage })));
const PdfComparePage = lazy(() => import('./pages/PdfComparePage').then(module => ({ default: module.PdfComparePage })));
const PricingPage = lazy(() => import('./pages/PricingPage').then(module => ({ default: module.PricingPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const BatchProcessPage = lazy(() => import('./pages/BatchProcessPage').then(module => ({ default: module.BatchProcessPage })));
const AiSummarizePage = lazy(() => import('./pages/AiSummarizePage').then(module => ({ default: module.AiSummarizePage })));
const ContractAnalyzerPage = lazy(() => import('./pages/ContractAnalyzerPage').then(module => ({ default: module.ContractAnalyzerPage })));
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
        <CreditsProvider>
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
                  <Route path="/pricing" element={<PricingPage />} />
                  <Route path="/dashboard" element={<DashboardPage />} />

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
                    <Route path="/pdf-to-chat" element={<PdfChatPage />} />
                    <Route path="/pdf-to-compare" element={<PdfComparePage />} />
                    <Route path="/batch-process" element={<BatchProcessPage />} />
                    <Route path="/ai-summarize" element={<AiSummarizePage />} />
                    <Route path="/contract-analyzer" element={<ContractAnalyzerPage />} />
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
        </CreditsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
