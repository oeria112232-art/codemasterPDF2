import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Loader2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { isFirebaseConfigured } from '../lib/firebase';

export function SignupPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { signUp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFirebaseConfigured) {
            showToast('Firebase is not configured. Please check environment variables.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast(t('auth.passwordMismatch'), 'error');
            return;
        }

        if (password.length < 6) {
            showToast(t('auth.passwordTooShort') || 'Password must be at least 6 characters', 'error');
            return;
        }

        setLoading(true);

        try {
            await signUp(email, password, name);
            showToast(t('auth.accountCreated'), 'success');
            navigate('/');
        } catch (err: any) {
            console.error('Signup error:', err);
            let message = err.message || t('auth.error');
            if (message.includes('email-already-in-use')) {
                message = t('auth.emailAlreadyInUse') || 'An account with this email already exists';
            } else if (message.includes('weak-password')) {
                message = t('auth.weakPassword') || 'Password is too weak';
            } else if (message.includes('network-request-failed')) {
                message = t('auth.networkError') || 'Unable to connect to server.';
            }
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center p-6 bg-slate-50 dark:bg-[#020617] relative min-h-screen overflow-y-auto overflow-x-hidden">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-slate-200/80 dark:border-slate-800/80 my-8">

                <div className="hidden lg:flex flex-col justify-between p-10 bg-slate-900 border-r border-slate-800 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent pointer-events-none" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
                            <Sparkles className="w-3.5 h-3.5" /> {t('auth.onboarding')}
                        </div>
                        <h1 className="text-3xl font-semibold text-white leading-tight mb-4">
                            {t('auth.joinElite')}
                        </h1>
                        <p className="text-slate-400 text-sm font-normal leading-relaxed max-w-sm">
                            {t('auth.signupDesc')}
                        </p>
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                            <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center text-indigo-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{t('auth.securityTitle')}</p>
                                <p className="text-slate-500 text-xs">{t('auth.securityDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 lg:p-10 flex flex-col justify-center">
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1.5">{t('auth.signupTitle')}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">{t('auth.signupSubtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    {t('auth.name')}
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('auth.name')}
                                        className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    {t('auth.email')}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                        {t('auth.password')}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                        {t('auth.confirmPassword')}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 rtl:left-auto rtl:right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-4 rtl:pl-4 rtl:pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            {loading ? t('auth.processing') : t('auth.submitSignup')}
                        </button>
                    </form>

                    <div className="mt-6 text-center pt-6 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {t('auth.hasAccount')}{' '}
                            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                {t('auth.signIn')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
