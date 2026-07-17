import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Loader2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { isFirebaseConfigured } from '../lib/firebase';

export function LoginPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const { signIn } = useAuth();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isFirebaseConfigured) {
            showToast(t('loginPage.firebaseNotConfigured'), 'error');
            return;
        }

        setLoading(true);

        try {
            await signIn(email, password);
            showToast(t('auth.success'), 'success');
            navigate('/');
        } catch (err: any) {
            console.error('Login error:', err);
            let message = err.message || t('auth.error');
            if (message.includes('invalid-credential') || message.includes('wrong-password') || message.includes('user-not-found')) {
                message = t('loginPage.invalidCredentials');
            } else if (message.includes('too-many-requests')) {
                message = t('loginPage.tooManyAttempts');
            } else if (message.includes('network-request-failed')) {
                message = t('loginPage.connectionFailed');
            }
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center p-6 bg-slate-50 dark:bg-[#020617] relative">
            <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-xl shadow-lg overflow-hidden border border-slate-200/80 dark:border-slate-800/80">

                <div className="hidden lg:flex flex-col justify-between p-10 bg-slate-900 border-r border-slate-800 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent pointer-events-none" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6">
                            <Sparkles className="w-3.5 h-3.5" /> {t('auth.secureAccess')}
                        </div>
                        <h1 className="text-3xl font-semibold text-white leading-tight mb-4">
                            {t('auth.welcomePro')}
                        </h1>
                        <p className="text-slate-400 text-sm font-normal leading-relaxed max-w-sm">
                            {t('auth.loginDesc')}
                        </p>
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center text-emerald-400">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-white font-medium text-sm">{t('auth.encryption')}</p>
                                <p className="text-slate-500 text-xs">{t('auth.privacyPriority')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8 lg:p-10 flex flex-col justify-center">
                    <div className="mb-8">
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1.5">{t('auth.loginTitle')}</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-normal">{t('auth.loginSubtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    {t('auth.email')}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@company.com"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                    {t('auth.password')}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none transition-all text-sm font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                            {loading ? t('auth.verifying') : t('auth.submit')}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            {t('auth.noAccount')}{' '}
                            <Link to="/signup" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                                {t('auth.signUp')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
