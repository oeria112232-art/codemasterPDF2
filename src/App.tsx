
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

const MergeToolPage = lazy(() => import('./pages/MergeToolPage').then(module => ({ default: module.MergeToolPage })));
const SplitToolPage = lazy(() => import('./pages/SplitToolPage').then(module => ({ default: module.SplitToolPage })));
const ProtectToolPage = lazy(() => import('./pages/ProtectToolPage').then(module => ({ default: module.ProtectToolPage })));
const UnlockToolPage = lazy(() => import('./pages/UnlockToolPage').then(module => ({ default: module.UnlockToolPage })));
const RotateToolPage = lazy(() => import('./pages/RotateToolPage').then(module => ({ default: module.RotateToolPage })));
const PageNumbersToolPage = lazy(() => import('./pages/PageNumbersToolPage').then(module => ({ default: module.PageNumbersToolPage })));
const RepairToolPage = lazy(() => import('./pages/RepairToolPage').then(module => ({ default: module.RepairToolPage })));
const OrganizeToolPage = lazy(() => import('./pages/OrganizeToolPage').then(module => ({ default: module.OrganizeToolPage })));
const EditToolPage = lazy(() => import('./pages/EditToolPage').then(module => ({ default: module.EditToolPage })));
const CropToolPage = lazy(() => import('./pages/CropToolPage').then(module => ({ default: module.CropToolPage })));
const RedactToolPage = lazy(() => import('./pages/RedactToolPage').then(module => ({ default: module.RedactToolPage })));
const SignToolPage = lazy(() => import('./pages/SignToolPage').then(module => ({ default: module.SignToolPage })));
const WatermarkToolPage = lazy(() => import('./pages/WatermarkToolPage').then(module => ({ default: module.WatermarkToolPage })));
const MetadataEditorPage = lazy(() => import('./pages/MetadataEditorPage').then(module => ({ default: module.MetadataEditorPage })));
const FlattenPdfPage = lazy(() => import('./pages/FlattenPdfPage').then(module => ({ default: module.FlattenPdfPage })));
const OcrPdfPage = lazy(() => import('./pages/OcrPdfPage').then(module => ({ default: module.OcrPdfPage })));
const FillFormsPage = lazy(() => import('./pages/FillFormsPage').then(module => ({ default: module.FillFormsPage })));
const DeletePagesPage = lazy(() => import('./pages/DeletePagesPage').then(module => ({ default: module.DeletePagesPage })));
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

                    {/* Optimization Tools */}
                    <Route path="/merge" element={<MergeToolPage />} />
                    <Route path="/split" element={<SplitToolPage />} />
                    <Route path="/compress" element={<CompressPage />} />

                    {/* Edit Tools */}
                    <Route path="/edit" element={<EditToolPage />} />
                    <Route path="/organize" element={<OrganizeToolPage />} />
                    <Route path="/rotate" element={<RotateToolPage />} />
                    <Route path="/page-numbers" element={<PageNumbersToolPage />} />
                    <Route path="/crop" element={<CropToolPage />} />
                    <Route path="/repair" element={<RepairToolPage />} />

                    {/* Security Tools */}
                    <Route path="/protect" element={<ProtectToolPage />} />
                    <Route path="/unlock" element={<UnlockToolPage />} />
                    <Route path="/watermark" element={<WatermarkToolPage />} />
                    <Route path="/sign" element={<SignToolPage />} />
                    <Route path="/redact" element={<RedactToolPage />} />

                    {/* Convert Tools */}
                    <Route path="/pdf-to-jpg" element={<ConvertPage />} />
                    <Route path="/jpg-to-pdf" element={<ConvertPage />} />
                    <Route path="/html-to-pdf" element={<ConvertPage />} />
                    <Route path="/pdf-to-word" element={<ConvertPage />} />
                    <Route path="/pdf-to-excel" element={<ConvertPage />} />
                    <Route path="/pdf-to-powerpoint" element={<ConvertPage />} />
                    <Route path="/word-to-pdf" element={<ConvertPage />} />
                    <Route path="/excel-to-pdf" element={<ConvertPage />} />
                    <Route path="/powerpoint-to-pdf" element={<ConvertPage />} />

                    {/* Intelligence Tools */}
                    <Route path="/pdf-to-chat" element={<PdfChatPage />} />
                    <Route path="/pdf-to-compare" element={<PdfComparePage />} />
                    <Route path="/batch-process" element={<BatchProcessPage />} />
                    <Route path="/ai-summarize" element={<AiSummarizePage />} />
                    <Route path="/contract-analyzer" element={<ContractAnalyzerPage />} />

                    {/* New Professional Tools */}
                    <Route path="/metadata-editor" element={<MetadataEditorPage />} />
                    <Route path="/flatten-pdf" element={<FlattenPdfPage />} />
                    <Route path="/ocr-pdf" element={<OcrPdfPage />} />
                    <Route path="/fill-forms" element={<FillFormsPage />} />
                    <Route path="/delete-pages" element={<DeletePagesPage />} />
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
