
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Layout } from './components/Layout';
import { LanguageHandler } from './components/LanguageHandler';
import { AuthProvider } from './contexts/AuthContext';
import { ScrollToTop } from './components/ScrollToTop';
import { ToastProvider } from './contexts/ToastContext';
import { isSupabaseConfigured, supabaseConfigError } from './lib/supabase';
import { ShieldAlert, Zap, Cpu, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Lazy load pages for better performance
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
const TranslatePage = lazy(() => import('./pages/TranslatePage').then(module => ({ default: module.TranslatePage })));
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
  const { t } = useTranslation();

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 overflow-hidden relative font-sans">
        {/* Abstract Background */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-600/10 blur-[150px] rounded-full" />

        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl p-12 text-center relative z-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="mx-auto h-20 w-20 bg-indigo-600/10 border border-indigo-500/30 rounded-3xl flex items-center justify-center mb-8 shadow-inner shadow-indigo-500/20">
            <Cpu className="h-10 w-10 text-indigo-500 animate-pulse" />
          </div>

          <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tight">{t('supabase.initRequired')}</h2>

          {supabaseConfigError && (
            <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-[11px] font-black uppercase tracking-widest">
              {t('supabase.critException')}: {supabaseConfigError.includes('URL is missing') ? t('supabase.urlMissing') :
                supabaseConfigError.includes('start with https://') ? t('supabase.urlHttps') :
                  supabaseConfigError.includes('contain .supabase.co') ? t('supabase.urlInvalid') :
                    supabaseConfigError.includes('ANON_KEY is missing') ? t('supabase.keyMissing') : supabaseConfigError}
            </div>
          )}

          <p className="text-slate-400 font-medium mb-10 leading-relaxed">
            {t('supabase.syncEngine')}
          </p>

          <div className="text-left bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="w-4 h-4 text-slate-500" />
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('supabase.protocolBuffer')}</span>
            </div>
            <pre className="text-sm font-mono text-indigo-400/80 leading-loose">
              VITE_SUPABASE_URL=<span className="text-slate-600">your_cluster_endpoint</span>{'\n'}
              VITE_SUPABASE_ANON_KEY=<span className="text-slate-600">your_security_token</span>
            </pre>
          </div>

          <div className="mt-10 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-emerald-500" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              {t('supabase.restart')}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
                <Route path="/tools/:id" element={<CategoryPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/merge" element={<MergePage />} />
                <Route path="/split" element={<MergePage />} />
                <Route path="/compress" element={<CompressPage />} />
                <Route path="/convert" element={<ConvertPage />} />
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

                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />

                {/* Admin Routes */}
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
